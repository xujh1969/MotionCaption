import { CONFIGS } from '../remotion/config';
import { fxDefinitions } from './definitions/fx';
import { t1Definitions } from './definitions/t1';
import { t2Definitions } from './definitions/t2';
import { t3Definitions } from './definitions/t3';
import { t4Definitions } from './definitions/t4';
import { t5Definitions } from './definitions/t5';
import { t6Definitions } from './definitions/t6';
import { t7Definitions } from './definitions/t7';
import { legacyPropIsAgentEditable } from './legacyAdapter';
import type { EffectDefinition } from './types';

export interface EffectRegistry {
  get(id: string): EffectDefinition;
  list(): EffectDefinition[];
}

export function createEffectRegistry(
  definitions: EffectDefinition[],
  configuredIds?: string[],
): EffectRegistry {
  const byId = new Map<string, EffectDefinition>();

  for (const definition of definitions) {
    if (byId.has(definition.id)) throw new Error(`Duplicate effect ID: ${definition.id}`);
    if (typeof definition.component !== 'function') {
      throw new Error(`Missing component: ${definition.id}`);
    }
    for (const [key, prop] of Object.entries(definition.props)) {
      if (prop.default === undefined) throw new Error(`Missing default value: ${definition.id}.${key}`);
      if (prop.agentEditable && (prop.role !== 'content' || !legacyPropIsAgentEditable(prop.legacy))) {
        throw new Error(`Agent-editable non-content prop: ${definition.id}.${key}`);
      }
      if (prop.agentEditable && prop.type === 'list') {
        const fields = new Map((prop.legacy.listFields ?? []).map((field) => [field.key, field]));
        if (!prop.agentEditableItemFields?.length) {
          throw new Error(`Missing Agent list-item contract: ${definition.id}.${key}`);
        }
        for (const fieldKey of prop.agentEditableItemFields) {
          const field = fields.get(fieldKey);
          if (!field || field.kind === 'color' || fieldKey === 'at' || fieldKey === 'hl') {
            throw new Error(`Unsafe Agent list-item field: ${definition.id}.${key}.${fieldKey}`);
          }
        }
      }
    }
    const { width, height } = definition.layout.footprint;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error(`Invalid footprint: ${definition.id}`);
    }
    byId.set(definition.id, definition);
  }

  if (configuredIds) {
    const definitionIds = new Set(byId.keys());
    const configurationIds = new Set(configuredIds);
    const orphan = configuredIds.find((id) => !definitionIds.has(id));
    if (orphan) throw new Error(`Orphan configuration: ${orphan}`);
    const unknown = definitions.find(({ id }) => !configurationIds.has(id));
    if (unknown) throw new Error(`Missing configuration: ${unknown.id}`);
  }

  return {
    get(id) {
      const definition = byId.get(id);
      if (!definition) throw new Error(`Unknown effect definition: ${id}`);
      return definition;
    },
    list() {
      return [...byId.values()];
    },
  };
}

export const effectRegistry = createEffectRegistry(
  [
    ...fxDefinitions,
    ...t1Definitions,
    ...t2Definitions,
    ...t3Definitions,
    ...t4Definitions,
    ...t5Definitions,
    ...t6Definitions,
    ...t7Definitions,
  ],
  Object.keys(CONFIGS),
);
