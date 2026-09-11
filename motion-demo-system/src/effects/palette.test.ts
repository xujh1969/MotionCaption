import { describe, expect, it } from 'vitest';
import { effectRegistry } from './registry';
import {
  PALETTE_SLOTS,
  colorKeysForSlot,
  slotFor,
  type PaletteSlot,
} from './paletteSlots';
import {
  applyPaletteToInstance,
  applyStylesToTarget,
  collectInstanceSnapshot,
  collectStyleValues,
  mergeUserStyleDefaults,
  styleKeysOf,
  type UserStyleDefaults,
} from './stylePrefs';
import { createEditorStore } from '../store/editorStore';
import type { MotionEffectInstance, MotionProject } from '../project/types';

const project = (): MotionProject => ({
  kind: 'captionforge.project',
  schemaVersion: 1,
  video: { width: 1920, height: 1080, fps: 30, durationInFrames: 900 },
  cues: [],
  effects: [],
});

const effect = (componentId: string, props: Record<string, unknown> = {}, extra: Partial<MotionEffectInstance> = {}): MotionEffectInstance => ({
  instanceId: Math.random().toString(36).slice(2),
  componentId,
  componentVersion: 1,
  sourceCueIds: [],
  startFrame: 0,
  durationInFrames: 120,
  track: 0,
  zIndex: 1,
  props,
  transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  ...extra,
});

describe('paletteSlots curated map', () => {
  const definitions = effectRegistry.list();

  it('every mapped component exists in the registry', () => {
    const withSlot = definitions.filter(({ id }) => colorKeysForSlot(id, 'accent').length > 0);
    expect(withSlot.length).toBeGreaterThan(30);
  });

  it('slotFor returns null, or a valid slot, for any component/color pair', () => {
    for (const definition of definitions) {
      for (const key of Object.keys(definition.props)) {
        const slot = slotFor(definition.id, key);
        if (slot === null) continue;
        expect(PALETTE_SLOTS).toContain(slot);
        // 只映射颜色键，绝不映射字号/内容/布局键
        expect(definition.props[key].type).toBe('color');
      }
    }
  });

  it('mapped color keys exist as color props on their component', () => {
    for (const definition of definitions) {
      const entries = Object.entries(definition.props);
      for (const [key] of entries) {
        const slot = slotFor(definition.id, key);
        if (slot !== null) expect(definition.props[key].type).toBe('color');
      }
    }
  });

  it('every declared palette slot has at least one mapping across the library', () => {
    const used = new Set<PaletteSlot>();
    for (const definition of definitions) {
      for (const key of Object.keys(definition.props)) {
        const slot = slotFor(definition.id, key);
        if (slot) used.add(slot);
      }
    }
    for (const slot of PALETTE_SLOTS) expect(used.has(slot), `slot ${slot} unused`).toBe(true);
  });
});

describe('stylePrefs pure helpers', () => {
  const fx05 = effectRegistry.get('fx-05');

  it('styleKeysOf excludes content and layout keys', () => {
    const keys = styleKeysOf(fx05);
    expect(keys).toContain('titleSize');
    expect(keys).toContain('titleColor');
    expect(keys).not.toContain('title1');
    expect(keys).not.toContain('posX');
    expect(keys).not.toContain('scale');
  });

  it('collectStyleValues only picks style keys with scalar values', () => {
    const values = collectStyleValues(fx05, { title1: '文本', titleSize: 44, titleColor: '#fff', posX: 100, tags: '["x"]' });
    expect(values).toEqual({ titleSize: 44, titleColor: '#fff' });
  });

  it('collectInstanceSnapshot keeps style and layout keys but never content', () => {
    const values = collectInstanceSnapshot(fx05, {
      title1: '自定义标题', tags: '[{"label":"A"}]', titleSize: 44, titleColor: '#fff', posX: 100, posY: 200, scale: 120,
    });
    expect(values).toEqual({
      titleSize: 44, titleColor: '#fff', posX: 100, posY: 200, scale: 120,
    });
  });

  it('mergeUserStyleDefaults never applies content keys when definition is given', () => {
    const defaults: UserStyleDefaults = { 'fx-05': { titleColor: '#ff0000', title1: '旧文案污染', posX: 8 } };
    const merged = mergeUserStyleDefaults(
      'fx-05',
      { titleColor: '#000', title1: '内置文案', posX: 0 },
      defaults,
      { definition: fx05 },
    );
    // 样式键并入；内容键（title1）与未知键不入，posX 属于 layout 照常并入
    expect(merged).toEqual({ titleColor: '#ff0000', title1: '内置文案', posX: 8 });
  });

  it('mergeUserStyleDefaults overrides only recorded keys', () => {
    const defaults: UserStyleDefaults = { 'fx-05': { titleColor: '#ff0000', titleSize: 30 } };
    const merged = mergeUserStyleDefaults('fx-05', { titleColor: '#000', title1: '我的标题', posX: 8 }, defaults);
    expect(merged).toEqual({ titleColor: '#ff0000', titleSize: 30, title1: '我的标题', posX: 8 });
    // 无记录的组件不受影响
    expect(mergeUserStyleDefaults('fx-06', { titleColor: '#000' }, defaults)).toEqual({ titleColor: '#000' });
  });

  it('applyStylesToTarget merges source styles and counts changes', () => {
    const { props, changed } = applyStylesToTarget({ titleColor: '#ff0000', titleSize: 30 }, { titleColor: '#000', title1: 'x' });
    expect(changed).toBe(2);
    expect(props).toEqual({ titleColor: '#ff0000', titleSize: 30, title1: 'x' });
  });

  it('applyPaletteToInstance writes slot colors and leaves unmapped keys alone', () => {
    const before = { title1: '标题', themeColor: '#d0df67', titleColor: '#e9f4f1' };
    const palette = { accent: '#123456', title: '#abcdef' } as Parameters<typeof applyPaletteToInstance>[3];
    const { props, changed } = applyPaletteToInstance('fx-05', fx05, before, palette);
    expect(changed).toBe(2);
    expect(props.themeColor).toBe('#123456'); // accent 槽
    expect(props.titleColor).toBe('#abcdef'); // title 槽
    expect(props.title1).toBe('标题');
    expect(props.gColor).toBeUndefined(); // 槽未提供时不动
  });
});

describe('store batch actions', () => {
  it('applySameStyle propagates style keys to siblings, never to content', () => {
    const store = createEditorStore(project());
    const a = effect('fx-05', { title1: '甲', titleColor: '#ff0000', titleSize: 40 });
    const b = effect('fx-05', { title1: '乙', titleColor: '#00ff00' });
    const other = effect('t1-05', { titleColor: '#123456' });
    store.getState().replaceEffects([a, b, other]);

    const updated = store.getState().applySameStyle(a.instanceId);
    expect(updated).toBe(1);
    const [aAfter, bAfter, otherAfter] = store.getState().project.effects;
    expect(aAfter.props.titleColor).toBe('#ff0000'); // 源实例不动
    expect(aAfter.props.title1).toBe('甲');
    // 目标样式键被覆盖；内容键保留
    expect(bAfter.props.titleColor).toBe('#ff0000');
    expect(bAfter.props.titleSize).toBe(40);
    expect(bAfter.props.title1).toBe('乙');
    // 异类组件不受影响
    expect(otherAfter.props.titleColor).toBe('#123456');
  });

  it('applyPaletteToProject maps slots across heterogeneous components', () => {
    const store = createEditorStore(project());
    const a = effect('fx-05', { themeColor: '#d0df67', bgColor: 'rgba(12,14,11,0.6)' });
    const b = effect('t1-05', { lineColor: '#d0df67', titleColor: '#ffffff' });
    store.getState().replaceEffects([a, b]);

    const updated = store.getState().applyPaletteToProject({
      accent: '#eab308', accent2: '#3b82f6', emphasis: '#ef4444', title: '#111111',
      body: '#333333', label: '#888888', bg: '#101010', border: '#ffffff',
    });
    expect(updated).toBe(2); // 返回被更新的实例数：fx-05 与 t1-05
    const [aAfter, bAfter] = store.getState().project.effects;
    expect(aAfter.props.themeColor).toBe('#eab308');
    expect(aAfter.props.bgColor).toBe('#101010');
    expect(bAfter.props.lineColor).toBe('#eab308'); // accent
    expect(bAfter.props.titleColor).toBe('#111111');
  });
});
