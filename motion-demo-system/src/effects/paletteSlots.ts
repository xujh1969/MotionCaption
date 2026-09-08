/**
 * 语义色槽（Palette Slots）
 *
 * 组件是从不同参考视频中模仿而来，颜色键名各异（themeColor / accent / titleColor…）。
 * 本表把每个组件"可安全参与全局统一配色"的颜色键人工归入少数语义槽，
 * 使跨组件套用同一套调色板成为可能：
 *
 *   - accent  主强调色：图形/渐变线/标签底色/序号/圆点/高亮词 等品牌主视觉
 *   - accent2 第二强调：左右栏对比、柱状双序列、双分支 的第二序列色
 *   - emphasis 重点词高亮：正文内 {{}} 重点文字的强调色（独立于 accent）
 *   - title   标题文字/主数字
 *   - body    说明/正文/行标题/副标题
 *   - label   弱文字：小标签/英文/时间/来源/图例/顶部 kicker
 *   - bg      表面/背景/底轨
 *   - border  描边/分隔/外框（非渐变线的静态框线）
 *
 * 下列键**不映射**（返回 null），应用调色板时保持组件原值：
 *   - 渐变两端色（borderStart/borderEnd、lineColor2）——单槽会毁掉渐变
 *   - 多序列数据色（t4-02 lineC1..C3、t5-02 状态色 done/warn/accent 组）
 *   - 语义状态色（t7-05 涨跌色、t6-04 输入节点色、t7-06 光晕等）
 *   - 组件内部强绑定结构、无法用通用槽表达的配色
 *
 * 槽位用途定义必须与 palette 面板 UI 文案一致（见 palette.ts）。
 */

export const PALETTE_SLOTS = [
  'accent',
  'accent2',
  'emphasis',
  'title',
  'body',
  'label',
  'bg',
  'border',
] as const;

export type PaletteSlot = (typeof PALETTE_SLOTS)[number];

export type PaletteState = Record<PaletteSlot, string>;

export type ComponentSlotMap = Record<string, Record<string, PaletteSlot>>;

/**
 * curated 映射：componentId -> { colorKey: slot }。
 * 未列出的颜色键一律不参与调色板（unmapped）。
 */
const SLOT_MAP: ComponentSlotMap = {
  'fx-01': { accent: 'accent', titleColor: 'title', enColor: 'label' },
  'fx-02': { accent: 'accent', titleColor: 'title', enColor: 'label', subColor: 'label' },
  'fx-03': { accent: 'accent', cnColor: 'body', enColor: 'label' },
  'fx-04': { tagColor: 'accent', bgColor: 'bg', titleColor: 'title', pColor: 'title' },
  'fx-05': { themeColor: 'accent', bgColor: 'bg', titleColor: 'title', hlColor: 'emphasis', gColor: 'label' },
  'fx-06': { tagColor: 'accent', themeColor: 'accent', bgColor: 'bg', titleColor: 'title', tColor: 'body', dColor: 'label', footColor: 'label' },
  'fx-07': { tagColor: 'accent', themeColor: 'accent', bgColor: 'bg', titleColor: 'title', ctColor: 'body', cdColor: 'label', footColor: 'label' },
  'fx-08': { tagColor: 'accent', bgColor: 'bg', titleColor: 'title', nColor: 'body' },
  'fx-09': { bgColor: 'bg', numColor: 'title', tagColor: 'accent', subColor: 'body', plusColor: 'accent', sourceColor: 'label' },
  't1-01': { titleColor: 'title', subColor: 'body', accentColor: 'accent' },
  't1-02': { lineColor: 'accent', titleColor: 'title', noteColor: 'label' },
  't1-03': { subColor: 'body', titleColor: 'title' },
  't1-04': { accentColor: 'accent', titleColor: 'title', descColor: 'body' },
  't1-05': { lineColor: 'accent', titleColor: 'title', descColor: 'body' },
  't1-06': { lineColor: 'accent', accentColor: 'label', titleColor: 'title', descColor: 'body' },
  't1-07': { titleColor: 'title', kickerColor: 'accent', descColor: 'body' },
  't1-08': { hlColor: 'emphasis', accentColor: 'accent', titleColor: 'title', bodyColor: 'body' },
  't1-09': { titleColor: 'title', accentColor: 'accent' },
  't2-01': { titleColor: 'title' },
  't2-02': { lineColor: 'border', accentColor: 'accent', titleColor: 'title' },
  't2-03': { accentColor: 'accent', titleColor: 'title', descColor: 'body' },
  't3-01': { titleColor: 'title', accentColor: 'accent', noteColor: 'label', descColor: 'body' },
  't3-02': { accentColor: 'accent', titleColor: 'title', descColor: 'body' },
  't3-03': { accentColor: 'accent', accent2: 'accent2', titleColor: 'title', descColor: 'body' },
  't3-04': { titleColor: 'title', accentColor: 'accent', descColor: 'body' },
  't4-01': { titleColor: 'title', accentColor: 'accent', dColor: 'body' },
  't4-02': { titleColor: 'title', frameColor: 'border', ringColor: 'bg', cnColor: 'body', enColor: 'label' },
  't5-01': { titleColor: 'title', accentColor: 'accent', descColor: 'body' },
  't5-03': { titleColor: 'title', accentColor: 'accent', descColor: 'body' },
  't5-04': { titleColor: 'title', accentColor: 'accent', subColor: 'body' },
  't5-05': { smallColor: 'label', mainColor: 'title', cardBg: 'bg' },
  't5-06': { titleColor: 'title', labelColor: 'accent', itemColor: 'body' },
  't6-01': { accentColor: 'accent', titleColor: 'title', nodeColor: 'body', timeColor: 'label', descColor: 'label' },
  't6-02': { accentColor: 'accent', titleColor: 'title', nodeColor: 'body', descColor: 'label' },
  't6-03': { lineColor: 'accent', titleColor: 'title', descColor: 'body' },
  't6-04': { titleColor: 'title', branchA: 'accent', branchB: 'accent2' },
  't6-05': { accentColor: 'accent', sloganColor: 'body', numColor: 'accent', nodeColor: 'body', enColor: 'label' },
  't6-06': { titleColor: 'title', stepNumColor: 'accent', stepLabelColor: 'body', arrowColor: 'accent', footerColor: 'label' },
  't6-07': { boxActiveColor: 'accent', lineActiveColor: 'accent', textActiveColor: 'accent', titleColor: 'title', numColor: 'title', textPastColor: 'body' },
  't7-01': { titleColor: 'title', barA: 'accent', barB: 'accent2', valColor: 'label', catColor: 'label' },
  't7-02': { lineColor: 'accent', titleColor: 'title', catColor: 'label', valColor: 'label' },
  't7-03': { titleColor: 'title', centerColor: 'accent', nameColor: 'body', pctColor: 'label' },
  't7-04': { xLabelColor: 'label', titleColor: 'title', legendColor: 'label' },
  't7-05': { titleColor: 'title', nameColor: 'body', valColor: 'label' },
  't7-06': { trackColor: 'bg', arcColor: 'accent', numColor: 'title', labelColor: 'body', sliderFill: 'accent' },
};

/** 查某组件某颜色键所属语义槽；未参与统一配色的键返回 null。 */
export const slotFor = (componentId: string, colorKey: string): PaletteSlot | null =>
  SLOT_MAP[componentId]?.[colorKey] ?? null;

/** 某组件内归入指定槽的键（按定义声明顺序）。 */
export const colorKeysForSlot = (componentId: string, slot: PaletteSlot): string[] => {
  const map = SLOT_MAP[componentId];
  if (!map) return [];
  return Object.entries(map)
    .filter(([, s]) => s === slot)
    .map(([key]) => key);
};

/** 槽位数量与顺序常量（供 UI 渲染调色板）。 */
export const PALETTE_SLOT_LABELS: Record<PaletteSlot, string> = {
  accent: '主色',
  accent2: '第二强调',
  emphasis: '重点词',
  title: '标题色',
  body: '说明色',
  label: '标签色',
  bg: '背景色',
  border: '描边色',
};

export const paletteSlotLabels = PALETTE_SLOT_LABELS;
