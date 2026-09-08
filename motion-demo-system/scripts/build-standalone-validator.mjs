// Bundles the shared draft-validation core (src/project/validateDraftCore.ts)
// plus the standalone shell (scripts/standalone-validate-entry.mjs) into
// skill/scripts/validate-agent-draft.mjs.
//
// The generated file has no runtime dependency on the project: esbuild inlines
// zod and the schema modules, and component metadata is read at runtime from
// validation-meta.json (emitted by scripts/generate-skill.mjs) in the same
// directory. Consumers only need Node.js.
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptRoot, '..');
const outfile = join(projectRoot, 'skill', 'scripts', 'validate-agent-draft.mjs');

mkdirSync(dirname(outfile), { recursive: true });
const result = await build({
  entryPoints: [join(scriptRoot, 'standalone-validate-entry.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile,
  logLevel: 'warning',
  sourcemap: false,
});

if (result.errors.length > 0) {
  process.stdout.write(`${JSON.stringify(result.errors, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Built ${outfile}\n`);
}
