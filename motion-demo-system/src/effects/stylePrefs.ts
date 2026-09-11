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

import type { EffectDefinition, PropRole } from './types';
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
 * 「存为默认样式」用：收集样式与布局快照——样式键 + 位置/缩放
 * （posX/posY/scale，role==='layout'）。
 * **文字内容（role==='content'，含文案与数组条目）永远不进快照**：
 * 默认文字只由代码内置默认决定，用户在工程里改过的文案不得污染后续新实例。
 * 注意：调用方需先把 effect.transform 的实际值叠加进 config（拖拽只改 transform，
 * props 里的 posX/posY/scale 可能是旧值）；「同步到同类组件」仍用
 * collectStyleValues（只同步样式，不覆盖他卡文字与位置）。
 */
export const collectInstanceSnapshot = (
  definition: EffectDefinition,
  config: Record<string, unknown>,
): StyleValues => {
  const out: StyleValues = {};
  for (const [key, prop] of Object.entries(definition.props)) {
    if (prop.role === 'content') continue;
    const value = config[key];
    if (typeof value === 'string' || typeof value === 'number') out[key] = value;
  }
  return out;
};

/**
 * 把用户默认快照并入一份 props。
 * 只覆盖给定 componentId 的用户记录中出现的键；其余保持原样。
 *
 * `options.definition` 提供时**内容键（role==='content'）永远不并入**：
 * 默认文字只由代码内置默认决定，用户快照里残留的旧文案（历史版本存过
 * 内容键）也不得盖掉内置文案。样式/布局键默认全并入；`options.roles`
 * 可进一步限定（AI 编排导入时传 `['style', 'layout']`）。
 * 未提供 definition 时保持旧行为（全部并入），仅限无法取 definition 的场景。
 */
export const mergeUserStyleDefaults = (
  componentId: string,
  props: Record<string, unknown>,
  defaults: UserStyleDefaults = readUserStyleDefaults(),
  options: { definition?: EffectDefinition; roles?: PropRole[] } = {},
): Record<string, unknown> => {
  const userValues = defaults[componentId];
  if (!userValues) return props;
  const roles = options.roles;
  const allowed = (key: string): boolean => {
    if (!options.definition) return true;
    const prop = options.definition.props[key];
    if (!prop || prop.role === 'content') return false;
    return !roles || roles.includes(prop.role);
  };
  const merged: Record<string, unknown> = { ...props };
  for (const [key, value] of Object.entries(userValues)) {
    if (!allowed(key)) continue;
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
