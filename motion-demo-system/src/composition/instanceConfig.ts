import { effectRegistry } from '../effects/registry';
import type { EffectPropDefinition } from '../effects/types';
import type { MotionEffectInstance } from '../project/types';
import type { ConfigState } from '../remotion/config';

export type InstanceConfigSource = 'agent' | 'formal-project';

const toConfigValue = (
  definition: EffectPropDefinition,
  value: unknown,
): number | string | undefined => {
  if (definition.type === 'number') {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }
  if (definition.type === 'list') {
    if (Array.isArray(value)) return JSON.stringify(value);
    return typeof value === 'string' ? value : undefined;
  }
  return typeof value === 'string' ? value : undefined;
};

export function toInstanceConfig(
  effect: MotionEffectInstance,
  options: { source?: InstanceConfigSource } = {},
): ConfigState {
  const definition = effectRegistry.get(effect.componentId);
  const source = options.source ?? 'agent';
  const config = Object.fromEntries(
    Object.entries(definition.props).map(([key, prop]) => [key, prop.default]),
  ) as ConfigState;

  for (const [key, value] of Object.entries(effect.props)) {
    const prop = definition.props[key];
    if (!prop || (source === 'agent' && !prop.agentEditable)) continue;
    const normalized = toConfigValue(prop, value);
    if (normalized !== undefined) config[key] = normalized;
  }

  if (definition.props.posX) config.posX = effect.transform.x;
  if (definition.props.posY) config.posY = effect.transform.y;
  if (definition.props.scale) config.scale = effect.transform.scale * 100;

  return config;
}
