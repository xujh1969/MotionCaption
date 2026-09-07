// 全局色彩与字体令牌（依据规范文档 0.2 / 0.3）
export const COLORS = {
  textPrimary: '#FFFFFF',
  textSecondary: '#E6E6E6',
  themeCyan: '#4CC9F0',
  themeMagenta: '#F72585',
  themeGreen: '#06D6A0',
  themePurple: '#C77DFF',
  overlayLow: 'rgba(255,255,255,0.08)',
  overlayMed: 'rgba(255,255,255,0.18)',
  track: 'rgba(255,255,255,0.18)',
} as const;

// 画布与安全区（1920×1080，中心禁区 X760-1160）
export const CANVAS = {
  width: 1920,
  height: 1080,
  centerXMin: 760,
  centerXMax: 1160,
  safeLeftX: 130,
  safeRightX: 1790,
  safeLeftMax: 720,
  safeRightMin: 1200,
  maxWidth: 570,
} as const;

export const FONT_STACK =
  "'Inter', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif";