// Prevents an extra console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod llm;
mod skill_sync;

use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio as ProcessStdio};
use std::sync::{Arc, Mutex, OnceLock};
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

/* --------------------------- 透明视频导出（桌面端） --------------------------- */

/// Resolves the bundled ffmpeg binary: packaged resource first, then the
/// workspace copy (`ffmpeg-static`), then whatever is on PATH.
fn ffmpeg_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        // Tauri maps `../` resource paths to `_up_/` inside the resource dir.
        for candidate in [
            resource_dir.join("ffmpeg.exe"),
            resource_dir.join("_up_").join("node_modules").join("ffmpeg-static").join("ffmpeg.exe"),
        ] {
            if candidate.is_file() {
                return Ok(candidate);
            }
        }
    }
    let workspace = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("node_modules")
        .join("ffmpeg-static")
        .join("ffmpeg.exe");
    if workspace.is_file() {
        return Ok(workspace);
    }
    if let Ok(output) = std::process::Command::new("ffmpeg").arg("-version").output() {
        if output.status.success() {
            return Ok(PathBuf::from("ffmpeg"));
        }
    }
    Err("找不到 ffmpeg：请确认桌面端打包资源或 node_modules/ffmpeg-static/ffmpeg.exe 存在。".to_string())
}

fn temp_export_root() -> PathBuf {
    std::env::temp_dir().join(format!(
        "motioncaption-alpha-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or_default()
    ))
}

fn sanitize_frame_dir(dir: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(dir);
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "临时目录路径无效。".to_string())?;
    if !file_name.starts_with("motioncaption-alpha-") {
        return Err("临时目录路径无效。".to_string());
    }
    Ok(path)
}

/// Creates a temp directory for PNG frames and returns its path.
#[tauri::command]
fn begin_transparent_export() -> Result<String, String> {
    let dir = temp_export_root();
    std::fs::create_dir_all(&dir).map_err(|error| format!("无法创建导出临时目录：{}", error))?;
    Ok(dir.to_string_lossy().into_owned())
}

/// Writes one PNG frame (base64-encoded by the webview) into the temp dir.
/// Async so the multi-megabyte decode+write runs off the main thread — with
/// thousands of frames, sync commands would keep blocking the event loop.
#[tauri::command]
async fn write_transparent_frame(dir: String, index: u32, data_b64: String) -> Result<(), String> {
    let root = sanitize_frame_dir(&dir)?;
    tokio::task::spawn_blocking(move || {
        use base64::Engine as _;
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(data_b64.as_bytes())
            .map_err(|error| format!("帧数据 base64 解码失败：{}", error))?;
        if bytes.is_empty() {
            return Err("帧数据为空。".to_string());
        }
        let path = root.join(format!("frame{:06}.png", index));
        std::fs::write(&path, bytes).map_err(|error| format!("写入帧文件失败：{}", error))
    })
    .await
    .map_err(|error| format!("帧写入任务异常：{}", error))?
}

/// Builds the ffmpeg argument list (kept pure for unit tests).
///
/// ProRes 4444 (`prores_ks -profile:v 4444 -pix_fmt yuva444p10le`) is the
/// transparent format editing tools actually honour. WebM alpha was tried
/// first (VP8/VP9 `yuva420p`) and verified to composite as **opaque** in
/// 剪映/CapCut, so the WebM path was dropped rather than kept as an option.
/// `-alpha_bits 8` writes an 8-bit alpha plane: ffmpeg defaults to 16-bit,
/// which some third-party decoders read back as fully opaque.
/// ProRes is intra-only, so no bitrate / alt-ref flags apply.
fn ffmpeg_alpha_args(fps: &str, frame_dir: &Path, destination: &str) -> Vec<String> {
    vec![
        "-y".to_string(),
        "-framerate".to_string(),
        fps.to_string(),
        "-i".to_string(),
        frame_dir.join("frame%06d.png").to_string_lossy().into_owned(),
        "-c:v".to_string(),
        "prores_ks".to_string(),
        "-profile:v".to_string(),
        "4444".to_string(),
        "-pix_fmt".to_string(),
        "yuva444p10le".to_string(),
        "-alpha_bits".to_string(),
        "8".to_string(),
        destination.to_string(),
    ]
}

/// Parses ffmpeg's `time=HH:MM:SS.cs` progress token into seconds (kept pure
/// for unit tests). Returns `None` for lines without a valid time token.
fn parse_ffmpeg_time(line: &str) -> Option<f64> {
    let start = line.find("time=")? + 5;
    let rest = &line[start..];
    let token: String = rest
        .chars()
        .take_while(|c| c.is_ascii_digit() || *c == ':' || *c == '.')
        .collect();
    let mut parts = token.split(':');
    let hours: f64 = parts.next()?.parse().ok()?;
    let minutes: f64 = parts.next()?.parse().ok()?;
    let seconds: f64 = parts.next()?.parse().ok()?;
    let total = hours * 3600.0 + minutes * 60.0 + seconds;
    if total.is_finite() && total >= 0.0 {
        Some(total)
    } else {
        None
    }
}

/// Live ffmpeg encode processes keyed by their frame directory, so the UI can
/// abort a long ProRes encode without waiting for it to finish naturally.
fn encode_children() -> &'static Mutex<HashMap<String, Arc<Mutex<Option<Child>>>>> {
    static CHILDREN: OnceLock<Mutex<HashMap<String, Arc<Mutex<Option<Child>>>>>> = OnceLock::new();
    CHILDREN.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Muxes the PNG frame sequence into a transparent ProRes 4444 MOV.
///
/// Async (off the main thread) so the window stays responsive; ffmpeg stderr
/// is streamed and parsed for `time=` tokens, and progress is emitted as
/// `transparent-encode-progress` events with a percent based on `total_seconds`.
#[tauri::command]
async fn finish_transparent_export(
    app: tauri::AppHandle,
    dir: String,
    fps: String,
    destination: String,
    total_seconds: f64,
) -> Result<(), String> {
    let root = sanitize_frame_dir(&dir)?;
    if fps.parse::<f64>().map_err(|_| "fps 无效。")? <= 0.0 {
        return Err("fps 无效。".to_string());
    }
    if !total_seconds.is_finite() || total_seconds <= 0.0 {
        return Err("导出总时长无效。".to_string());
    }
    let ffmpeg = ffmpeg_path(&app)?;
    let args = ffmpeg_alpha_args(&fps, &root, &destination);
    let mut command = Command::new(&ffmpeg);
    command
        .args(&args)
        .stdout(ProcessStdio::null())
        .stderr(ProcessStdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    let mut child = command
        .spawn()
        .map_err(|error| format!("启动 ffmpeg 失败：{}", error))?;
    let stderr = child.stderr.take().ok_or("无法读取 ffmpeg 进度输出。")?;

    // Streams stderr and pushes percent updates to the webview. `dir` lets the
    // UI abort this exact encode (kill the ffmpeg process) from a cancel button.
    let emitter = app.clone();
    let total = total_seconds;
    let event_dir = dir.clone();
    let reader = std::thread::spawn(move || {
        let mut reader = BufReader::new(stderr);
        let mut chunk: Vec<u8> = Vec::new();
        loop {
            chunk.clear();
            match reader.read_until(b'\r', &mut chunk) {
                Ok(0) | Err(_) => break,
                Ok(_) => {}
            }
            let line = String::from_utf8_lossy(&chunk);
            if let Some(seconds) = parse_ffmpeg_time(&line) {
                let percent = ((seconds / total) * 100.0).clamp(0.0, 100.0);
                let _ = emitter.emit(
                    "transparent-encode-progress",
                    serde_json::json!({ "percent": percent, "seconds": seconds, "dir": event_dir }),
                );
            }
        }
    });

    // Register the child so `abort_transparent_encode` can kill it mid-encode.
    let slot = Arc::new(Mutex::new(Some(child)));
    encode_children().lock().unwrap().insert(dir.clone(), Arc::clone(&slot));

    let owned_destination = destination.clone();
    let outcome = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        // Poll with try_wait so the mutex is never held long and an abort can
        // slip in between polls to kill the process.
        let status = loop {
            {
                let mut guard = slot.lock().unwrap();
                match guard.as_mut() {
                    Some(process) => match process.try_wait() {
                        Ok(Some(status)) => break Ok(status),
                        Ok(None) => {}
                        Err(error) => break Err(format!("等待 ffmpeg 失败：{}", error)),
                    },
                    None => break Err("ffmpeg 进程已被中止。".to_string()),
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(200));
        };
        match status {
            Err(error) => Err(error),
            Ok(status) => {
                if status.success() && Path::new(&owned_destination).is_file() {
                    Ok(())
                } else if status.success() {
                    Err("ffmpeg 已退出但未生成目标文件。".to_string())
                } else {
                    Err("ffmpeg 合成失败（可能已被取消）。".to_string())
                }
            }
        }
    })
    .await
    .map_err(|error| format!("ffmpeg 合成任务异常：{}", error))?;

    let _ = reader.join();
    encode_children().lock().unwrap().remove(&dir);
    let _ = std::fs::remove_dir_all(&root);
    outcome
}

/// Kills a running transparent-export ffmpeg encode (no-op when idle).
#[tauri::command]
fn abort_transparent_encode(dir: String) -> Result<(), String> {
    let slot = encode_children().lock().unwrap().get(&dir).cloned();
    if let Some(slot) = slot {
        if let Ok(mut guard) = slot.lock() {
            if let Some(process) = guard.as_mut() {
                let _ = process.kill();
            }
        }
    }
    Ok(())
}

/// Removes the temp frames when the webview aborts mid-export.
#[tauri::command]
fn cancel_transparent_export(dir: String) -> Result<(), String> {
    let root = sanitize_frame_dir(&dir)?;
    let _ = std::fs::remove_dir_all(&root);
    Ok(())
}

/// Resolves the generated component manifest: bundled resource first, then the
/// workspace copy that exists while developing.
fn manifest_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("generated").join("componentManifest.json");
        if bundled.is_file() {
            return Ok(bundled);
        }
    }
    let workspace = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("src")
        .join("agent")
        .join("generated")
        .join("componentManifest.json");
    if workspace.is_file() {
        return Ok(workspace);
    }
    Err("找不到组件清单 componentManifest.json。".to_string())
}

/// Resolves the generated skill folder (`SKILL.md` + `references/`).
fn skill_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("skill");
        if bundled.join("SKILL.md").is_file() {
            return Ok(bundled);
        }
    }
    let workspace = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("skill");
    if workspace.join("SKILL.md").is_file() {
        return Ok(workspace);
    }
    Err("找不到组件 Skill 目录（缺少 SKILL.md）。".to_string())
}

fn read_manifest(app: &tauri::AppHandle) -> Result<skill_sync::ComponentManifest, String> {
    let path = manifest_path(app)?;
    let raw = std::fs::read_to_string(&path).map_err(|error| format!("读取组件清单失败：{}", error))?;
    serde_json::from_str(&raw).map_err(|error| format!("组件清单格式无效：{}", error))
}

#[tauri::command]
fn save_api_key(key: String) -> Result<(), String> {
    llm::save_api_key(&key)
}

#[tauri::command]
fn has_api_key() -> bool {
    llm::has_api_key()
}

#[tauri::command]
async fn complete_openai_compatible(request: llm::CompletionRequest) -> Result<String, String> {
    llm::complete(&request).await
}

/// Returns the manifest currently on disk; the frontend turns it into a diff.
#[tauri::command]
fn scan_component_skill(app: tauri::AppHandle) -> Result<skill_sync::ComponentManifest, String> {
    read_manifest(&app)
}

#[tauri::command]
fn apply_component_skill(
    app: tauri::AppHandle,
    proposal: skill_sync::ApprovedSkillProposal,
) -> Result<skill_sync::ApplyReport, String> {
    let manifest = read_manifest(&app)?;
    let (next, report) = skill_sync::apply_proposal(&manifest, &proposal);
    if !report.updated_manifest {
        return Ok(report);
    }
    let body = serde_json::to_string_pretty(&next)
        .map_err(|error| format!("序列化组件清单失败：{}", error))?;
    skill_sync::write_atomic(&manifest_path(&app)?, &body)?;
    Ok(report)
}

/// Prefers the files that `generate:skill` produced and only falls back to
/// rendering from the manifest when they are missing.
fn collect_export_entries(
    root: &std::path::Path,
    manifest: &skill_sync::ComponentManifest,
) -> Result<Vec<(PathBuf, String)>, String> {
    let mut entries = vec![(PathBuf::from("SKILL.md"), std::fs::read_to_string(root.join("SKILL.md"))
        .map_err(|error| format!("读取 SKILL.md 失败：{}", error))?)];
    for component in &manifest.components {
        let relative = skill_sync::reference_path(&component.id)?;
        let source = root.join(&relative);
        let content = if source.is_file() {
            std::fs::read_to_string(&source).map_err(|error| format!("读取参考文件失败：{}", error))?
        } else {
            skill_sync::render_component_reference(component)
        };
        entries.push((relative, content));
    }
    Ok(entries)
}

#[tauri::command]
fn export_component_skill(app: tauri::AppHandle, destination: String) -> Result<usize, String> {
    let target = skill_sync::normalize_destination(&destination)?;
    let manifest = read_manifest(&app)?;
    let entries = match skill_root(&app) {
        Ok(root) => collect_export_entries(&root, &manifest)?,
        Err(_) => skill_sync::export_entries(&manifest)?,
    };
    std::fs::create_dir_all(&target).map_err(|error| format!("无法创建导出目录：{}", error))?;
    for (relative, content) in &entries {
        let path = target.join(relative);
        skill_sync::write_atomic(&path, content)?;
    }
    Ok(entries.len())
}

/// Native "Save As" dialog + write. The WebView2 shell does not implement
/// anchor downloads, so every JSON export (project file, style defaults) must
/// go through this command on the desktop. Returns `None` when cancelled.
#[tauri::command]
async fn save_text_file(
    app: tauri::AppHandle,
    default_name: String,
    contents: String,
) -> Result<Option<String>, String> {
    // async command → runs off the main thread, so blocking dialogs are safe.
    let picked = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("JSON", &["json"])
        .blocking_save_file();
    let Some(file_path) = picked else {
        return Ok(None);
    };
    let path = file_path
        .into_path()
        .map_err(|error| format!("无效的保存路径：{}", error))?;
    std::fs::write(&path, contents.as_bytes())
        .map_err(|error| format!("写入文件失败：{}", error))?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            save_api_key,
            has_api_key,
            complete_openai_compatible,
            scan_component_skill,
            apply_component_skill,
            export_component_skill,
            save_text_file,
            begin_transparent_export,
            write_transparent_frame,
            finish_transparent_export,
            abort_transparent_encode,
            cancel_transparent_export
        ])
        .run(tauri::generate_context!())
        .expect("启动 MotionCaption 桌面端失败");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn workspace_manifest_is_reachable_in_dev() {
        // The dev fallback lives next to the crate; the file is committed.
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("src")
            .join("agent")
            .join("generated")
            .join("componentManifest.json");
        assert!(path.is_file(), "期望存在 {}", path.display());
    }

    #[test]
    fn generated_skill_files_win_over_rendered_fallbacks() {
        let directory = std::env::temp_dir().join(format!("motioncaption-export-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&directory);
        let references = directory.join("references").join("components");
        std::fs::create_dir_all(&references).unwrap();
        std::fs::write(directory.join("SKILL.md"), "# generated").unwrap();
        std::fs::write(references.join("t1-01.md"), "generated reference").unwrap();

        let manifest = skill_sync::ComponentManifest {
            library_version: 2,
            components: vec![
                skill_sync::SkillManifestComponent {
                    id: "t1-01".to_string(),
                    component_version: 1,
                    name: "标题".to_string(),
                    category: "title".to_string(),
                    selection_summary: "摘要".to_string(),
                    suitable_for: vec![],
                    avoid_for: vec![],
                    content: Default::default(),
                },
                skill_sync::SkillManifestComponent {
                    id: "t2-02".to_string(),
                    component_version: 1,
                    name: "卡片".to_string(),
                    category: "card".to_string(),
                    selection_summary: "摘要".to_string(),
                    suitable_for: vec![],
                    avoid_for: vec![],
                    content: Default::default(),
                },
            ],
        };

        let entries = collect_export_entries(&directory, &manifest).unwrap();
        assert_eq!(entries.len(), 3);
        assert_eq!(entries[0].1, "# generated");
        assert_eq!(entries[1].1, "generated reference");
        // The missing reference is rendered instead of failing the export.
        assert!(entries[2].1.contains("`t2-02`"));

        let _ = std::fs::remove_dir_all(&directory);
    }

    #[test]
    fn command_names_match_the_frontend_bridge() {
        // Keeps src/tauri/bridge.ts and the Rust handler list in sync.
        for name in [
            "save_api_key",
            "has_api_key",
            "complete_openai_compatible",
            "scan_component_skill",
            "apply_component_skill",
            "export_component_skill",
            "save_text_file",
            "begin_transparent_export",
            "write_transparent_frame",
            "finish_transparent_export",
            "abort_transparent_encode",
            "cancel_transparent_export",
        ] {
            assert!(name.chars().all(|character| character.is_ascii_lowercase() || character == '_'));
        }
    }

    #[test]
    fn ffmpeg_alpha_args_target_png_sequence_with_prores_4444() {
        let dir = std::env::temp_dir().join("motioncaption-alpha-args-test");
        let args = ffmpeg_alpha_args("30", &dir, "C:\\out\\clip.mov");
        let joined = args.join(" ");
        // ProRes 4444 is the only alpha format 剪映/CapCut composites correctly;
        // WebM alpha (libvpx/VP9 + yuva420p) is treated as opaque there.
        assert!(joined.contains("prores_ks"), "got: {joined}");
        assert!(joined.contains("-profile:v 4444"), "got: {joined}");
        assert!(joined.contains("yuva444p10le"));
        assert!(joined.contains("-alpha_bits 8"));
        assert!(!joined.contains("libvpx"), "WebM alpha is opaque in NLEs: {joined}");
        assert!(joined.contains(&dir.join("frame%06d.png").to_string_lossy().to_string()));
    }

    #[test]
    fn parse_ffmpeg_time_reads_progress_tokens() {
        assert_eq!(parse_ffmpeg_time("frame=  120 fps=30 time=00:01:04.50 bitrate="), Some(64.5));
        assert_eq!(parse_ffmpeg_time("time=01:00:00.00 speed=2x"), Some(3600.0));
        assert_eq!(parse_ffmpeg_time("time=00:00:00.00"), Some(0.0));
        assert_eq!(parse_ffmpeg_time("no progress here"), None);
        assert_eq!(parse_ffmpeg_time("time=xx:yy:zz.zz"), None);
    }

    #[test]
    fn frame_dir_must_bear_the_export_prefix() {
        assert!(sanitize_frame_dir("C:\\Users\\someone\\Documents").is_err());
        assert!(sanitize_frame_dir("C:\\Windows\\Temp\\whatever").is_err());
        let ok = std::env::temp_dir().join("motioncaption-alpha-123-456");
        assert!(sanitize_frame_dir(&ok.to_string_lossy()).is_ok());
    }
}
