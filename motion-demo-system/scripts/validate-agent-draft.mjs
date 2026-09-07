import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

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

if (process.argv.length !== 4) {
  fail([{ code: 'usage', message: 'Usage: node scripts/validate-agent-draft.mjs <draft.json> <agent-input.json>', path: '$' }]);
} else {
  const [draftPath, inputPath] = process.argv.slice(2);
  let draft;
  let input;
  try {
    draft = JSON.parse(await readFile(resolve(draftPath), 'utf8'));
  } catch (error) {
    fail([{ code: 'invalid_json', message: `Cannot read draft JSON: ${error instanceof Error ? error.message : String(error)}`, path: '$' }]);
  }
  if (process.exitCode !== 1) {
    try {
      input = JSON.parse(await readFile(resolve(inputPath), 'utf8'));
    } catch (error) {
      fail([{ code: 'invalid_json', message: `Cannot read Agent Input JSON: ${error instanceof Error ? error.message : String(error)}`, path: '$' }]);
    }
  }

  if (process.exitCode !== 1) {
    const server = await createServer({ root: projectRoot, appType: 'custom', server: { middlewareMode: true } });
    try {
      const [{ AgentInputSchema }, { validateAgentDraft }] = await Promise.all([
        server.ssrLoadModule('/src/project/schema.ts'),
        server.ssrLoadModule('/src/project/validateDraft.ts'),
      ]);
      const parsedInput = AgentInputSchema.safeParse(input);
      if (!parsedInput.success) {
        fail(parsedInput.error.issues.map((issue) => diagnostic({
          code: 'invalid_agent_input',
          message: issue.message,
          path: issue.path,
        })));
      } else {
        const result = validateAgentDraft(draft, parsedInput.data);
        const output = {
          valid: result.valid,
          errors: result.errors.map(diagnostic),
          warnings: result.warnings.map(diagnostic),
        };
        process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
        if (!result.valid) process.exitCode = 1;
      }
    } finally {
      await server.close();
    }
  }
}
