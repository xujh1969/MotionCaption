import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareSkillArtifacts,
  generateSkillArtifacts,
  loadGenerationSources,
} from './generate-skill.mjs';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const { definitions, agentDraftSchema, metaList } = await loadGenerationSources(projectRoot);
const result = compareSkillArtifacts(generateSkillArtifacts(definitions, agentDraftSchema, metaList), projectRoot);

/**
 * 打包完整性守卫：`skill/` 下的每个顶层条目都必须出现在 `src-tauri/tauri.conf.json` 的
 * `bundle.resources` 里，否则 `tauri build` 产出的安装包会静默丢文件（历史缺陷：漏过 `scripts/`，
 * 导致安装后的 Skill 缺 build-agent-input.mjs / validate-agent-draft.mjs / validation-meta.json）。
 */
const unpackaged = (() => {
  const config = JSON.parse(readFileSync(join(projectRoot, 'src-tauri', 'tauri.conf.json'), 'utf8'));
  const resources = (config.bundle?.resources ?? []).map((entry) => String(entry).replace(/\\/g, '/'));
  return readdirSync(join(projectRoot, 'skill'))
    .filter((entry) => !resources.some((resource) => resource.endsWith(`/skill/${entry}`)))
    .sort();
})();

const ok = result.missing.length === 0
  && result.stale.length === 0
  && result.orphan.length === 0
  && unpackaged.length === 0;

process.stdout.write(`${JSON.stringify({ ok, ...result, unpackaged }, null, 2)}\n`);
if (!ok) process.exitCode = 1;
