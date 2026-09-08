import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareSkillArtifacts,
  generateSkillArtifacts,
  loadGenerationSources,
} from './generate-skill.mjs';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const { definitions, agentDraftSchema, metaList } = await loadGenerationSources(projectRoot);
const result = compareSkillArtifacts(generateSkillArtifacts(definitions, agentDraftSchema, metaList), projectRoot);
const ok = result.missing.length === 0 && result.stale.length === 0 && result.orphan.length === 0;

process.stdout.write(`${JSON.stringify({ ok, ...result }, null, 2)}\n`);
if (!ok) process.exitCode = 1;
