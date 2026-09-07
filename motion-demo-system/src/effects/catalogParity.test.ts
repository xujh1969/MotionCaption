import { describe, expect, it } from 'vitest';
import { CATALOG } from '../remotion/catalog';
import * as config from '../remotion/config';
import type { ConfigState } from '../remotion/config';

const CONFIGS = config.CONFIGS;
const DEFAULTS = (config as typeof config & {
  DEFAULTS?: Record<string, ConfigState>;
}).DEFAULTS;

// The frozen baseline has no scale-exempt centered components. Add IDs here only
// when a component's existing centered layout intentionally does not support scale.
const CENTERED_COMPONENT_IDS = new Set<string>();

describe('frozen component catalog parity', () => {
  const catalogIds = CATALOG.map(({ id }) => id);

  it('exports the frozen default configuration map', () => {
    expect(DEFAULTS).toBeDefined();
  });

  it('contains unique catalog IDs', () => {
    expect(new Set(catalogIds).size).toBe(catalogIds.length);
  });

  it('gives every catalog component CONFIGS and DEFAULTS entries', () => {
    const missingConfigs = catalogIds.filter((id) => !CONFIGS[id]);
    const missingDefaults = catalogIds.filter((id) => !DEFAULTS?.[id]);

    expect(missingConfigs, `Missing CONFIGS: ${missingConfigs.join(', ')}`).toEqual([]);
    expect(missingDefaults, `Missing DEFAULTS: ${missingDefaults.join(', ')}`).toEqual([]);
  });

  it('contains no CONFIGS or DEFAULTS orphan IDs', () => {
    const catalogIdSet = new Set(catalogIds);
    const configOrphans = Object.keys(CONFIGS).filter((id) => !catalogIdSet.has(id));
    const defaultOrphans = Object.keys(DEFAULTS ?? {}).filter((id) => !catalogIdSet.has(id));

    expect(configOrphans, `Orphan CONFIGS: ${configOrphans.join(', ')}`).toEqual([]);
    expect(defaultOrphans, `Orphan DEFAULTS: ${defaultOrphans.join(', ')}`).toEqual([]);
  });

  it('exposes position controls and the applicable scale control for every component', () => {
    const missingPositionControls = catalogIds.filter((id) => {
      const keys = new Set((CONFIGS[id] ?? []).map((definition) => definition.key));
      return !keys.has('posX') || !keys.has('posY');
    });
    const missingScaleControls = catalogIds.filter((id) => {
      const keys = new Set((CONFIGS[id] ?? []).map((definition) => definition.key));
      return !CENTERED_COMPONENT_IDS.has(id) && !keys.has('scale');
    });

    expect(missingPositionControls, `Missing posX/posY: ${missingPositionControls.join(', ')}`).toEqual([]);
    expect(missingScaleControls, `Missing scale: ${missingScaleControls.join(', ')}`).toEqual([]);
  });

  it('keeps applicable position and scale controls in every default configuration', () => {
    const missingDefaultControls = catalogIds.flatMap((id) => {
      const configKeys = new Set((CONFIGS[id] ?? []).map((definition) => definition.key));
      const requiredKeys = ['posX', 'posY', 'scale'].filter((key) =>
        configKeys.has(key) && (key !== 'scale' || !CENTERED_COMPONENT_IDS.has(id)),
      );
      const defaults = DEFAULTS?.[id] ?? {};

      return requiredKeys
        .filter((key) => !Object.prototype.hasOwnProperty.call(defaults, key))
        .map((key) => `${id}.${key}`);
    });

    expect(missingDefaultControls, `Missing DEFAULTS controls: ${missingDefaultControls.join(', ')}`).toEqual([]);
  });
});
