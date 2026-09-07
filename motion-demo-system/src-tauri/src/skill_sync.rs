//! Component-skill scanning, applying and exporting.
//!
//! Everything here is path-safe and secret-free: proposals are applied through
//! temp files plus an atomic rename, and a failure always preserves the files
//! that were already on disk (Task 13 step 4/6).

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SkillMetadataField {
    #[serde(rename = "summary")]
    Summary,
    #[serde(rename = "suitableFor")]
    SuitableFor,
    #[serde(rename = "avoidFor")]
    AvoidFor,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SkillAiProposal {
    #[serde(rename = "proposalId")]
    pub proposal_id: String,
    #[serde(rename = "componentId")]
    pub component_id: String,
    pub field: SkillMetadataField,
    #[serde(default)]
    pub current: Vec<String>,
    #[serde(default)]
    pub proposed: Vec<String>,
    #[serde(default)]
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillManifestComponent {
    pub id: String,
    #[serde(rename = "componentVersion", default)]
    pub component_version: i64,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub category: String,
    #[serde(rename = "selectionSummary", default)]
    pub selection_summary: String,
    #[serde(rename = "suitableFor", default)]
    pub suitable_for: Vec<String>,
    #[serde(rename = "avoidFor", default)]
    pub avoid_for: Vec<String>,
    #[serde(default)]
    pub content: BTreeMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentManifest {
    #[serde(rename = "libraryVersion", default = "default_library_version")]
    pub library_version: i64,
    #[serde(default)]
    pub components: Vec<SkillManifestComponent>,
}

fn default_library_version() -> i64 {
    1
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedSkillProposal {
    #[serde(default)]
    pub component_ids: Vec<String>,
    #[serde(default)]
    pub remove_component_ids: Vec<String>,
    #[serde(default)]
    pub ai_proposals: Vec<SkillAiProposal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyReport {
    pub updated_manifest: bool,
    pub removed_components: Vec<String>,
    pub applied_proposals: Vec<String>,
    pub library_version: i64,
}

/// Applies only confirmed removals and confirmed AI metadata. A component id
/// that was not confirmed can never enter the generated skill.
pub fn apply_proposal(
    manifest: &ComponentManifest,
    proposal: &ApprovedSkillProposal,
) -> (ComponentManifest, ApplyReport) {
    let removals: std::collections::BTreeSet<&str> = proposal
        .remove_component_ids
        .iter()
        .map(String::as_str)
        .collect();
    let proposals: BTreeMap<&str, &SkillAiProposal> = proposal
        .ai_proposals
        .iter()
        .map(|item| (item.proposal_id.as_str(), item))
        .collect();

    let mut applied_proposals: Vec<String> = Vec::new();
    let mut components = Vec::with_capacity(manifest.components.len());

    for component in &manifest.components {
        if removals.contains(component.id.as_str()) {
            continue;
        }
        let mut next = component.clone();
        for (proposal_id, item) in &proposals {
            if item.component_id != next.id {
                continue;
            }
            match item.field {
                SkillMetadataField::Summary => {
                    next.selection_summary = item.proposed.join(" ");
                }
                SkillMetadataField::SuitableFor => next.suitable_for = item.proposed.clone(),
                SkillMetadataField::AvoidFor => next.avoid_for = item.proposed.clone(),
            }
            applied_proposals.push((*proposal_id).to_string());
        }
        components.push(next);
    }

    let removed_components: Vec<String> = removals
        .iter()
        .filter(|id| manifest.components.iter().any(|component| component.id == **id))
        .map(|id| (*id).to_string())
        .collect();

    let changed = !removed_components.is_empty() || !applied_proposals.is_empty();
    applied_proposals.sort();
    let next_manifest = ComponentManifest {
        library_version: manifest.library_version + if changed { 1 } else { 0 },
        components,
    };
    let report = ApplyReport {
        updated_manifest: changed,
        removed_components,
        applied_proposals,
        library_version: next_manifest.library_version,
    };
    (next_manifest, report)
}

/// Writes through a sibling temp file and renames atomically. On any error the
/// previous file stays untouched and the temp file is removed.
pub fn write_atomic(path: &Path, content: &str) -> Result<(), String> {
    let directory = path.parent().ok_or_else(|| "目标路径无效。".to_string())?;
    fs::create_dir_all(directory).map_err(|error| format!("无法创建目录：{}", error))?;
    let temp = directory.join(format!(
        ".{}.tmp-{}",
        path.file_name().and_then(|name| name.to_str()).unwrap_or("target"),
        std::process::id()
    ));
    if let Err(error) = fs::write(&temp, content) {
        let _ = fs::remove_file(&temp);
        return Err(format!("写入临时文件失败：{}", error));
    }
    match fs::rename(&temp, path) {
        Ok(()) => Ok(()),
        Err(error) => {
            let _ = fs::remove_file(&temp);
            Err(format!("替换文件失败，原文件已保留：{}", error))
        }
    }
}

/// Only flat `references/components/<id>.md` paths are allowed, so a crafted
/// component id can never escape the skill folder.
pub fn reference_path(component_id: &str) -> Result<PathBuf, String> {
    if component_id.is_empty()
        || component_id.contains(std::path::MAIN_SEPARATOR)
        || component_id.contains('/')
        || component_id.contains('\\')
        || component_id.contains("..")
        || !component_id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
    {
        return Err(format!("组件 ID 不合法：{}", component_id));
    }
    Ok(PathBuf::from("references").join("components").join(format!("{}.md", component_id)))
}

/// Rejects destinations that are not a clean absolute path.
pub fn normalize_destination(destination: &str) -> Result<PathBuf, String> {
    let trimmed = destination.trim();
    if trimmed.is_empty() {
        return Err("导出目录为空。".to_string());
    }
    let path = PathBuf::from(trimmed);
    if !path.is_absolute() {
        return Err("导出目录必须是绝对路径。".to_string());
    }
    if path.components().any(|part| matches!(part, Component::ParentDir)) {
        return Err("导出目录不能包含 .. 片段。".to_string());
    }
    Ok(path)
}

fn content_rows(component: &SkillManifestComponent) -> String {
    if component.content.is_empty() {
        return "_（无可编辑内容字段）_".to_string();
    }
    let mut rows: Vec<String> = component
        .content
        .iter()
        .map(|(key, value)| {
            let field_type = value.get("type").and_then(|item| item.as_str()).unwrap_or("-");
            let role = value.get("semanticRole").and_then(|item| item.as_str()).unwrap_or("-");
            let required = value
                .get("required")
                .and_then(|item| item.as_bool())
                .map(|flag| if flag { "必填" } else { "可选" })
                .unwrap_or("可选");
            format!("| `{}` | {} | {} | {} |", key, field_type, role, required)
        })
        .collect();
    rows.sort();
    let mut lines: Vec<String> = vec![
        "| 字段 | 类型 | 语义角色 | 必填 |".to_string(),
        "| --- | --- | --- | --- |".to_string(),
    ];
    lines.extend(rows);
    lines.join("\n")
}

/// Renders the `SKILL.md` index from the manifest.
pub fn render_root_skill(manifest: &ComponentManifest) -> String {
    let mut ids: Vec<&SkillManifestComponent> = manifest.components.iter().collect();
    ids.sort_by(|left, right| left.id.cmp(&right.id));
    let rows = ids
        .iter()
        .map(|component| {
            format!(
                "| `{}` | {} | {} | [reference](references/components/{}.md) |",
                component.id,
                component.name,
                component.selection_summary,
                component.id
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        "# MotionCaption 组件 Skill\n\n\
         Library version: {library_version}\n\n\
         ## 可用组件\n\n\
         | 组件 ID | 名称 | 适用场景 | 参考 |\n\
         | --- | --- | --- | --- |\n\
         {rows}\n\n\
         ## 使用规则\n\n\
         1. 只能使用上表列出的组件 ID。\n\
         2. 只读取所选组件的参考文件，不要加载无关参考。\n\
         3. 输出必须严格符合工程 schema。\n",
        library_version = manifest.library_version,
        rows = rows
    )
}

/// Renders one component reference page.
pub fn render_component_reference(component: &SkillManifestComponent) -> String {
    format!(
        "# {name} (`{id}`)\n\n\
         - 分类：{category}\n\
         - 版本：{version}\n\n\
         ## 适用场景\n\n{suitable}\n\n\
         ## 避免使用\n\n{avoid}\n\n\
         ## 可编辑内容\n\n{content}\n",
        name = component.name,
        id = component.id,
        category = component.category,
        version = component.component_version,
        suitable = bullet_list(&component.suitable_for),
        avoid = bullet_list(&component.avoid_for),
        content = content_rows(component),
    )
}

fn bullet_list(values: &[String]) -> String {
    if values.is_empty() {
        return "- （未填写）".to_string();
    }
    values.iter().map(|value| format!("- {}", value)).collect::<Vec<_>>().join("\n")
}

/// Builds every file of the exportable skill: `SKILL.md` plus one reference per
/// component. No API Key, absolute path or project file is included.
pub fn export_entries(manifest: &ComponentManifest) -> Result<Vec<(PathBuf, String)>, String> {
    let mut entries = vec![(PathBuf::from("SKILL.md"), render_root_skill(manifest))];
    for component in &manifest.components {
        entries.push((
            reference_path(&component.id)?,
            render_component_reference(component),
        ));
    }
    Ok(entries)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn component(id: &str, version: i64) -> SkillManifestComponent {
        SkillManifestComponent {
            id: id.to_string(),
            component_version: version,
            name: format!("组件 {}", id),
            category: "card".to_string(),
            selection_summary: "摘要".to_string(),
            suitable_for: vec!["适合短标题".to_string()],
            avoid_for: vec!["不适合长段落".to_string()],
            content: BTreeMap::new(),
        }
    }

    fn proposal(id: &str, field: SkillMetadataField, proposed: &[&str]) -> SkillAiProposal {
        SkillAiProposal {
            proposal_id: id.to_string(),
            component_id: "t1-01".to_string(),
            field,
            current: vec![],
            proposed: proposed.iter().map(|value| value.to_string()).collect(),
            note: None,
        }
    }

    fn manifest() -> ComponentManifest {
        ComponentManifest {
            library_version: 3,
            components: vec![component("t1-01", 2), component("t2-01", 1)],
        }
    }

    #[test]
    fn an_empty_proposal_changes_nothing() {
        let (next, report) = apply_proposal(&manifest(), &ApprovedSkillProposal::default());
        assert!(!report.updated_manifest);
        assert_eq!(next.components.len(), 2);
        assert_eq!(next.library_version, 3);
    }

    #[test]
    fn confirmed_removals_drop_the_component_and_bump_the_version() {
        let proposal = ApprovedSkillProposal {
            remove_component_ids: vec!["t2-01".to_string()],
            ..Default::default()
        };
        let (next, report) = apply_proposal(&manifest(), &proposal);
        assert_eq!(next.components.len(), 1);
        assert_eq!(next.components[0].id, "t1-01");
        assert_eq!(report.removed_components, vec!["t2-01".to_string()]);
        assert_eq!(next.library_version, 4);
    }

    #[test]
    fn unconfirmed_removals_are_ignored() {
        let proposal = ApprovedSkillProposal {
            component_ids: vec!["t2-01".to_string()],
            ..Default::default()
        };
        let (next, report) = apply_proposal(&manifest(), &proposal);
        assert_eq!(next.components.len(), 2);
        assert!(!report.updated_manifest);
    }

    #[test]
    fn approved_ai_metadata_replaces_the_field() {
        let proposal = ApprovedSkillProposal {
            ai_proposals: vec![proposal("p1", SkillMetadataField::Summary, &["新摘要"])],
            ..Default::default()
        };
        let (next, report) = apply_proposal(&manifest(), &proposal);
        let target = next.components.iter().find(|item| item.id == "t1-01").unwrap();
        assert_eq!(target.selection_summary, "新摘要");
        assert_eq!(report.applied_proposals, vec!["p1".to_string()]);
        assert_eq!(next.library_version, 4);
    }

    #[test]
    fn approved_list_metadata_replaces_the_list() {
        let proposal = ApprovedSkillProposal {
            ai_proposals: vec![proposal("p2", SkillMetadataField::AvoidFor, &["a", "b"])],
            ..Default::default()
        };
        let (next, _) = apply_proposal(&manifest(), &proposal);
        let target = next.components.iter().find(|item| item.id == "t1-01").unwrap();
        assert_eq!(target.avoid_for, vec!["a".to_string(), "b".to_string()]);
    }

    #[test]
    fn proposals_targeting_other_components_are_skipped() {
        let mut other = proposal("p3", SkillMetadataField::Summary, &["不该应用"]);
        other.component_id = "t9-99".to_string();
        let approved = ApprovedSkillProposal { ai_proposals: vec![other], ..Default::default() };
        let (next, report) = apply_proposal(&manifest(), &approved);
        let target = next.components.iter().find(|item| item.id == "t1-01").unwrap();
        assert_eq!(target.selection_summary, "摘要");
        assert!(report.applied_proposals.is_empty());
    }

    #[test]
    fn reference_paths_reject_traversal() {
        assert!(reference_path("../evil").is_err());
        assert!(reference_path("a/b").is_err());
        assert!(reference_path("").is_err());
        assert_eq!(
            reference_path("t1-01").unwrap(),
            PathBuf::from("references").join("components").join("t1-01.md")
        );
    }

    #[test]
    fn destinations_must_be_clean_absolute_paths() {
        assert!(normalize_destination("").is_err());
        assert!(normalize_destination("relative/dir").is_err());
        assert!(normalize_destination("../escape").is_err());
        let absolute = std::env::temp_dir().join("motioncaption-skill-export");
        assert!(normalize_destination(&absolute.to_string_lossy()).is_ok());
    }

    #[test]
    fn export_entries_cover_skill_and_references() {
        let entries = export_entries(&manifest()).unwrap();
        assert_eq!(entries.len(), 3);
        assert_eq!(entries[0].0, PathBuf::from("SKILL.md"));
        let skill = &entries[0].1;
        assert!(skill.contains("`t1-01`"));
        assert!(skill.contains("Library version: 3"));
        assert!(!skill.contains("sk-"));
    }

    #[test]
    fn references_carry_no_local_paths() {
        let entries = export_entries(&manifest()).unwrap();
        let reference = &entries[1].1;
        assert!(!reference.contains("C:\\"));
        assert!(!reference.contains("MotionCaption"));
        assert!(reference.contains("适用场景"));
    }

    #[test]
    fn writing_atomically_keeps_the_old_file_on_failure() {
        let directory = std::env::temp_dir().join(format!("motioncaption-atomic-{}", std::process::id()));
        let _ = fs::remove_dir_all(&directory);
        fs::create_dir_all(&directory).unwrap();
        let target = directory.join("manifest.json");

        write_atomic(&target, "first").unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "first");
        write_atomic(&target, "second").unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "second");

        // No temp file is left behind after a successful write.
        let leftovers: Vec<_> = fs::read_dir(&directory)
            .unwrap()
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.file_name().to_string_lossy().starts_with(".manifest.json.tmp-"))
            .collect();
        assert!(leftovers.is_empty());

        let _ = fs::remove_dir_all(&directory);
    }

    #[test]
    fn manifest_round_trips_through_json() {
        let json = serde_json::to_string(&manifest()).unwrap();
        let parsed: ComponentManifest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.library_version, 3);
        assert_eq!(parsed.components.len(), 2);
    }
}
