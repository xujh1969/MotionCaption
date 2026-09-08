import type {
  EffectDefinition,
  PlacementPreset,
  SemanticRole,
} from '../effects/types';

/**
 * Framework-neutral snapshot of everything draft validation needs from an
 * effect definition. Deliberately excludes the React component, legacy
 * property-panel descriptors and marketing text so the snapshot is plain JSON
 * and the shared validation core stays free of rendering imports.
 *
 * This is the single adaptor shared by three consumers:
 * - the in-app pipeline (src/project/validateDraft.ts thin wrapper);
 * - the standalone skill validator built by scripts/build-standalone-validator.mjs
 *   (meta serialised to skill/scripts/validation-meta.json);
 * - tests that assert the standalone artifact matches the in-app rules.
 */
export interface ComponentMetaProp {
  type: 'text' | 'number' | 'color' | 'list';
  required: boolean;
  agentEditable: boolean;
  default: unknown;
  semanticRole?: SemanticRole;
  agentEditableItemFields?: string[];
  min?: number;
  max?: number;
  /** Keys of every legacy list item field (editable and locked). */
  listFieldsKeys?: string[];
}

export interface ComponentMetaSelection {
  minItems?: number;
  maxItems?: number;
}

export interface ComponentMeta {
  id: string;
  version: number;
  props: Record<string, ComponentMetaProp>;
  selection: ComponentMetaSelection;
  layout: {
    preferredZones: PlacementPreset[];
    footprint: { width: number; height: number };
    exclusive: boolean;
  };
}

export interface ComponentMetaSource {
  get(id: string): ComponentMeta | undefined;
}

export const toComponentMeta = (definition: EffectDefinition): ComponentMeta => {
  const props: Record<string, ComponentMetaProp> = {};
  for (const [key, prop] of Object.entries(definition.props)) {
    const metaProp: ComponentMetaProp = {
      type: prop.type,
      required: prop.required,
      agentEditable: prop.agentEditable,
      default: prop.default,
    };
    if (prop.semanticRole !== undefined) metaProp.semanticRole = prop.semanticRole;
    if (prop.agentEditableItemFields !== undefined) {
      metaProp.agentEditableItemFields = prop.agentEditableItemFields;
    }
    if (prop.min !== undefined) metaProp.min = prop.min;
    if (prop.max !== undefined) metaProp.max = prop.max;
    if (prop.legacy.listFields?.length) {
      metaProp.listFieldsKeys = prop.legacy.listFields.map((field) => field.key);
    }
    props[key] = metaProp;
  }
  const selection: ComponentMetaSelection = {};
  if (definition.selection.minItems !== undefined) selection.minItems = definition.selection.minItems;
  if (definition.selection.maxItems !== undefined) selection.maxItems = definition.selection.maxItems;
  return {
    id: definition.id,
    version: definition.version,
    props,
    selection,
    layout: {
      preferredZones: definition.layout.preferredZones,
      footprint: definition.layout.footprint,
      exclusive: definition.layout.exclusive,
    },
  };
};

export const createComponentMetaSource = (
  definitions: readonly EffectDefinition[],
): ComponentMetaSource => {
  const byId = new Map(
    definitions.map((definition) => [definition.id, toComponentMeta(definition)]),
  );
  return { get: (id) => byId.get(id) };
};
