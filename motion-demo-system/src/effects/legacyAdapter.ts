import type { ConfigState, PropDef } from '../remotion/config';
import { CANVAS } from '../remotion/theme';
import type {
  ComponentDef,
  EffectDefinition,
  EffectPropDefinition,
  PropRole,
  SelectionDraft,
} from './types';

/**
 * 承载「数据」而非「外观」的数字键——这些必须由 AI 依据字幕填写，
 * 否则组件永远显示内置默认数字（如 t7-09 环心数字恒为 100）。
 * 字号/间距/半径等纯外观数字键不在此列。
 */
export const METRIC_NUMBER_KEYS = new Set([
  'value', 'valueL', 'valueR', 'percent', 'centerNum',
]);

// Conservative declared envelope for deterministic planning; this is not a measured DOM bound.
const declaredPlanningFootprint = (defaults: ConfigState): { width: number; height: number } => {
  const x = typeof defaults.posX === 'number' ? defaults.posX : 0;
  const y = typeof defaults.posY === 'number' ? defaults.posY : 0;
  return {
    width: Math.max(1, Math.min(CANVAS.width / 2, CANVAS.width - x)),
    height: Math.max(1, Math.min(CANVAS.height / 2, CANVAS.height - y)),
  };
};

export const legacyPropRole = (definition: PropDef): PropRole => {
  if (definition.kind === 'text' || definition.kind === 'list') return 'content';
  if (definition.key === 'posX' || definition.key === 'posY' || definition.key === 'scale') {
    return 'layout';
  }
  return 'style';
};

export const legacyPropIsAgentEditable = (definition: PropDef): boolean => {
  if (definition.kind === 'number') return METRIC_NUMBER_KEYS.has(definition.key);
  if (legacyPropRole(definition) !== 'content') return false;
  if (definition.kind !== 'list') return true;
  if (definition.agentEditableItemFields?.length) return true;
  // at 是可选的渲染层时机契约字段（AI 可填、可省略），不影响列表属性本身的 AI 可编辑性
  return !definition.listFields?.some(
    ({ key, kind }) => kind === 'color' || key === 'hl',
  );
};

export function adaptLegacyComponent(
  component: ComponentDef,
  propDefinitions: PropDef[],
  defaults: ConfigState,
): EffectDefinition {
  const props = Object.fromEntries(
    propDefinitions.map((definition): [string, EffectPropDefinition] => [
      definition.key,
      {
        type: definition.kind,
        label: definition.label,
        default: defaults[definition.key],
        required: true,
        role: legacyPropRole(definition),
        agentEditable: false,
        agentEditableItemFields: definition.kind === 'list'
          ? definition.agentEditableItemFields
            ?? definition.listFields?.map(({ key }) => key).filter((key) => key !== 'at')
          : undefined,
        min: definition.min,
        max: definition.max,
        legacy: { ...definition },
      },
    ]),
  );

  return {
    ...component,
    version: 1,
    legacyProps: propDefinitions.map((definition) => ({ ...definition })),
    selection: {
      summary: component.name,
      suitableFor: [],
      avoidFor: [],
      semanticFamilies: [],
    },
    props,
    layout: {
      roles: [],
      preferredZones: ['auto'],
      footprint: declaredPlanningFootprint(defaults),
      exclusive: false,
    },
  };
}

export function applySelectionDraft(
  definition: EffectDefinition,
  draft: SelectionDraft,
): EffectDefinition {
  const { contentRoles = {}, ...selection } = draft;
  const props = Object.fromEntries(
    Object.entries(definition.props).map(([key, prop]) => {
      const semanticRole = contentRoles[key];
      return [
        key,
        semanticRole
          ? { ...prop, role: 'content' as const, agentEditable: true, semanticRole }
          : prop,
      ];
    }),
  );

  return {
    ...definition,
    selection,
    props,
    layout: {
      ...definition.layout,
      roles: [...selection.semanticFamilies],
    },
  };
}

export function adaptLegacyCatalog(
  catalog: ComponentDef[],
  configs: Record<string, PropDef[]>,
  resolveDefaults: (id: string) => ConfigState,
): EffectDefinition[] {
  const catalogIds = new Set(catalog.map(({ id }) => id));
  const orphan = Object.keys(configs).find((id) => !catalogIds.has(id));
  if (orphan) throw new Error(`Orphan configuration: ${orphan}`);

  return catalog.map((component) => {
    const definitions = configs[component.id];
    if (!definitions) throw new Error(`Missing configuration: ${component.id}`);
    return adaptLegacyComponent(component, definitions, resolveDefaults(component.id));
  });
}

export function toLegacyPropDefs(definition: EffectDefinition): PropDef[] {
  return definition.legacyProps;
}
