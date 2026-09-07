import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const defaultProjectRoot = resolve(scriptRoot, '..');
const componentReferencePrefix = 'skill/references/components/';

const compareText = (left, right) => left.localeCompare(right, 'en');
const sortedEntries = (record) => Object.entries(record).sort(([left], [right]) => compareText(left, right));

const sortJson = (value) => {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(sortedEntries(value).map(([key, child]) => [key, sortJson(child)]));
};

const json = (value, indent = 0) => JSON.stringify(sortJson(value), null, indent);

const parseDefault = (prop) => {
  if (prop.type !== 'list' || typeof prop.default !== 'string') return prop.default;
  try {
    const parsed = JSON.parse(prop.default);
    if (!Array.isArray(parsed)) return prop.default;
    const editable = new Set(prop.agentEditableItemFields ?? []);
    return parsed.map((item) => Object.fromEntries(
      sortedEntries(item).filter(([key]) => editable.has(key)),
    ));
  } catch {
    return prop.default;
  }
};

const approvedDefinitions = (definitions) => definitions
  .filter(({ selection }) => selection.suitableFor.length > 0 && selection.avoidFor.length > 0)
  .sort((left, right) => compareText(left.category, right.category) || compareText(left.id, right.id));

const capacityText = ({ minItems, maxItems }) => {
  if (minItems === undefined && maxItems === undefined) return 'scalar';
  if (minItems === maxItems) return `${minItems} items exactly`;
  if (minItems === undefined) return `up to ${maxItems} items`;
  if (maxItems === undefined) return `at least ${minItems} items`;
  return `${minItems}-${maxItems} items`;
};

const fieldType = (prop) => {
  if (prop.type !== 'list') return prop.type === 'color' ? 'string' : prop.type;
  const editable = new Set(prop.agentEditableItemFields ?? []);
  const fields = (prop.legacy.listFields ?? [])
    .filter(({ key }) => editable.has(key))
    .map(({ key }) => `${key}: string`)
    .sort(compareText)
    .join(', ');
  return `array of objects { ${fields} }`;
};

const fieldConstraints = (prop, selection) => {
  const constraints = [];
  if (prop.type === 'number') {
    if (prop.min !== undefined) constraints.push(`minimum ${prop.min}`);
    if (prop.max !== undefined) constraints.push(`maximum ${prop.max}`);
  }
  if (prop.type === 'list') {
    constraints.push(capacityText(selection));
    if (prop.legacy.listFields?.length) constraints.push('all listed item fields are required strings');
  }
  return constraints.length ? constraints.join('; ') : 'none beyond the declared type';
};

const contentDefinition = (definition) => Object.fromEntries(
  sortedEntries(definition.props)
    .filter(([, prop]) => prop.agentEditable)
    .map(([key, prop]) => [key, {
      default: parseDefault(prop),
      required: prop.required,
      role: prop.role,
      semanticRole: prop.semanticRole,
      type: prop.type,
      constraints: fieldConstraints(prop, definition.selection),
      ...(prop.type === 'number' && prop.max !== undefined ? { max: prop.max } : {}),
      ...(prop.type === 'number' && prop.min !== undefined ? { min: prop.min } : {}),
      ...(prop.type === 'list' ? {
        ...(definition.selection.maxItems === undefined ? {} : { maxItems: definition.selection.maxItems }),
        ...(definition.selection.minItems === undefined ? {} : { minItems: definition.selection.minItems }),
        itemFields: (prop.legacy.listFields ?? [])
          .filter(({ key }) => prop.agentEditableItemFields?.includes(key))
          .map(({ key }) => ({ key, required: true, type: 'string' }))
          .sort((left, right) => compareText(left.key, right.key)),
      } : {}),
    }]),
);

const componentExample = (definition) => ({
  componentId: definition.id,
  componentVersion: definition.version,
  content: Object.fromEntries(
    sortedEntries(definition.props)
      .filter(([, prop]) => prop.agentEditable)
      .map(([key, prop]) => [key, parseDefault(prop)]),
  ),
  placementPreset: definition.layout.preferredZones[0] ?? 'auto',
  role: definition.selection.semanticFamilies[0] ?? 'body',
});

const renderRootSkill = (definitions) => {
  const groups = new Map();
  for (const definition of definitions) {
    const group = groups.get(definition.category) ?? [];
    group.push(definition);
    groups.set(definition.category, group);
  }
  const sections = [...groups].sort(([left], [right]) => compareText(left, right)).map(([category, items]) => {
    const rows = items.map((definition) => {
      return `| ${definition.id} | ${definition.selection.summary} | ${definition.selection.suitableFor.join(' ')} | ${definition.selection.avoidFor.join(' ')} | [reference](references/components/${definition.id}.md) |`;
    });
    return `## ${category}\n\n| ID | Summary | Use for | Avoid | Details |\n| --- | --- | --- | --- | --- |\n${rows.join('\n')}`;
  });

  return `---
name: motion-caption-components
description: Select existing MotionCaption motion components and produce validated captionforge.agent-draft JSON from subtitle cues. Use for component selection and orchestration, not for creating component code or changing visual styles.
---

# MotionCaption Component Orchestration

Use this skill to select registered components and produce a strict Agent Draft from a supplied Agent Input.

## Workflow

1. Read [the project schema](references/project-schema.md) and [composition guidelines](references/composition-guidelines.md).
2. Choose component IDs from the index below using the request and source cues.
3. Read only the references for the selected IDs; do not load unrelated component references.
4. Populate every required \`content\` field from the source cues. Never supply visual style or layout property fields.
5. Save strict JSON and run \`node scripts/validate-agent-draft.mjs <draft.json> <agent-input.json>\`. Return the draft only when it exits 0.

${sections.join('\n\n')}
`;
};

const renderComponentReference = (definition) => {
  const fields = sortedEntries(contentDefinition(definition)).map(([key, prop]) => (
    `- \`${key}\`: ${fieldType(definition.props[key])}; required: ${prop.required ? 'yes' : 'no'}; default: \`${json(prop.default)}\`; semantic role: ${prop.semanticRole}; constraints: ${prop.constraints}.`
  ));
  return `# ${definition.id} - ${definition.selection.summary}

- Component version: ${definition.version}
- Use for: ${definition.selection.suitableFor.join(' ')}
- Avoid: ${definition.selection.avoidFor.join(' ')}
- Capacity: ${capacityText(definition.selection)}

## Editable content

Only the following keys may appear in \`content\`. All style and component layout properties are locked and must not be supplied by an Agent.

${fields.length ? fields.join('\n') : '- No Agent-editable content fields.'}

## Component JSON

This is legal JSON for the component object. Replace content values only with claims grounded in the selected source cues.

\`\`\`json
${json(componentExample(definition), 2)}
\`\`\`
`;
};

const projectSchemaExample = {
  kind: 'captionforge.agent-draft',
  schemaVersion: 1,
  componentLibraryVersion: 1,
  scenes: [{
    sceneId: 'scene-1',
    sourceCueIds: ['cue-1'],
    components: [],
  }],
};

const renderProjectSchema = (agentDraftSchema) => {
  const parsed = agentDraftSchema.safeParse(projectSchemaExample);
  if (!parsed.success) throw new Error('AgentDraftSchema rejected the generated project-schema example.');
  return `# Agent Draft JSON Schema

Produce one strict JSON object. Unknown fields are rejected.

- Root: \`kind\` is exactly \`captionforge.agent-draft\`; \`schemaVersion\` and \`componentLibraryVersion\` are exactly \`1\`; \`scenes\` is an array.
- Scene: exactly \`sceneId: string\`, \`sourceCueIds: non-empty string[]\`, and \`components: array\`.
- Component: exactly \`componentId: string\`, \`componentVersion: number\`, \`role: string\`, \`content: object\`, and optional \`placementPreset\`.
- Placement preset, when present: \`auto\`, \`left-top\`, \`left-center\`, \`left-bottom\`, \`right-top\`, \`right-center\`, \`right-bottom\`, or \`full-width\`.
- Component-specific required fields, versions, list capacities, and locked fields are enforced after structural schema parsing.

## Minimal valid JSON

\`\`\`json
${json(parsed.data, 2)}
\`\`\`
`;
};

const renderCompositionGuidelines = () => `# Composition Guidelines

- Use only component IDs listed in the root index, then read the selected component references.
- Every scene must cite one or more existing cue IDs in chronological order. Use those cues as the only source for text, numbers, units, list items, and claims.
- Populate all required editable content fields. Never put style, color, typography, coordinates, scale, or other locked component properties in \`content\`.
- Keep a scene to at most two visual subjects when possible. Duplicate semantic roles and declared footprint collisions produce warnings.
- Do not overlap a component declared exclusive with another component.
- Respect each component's exact version and list capacity. Use arrays of objects for list content, never stringified JSON.
- Validate the completed files with \`node scripts/validate-agent-draft.mjs <draft.json> <agent-input.json>\`; errors block import, while warnings are advisory.
`;

const manifestComponent = (definition) => ({
  avoidFor: definition.selection.avoidFor,
  category: definition.category,
  componentVersion: definition.version,
  content: contentDefinition(definition),
  id: definition.id,
  name: definition.name,
  planning: {
    exclusive: definition.layout.exclusive,
    footprint: definition.layout.footprint,
    preferredZones: definition.layout.preferredZones,
    roles: definition.layout.roles,
  },
  referencePath: `references/components/${definition.id}.md`,
  selectionSummary: definition.selection.summary,
  semanticFamilies: definition.selection.semanticFamilies,
  suitableFor: definition.selection.suitableFor,
  ...(definition.selection.minItems === undefined && definition.selection.maxItems === undefined ? {} : {
    capacity: {
      ...(definition.selection.maxItems === undefined ? {} : { maxItems: definition.selection.maxItems }),
      ...(definition.selection.minItems === undefined ? {} : { minItems: definition.selection.minItems }),
    },
  }),
});

export function generateSkillArtifacts(definitions, agentDraftSchema) {
  const approved = approvedDefinitions(definitions);
  const paths = new Map();
  paths.set('skill/SKILL.md', renderRootSkill(approved));
  paths.set('skill/references/composition-guidelines.md', renderCompositionGuidelines());
  paths.set('skill/references/project-schema.md', renderProjectSchema(agentDraftSchema));
  for (const definition of approved) {
    paths.set(`${componentReferencePrefix}${definition.id}.md`, renderComponentReference(definition));
  }
  paths.set('src/agent/generated/componentManifest.json', `${json({
    components: approved.map(manifestComponent),
    libraryVersion: 1,
  }, 2)}\n`);
  return new Map([...paths].sort(([left], [right]) => compareText(left, right)));
}

const idForPath = (path) => path.startsWith(componentReferencePrefix)
  ? path.slice(componentReferencePrefix.length, -'.md'.length)
  : path;

export function compareSkillArtifacts(artifacts, projectRoot = defaultProjectRoot) {
  const missing = [];
  const stale = [];
  for (const [path, expected] of artifacts) {
    const absolute = join(projectRoot, path);
    if (!existsSync(absolute)) missing.push(idForPath(path));
    else if (readFileSync(absolute, 'utf8') !== expected) stale.push(idForPath(path));
  }

  const componentDir = join(projectRoot, componentReferencePrefix);
  const expectedReferences = new Set(
    [...artifacts.keys()].filter((path) => path.startsWith(componentReferencePrefix)).map((path) => idForPath(path)),
  );
  const orphan = existsSync(componentDir)
    ? readdirSync(componentDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name.slice(0, -'.md'.length))
      .filter((id) => !expectedReferences.has(id))
      .sort(compareText)
    : [];
  return { missing: missing.sort(compareText), stale: stale.sort(compareText), orphan };
}

export function writeSkillArtifacts(artifacts, projectRoot = defaultProjectRoot) {
  const componentDir = join(projectRoot, componentReferencePrefix);
  const expectedReferences = new Set(
    [...artifacts.keys()].filter((path) => path.startsWith(componentReferencePrefix)).map((path) => idForPath(path)),
  );
  if (existsSync(componentDir)) {
    for (const entry of readdirSync(componentDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md') && !expectedReferences.has(entry.name.slice(0, -3))) {
        unlinkSync(join(componentDir, entry.name));
      }
    }
  }
  for (const [path, content] of artifacts) {
    const absolute = join(projectRoot, path);
    mkdirSync(dirname(absolute), { recursive: true });
    if (!existsSync(absolute) || readFileSync(absolute, 'utf8') !== content) writeFileSync(absolute, content);
  }
}

export async function loadGenerationSources(projectRoot = defaultProjectRoot) {
  const { createServer } = await import('vite');
  const server = await createServer({ root: projectRoot, appType: 'custom', server: { middlewareMode: true } });
  try {
    const [{ effectRegistry }, { AgentDraftSchema }] = await Promise.all([
      server.ssrLoadModule('/src/effects/registry.ts'),
      server.ssrLoadModule('/src/project/schema.ts'),
    ]);
    return { definitions: effectRegistry.list(), agentDraftSchema: AgentDraftSchema };
  } finally {
    await server.close();
  }
}

export async function generateSkill(projectRoot = defaultProjectRoot) {
  const { definitions, agentDraftSchema } = await loadGenerationSources(projectRoot);
  const artifacts = generateSkillArtifacts(definitions, agentDraftSchema);
  writeSkillArtifacts(artifacts, projectRoot);
  return artifacts;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) {
  const artifacts = await generateSkill();
  const references = [...artifacts.keys()].filter((path) => path.startsWith(componentReferencePrefix)).length;
  process.stdout.write(`Generated ${references} component references and ${artifacts.size} artifacts.\n`);
}
