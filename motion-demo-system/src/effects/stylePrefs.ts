/**
 * 用户全局默认样式 + 调色板存取（本机 localStorage）
 *
 * - 全局默认：componentId -> { 样式键: 值 }。新建组件（手动拖入 / AI 导入 /
 *   编排落库）都会把这份默认叠进实例 props，使后续每个工程的同类组件都
 *   继承用户调好的风格；"重置默认"还原到它（无记录时还原代码内置默认）。
 * - 调色板：PaletteState（8 个语义槽）。"应用到全工程"按 paletteSlots 映射
 *   把槽色写进每个实例的颜色键。
 *
 * 纯函数部分（collectStyleValues / mergeStyleOverrides / applyPaletteToInstance）
 * 不依赖 localStorage，便于单测。
 */

import type { EffectDefinition } from './types';
import { PALETTE_SLOTS, slotFor, type PaletteState } from './paletteSlots';

const STYLE_DEFAULTS_KEY = 'motioncaption.styleDefaults.v1';
const PALETTE_KEY = 'motioncaption.palette.v1';

export type StyleValue = string | number;
export type StyleValues = Record<string, StyleValue>;
export type UserStyleDefaults = Record<string, StyleValues>; // componentId -> style values

/** 初始调色板：与既有组件默认观感相近的中性起点；实际常从当前组件提取后覆盖。 */
export const DEFAULT_PALETTE: PaletteState = {
  accent: '#d0df67',
  accent2: '#4f9cf7',
  emphasis: '#ff4d4f',
  title: '#e9f4f1',
  body: '#b7c6c0',
  label: '#8aa0a6',
  bg: '#0c0e0b',
  border: '#ffffff',
};

/* ------------------------------ localStorage ------------------------------ */

const safeGet = <T>(key: string): T | null => {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: unknown): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable — ignore */
  }
};

export const readUserStyleDefaults = (): UserStyleDefaults =>
  safeGet<UserStyleDefaults>(STYLE_DEFAULTS_KEY) ?? {};

export const saveUserStyleDefaults = (defaults: UserStyleDefaults): void =>
  safeSet(STYLE_DEFAULTS_KEY, defaults);

export const loadPalette = (): PaletteState | null =>
  safeGet<PaletteState>(PALETTE_KEY);

export const savePalette = (palette: PaletteState): void =>
  safeSet(PALETTE_KEY, palette);

/* ------------------------------- 纯函数部分 ------------------------------- */

/** definition 中归为样式（role==='style'）的键。 */
export const styleKeysOf = (definition: EffectDefinition): string[] =>
  Object.entries(definition.props)
    .filter(([, prop]) => prop.role === 'style')
    .map(([key]) => key);

/** 从解析后的 config（含默认兜底）收集当前样式键值，供存为默认 / 同类同步使用。 */
export const collectStyleValues = (
  definition: EffectDefinition,
  config: Record<string, unknown>,
): StyleValues => {
  const out: StyleValues = {};
  for (const [key, prop] of Object.entries(definition.props)) {
    if (prop.role !== 'style') continue;
    const value = config[key];
    if (typeof value === 'string' || typeof value === 'number') out[key] = value;
  }
  return out;
};

/**
 * 把用户默认样式键并入一份 props。
 * 只覆盖给定 componentId 的用户记录中出现的键；其余（内容等）保持原样。
 */
export const mergeUserStyleDefaults = (
  componentId: string,
  props: Record<string, unknown>,
  defaults: UserStyleDefaults = readUserStyleDefaults(),
): Record<string, unknown> => {
  const userValues = defaults[componentId];
  if (!userValues) return props;
  const merged: Record<string, unknown> = { ...props };
  for (const [key, value] of Object.entries(userValues)) {
    if (key in merged || typeof value === 'string' || typeof value === 'number') {
      merged[key] = value;
    }
  }
  return merged;
};

/**
 * 把当前实例的样式键覆盖到目标实例 props（同类同步）。
 * 返回实际发生变更的键数。
 */
export const applyStylesToTarget = (
  sourceStyles: StyleValues,
  targetProps: Record<string, unknown>,
): { props: Record<string, unknown>; changed: number } => {
  let changed = 0;
  const props = { ...targetProps };
  for (const [key, value] of Object.entries(sourceStyles)) {
    if (props[key] === value) continue;
    props[key] = value;
    changed += 1;
  }
  return { props, changed };
};

/** 依据语义色槽把调色板颜色写进单个组件 props；返回变更键数。 */
export const applyPaletteToInstance = (
  componentId: string,
  definition: EffectDefinition,
  props: Record<string, unknown>,
  palette: PaletteState,
): { props: Record<string, unknown>; changed: number } => {
  let changed = 0;
  const next = { ...props };
  for (const key of Object.keys(definition.props)) {
    const slot = slotFor(componentId, key);
    if (!slot) continue;
    const color = palette[slot];
    if (!color || next[key] === color) continue;
    next[key] = color;
    changed += 1;
  }
  return { props: next, changed };
};

/** 槽位全部存在校验（供 UI 初始化）。 */
export const isCompletePalette = (palette: PaletteState | null): palette is PaletteState =>
  !!palette && PALETTE_SLOTS.every((slot) => typeof palette[slot] === 'string' && palette[slot].length > 0);
