// Standalone Agent Draft validator entry.
//
// This file is a thin shell for the shared, framework-neutral validation core
// (src/project/validateDraftCore.ts). scripts/build-standalone-validator.mjs
// bundles it with esbuild into skill/scripts/validate-agent-draft.mjs, so the
// shipped skill ships its own zero-runtime-dependency validator that mirrors
// the in-app rules exactly — no project source tree required on the consumer
// side. Component metadata is read from validation-meta.json next to the
// bundle, which scripts/generate-skill.mjs emits from the same TS definitions.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentInputSchema } from '../src/project/schema';
import { validateAgentDraftCore } from '../src/project/validateDraftCore';

const jsonPath = (parts = []) => `$${parts.map((part) => (
  typeof part === 'number' ? `[${part}]` : /^[A-Za-z_$][\w$]*$/.test(part) ? `.${part}` : `[${JSON.stringify(part)}]`
)).join('')}`;

const diagnostic = ({ code, message, path }) => ({
  code,
  message,
  path: jsonPath(path),
});

const fail = (errors, warnings = []) => {
  process.stdout.write(`${JSON.stringify({ valid: false, errors, warnings }, null, 2)}\n`);
  process.exitCode = 1;
};

const here = dirname(fileURLToPath(import.meta.url));
const metaSource = (() => {
  const { components } = JSON.parse(readFileSync(join(here, 'validation-meta.json'), 'utf8'));
  const byId = new Map(components.map((component) => [component.id, component]));
  return { get: (id) => byId.get(id) };
})();

if (process.argv.length !== 4) {
  fail([{ code: 'usage', message: 'Usage: node validate-agent-draft.mjs <draft.json> <agent-input.json>', path: '$' }]);
} else {
  const [draftPath, inputPath] = process.argv.slice(2);
  let draft;
  let input;
  try {
    draft = JSON.parse(readFileSync(resolve(draftPath), 'utf8'));
  } catch (error) {
    fail([{ code: 'invalid_json', message: `Cannot read draft JSON: ${error instanceof Error ? error.message : String(error)}`, path: '$' }]);
  }
  if (process.exitCode !== 1) {
    try {
      input = JSON.parse(readFileSync(resolve(inputPath), 'utf8'));
    } catch (error) {
      fail([{ code: 'invalid_json', message: `Cannot read Agent Input JSON: ${error instanceof Error ? error.message : String(error)}`, path: '$' }]);
    }
  }

  if (process.exitCode !== 1) {
    const parsedInput = AgentInputSchema.safeParse(input);
    if (!parsedInput.success) {
      fail(parsedInput.error.issues.map((issue) => diagnostic({
        code: 'invalid_agent_input',
        message: issue.message,
        path: issue.path,
      })));
    } else {
      const result = validateAgentDraftCore(draft, parsedInput.data, metaSource);
      const output = {
        valid: result.valid,
        errors: result.errors.map(diagnostic),
        warnings: result.warnings.map(diagnostic),
      };
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
      if (!result.valid) process.exitCode = 1;
    }
  }
}
