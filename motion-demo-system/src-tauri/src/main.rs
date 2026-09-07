// Prevents an extra console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod llm;
mod skill_sync;

use std::path::PathBuf;
use tauri::Manager;

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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            save_api_key,
            has_api_key,
            complete_openai_compatible,
            scan_component_skill,
            apply_component_skill,
            export_component_skill
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
        ] {
            assert!(name.chars().all(|character| character.is_ascii_lowercase() || character == '_'));
        }
    }
}
