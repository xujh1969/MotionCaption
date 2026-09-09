import React from 'react';
import { interpolate } from 'remotion';
import { FONT_STACK } from '../theme';
import { easeOutExpo, atFrames } from '../anim';
import { measureText } from '../measure';
import { withAlpha } from './shared';

/**
 * 卡片数组 / 图表类组件的公共工具。
 * 契约：条目的 at（秒）决定各自入场时刻；缺省时回退 base + i*step 帧的均匀节奏。
 */
export const FONT = FONT_STACK;

/** 条目入场进度 0→1（EaseOutExpo）。dur 为过渡帧数。 */
export function itemProgress(
  frame: number,
  row: unknown,
  i: number,
  base: number,
  step: number,
  dur: number,
): number {
  const delay = atFrames(row, i, base, step);
  return interpolate(frame, [delay, delay + dur], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** 卡片外壳：尺寸/圆角/底色/描边，附加点亮态外发光与投影（随进度平滑出现） */
export function shell(
  w: number, h: number, r: number, borderW: number, borderColor: string, bg: string,
  p: number, glowAlpha: number, glowBlur: number, drop: string,
): React.CSSProperties {
  return {
    width: w,
    height: h,
    borderRadius: r,
    background: bg,
    border: `${borderW}px solid ${borderColor}`,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    boxShadow: p <= 0
      ? 'none'
      : `0 0 ${(glowBlur * p).toFixed(1)}px ${withAlpha(borderColor, glowAlpha * p)}, ${drop.replace('ALPHA', (p).toFixed(3))}`,
  };
}

/** 面板容器（图表外框）：与 shell 类似但不带 flex 布局 */
export function panelBox(
  w: number, h: number, r: number, borderW: number, borderColor: string, bg: string,
  p: number, glowAlpha: number, glowBlur: number,
): React.CSSProperties {
  return {
    width: w,
    height: h,
    borderRadius: r,
    background: bg,
    border: `${borderW}px solid ${borderColor}`,
    boxSizing: 'border-box',
    overflow: 'hidden',
    boxShadow: p <= 0 ? 'none' : `0 0 ${(glowBlur * p).toFixed(1)}px ${withAlpha(borderColor, glowAlpha * p)}`,
  };
}

export const SHADOW_T4_03 = '0 6px 16px rgba(0,0,0,ALPHA)';
export const SHADOW_CYAN = '0 4px 14px rgba(0,0,0,ALPHA)';
export const SHADOW_STEP = '0 4px 16px rgba(0,0,0,ALPHA)';
export const SHADOW_BLOCK = '0 4px 12px rgba(0,0,0,ALPHA)';

/** 数字滚动：从 0 计数到 target（支持小数位），EaseOutExpo */
export function countValue(
  frame: number,
  target: number,
  delay: number,
  dur: number,
  decimals = 0,
): number {
  const p = interpolate(frame, [delay, delay + dur], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const v = target * p;
  return decimals > 0 ? Number(v.toFixed(decimals)) : Math.round(v);
}

/** 呼吸脉冲 0→1→0（余弦，cycleFrames 为一周期帧数） */
export function breathPulse(frame: number, cycleFrames: number): number {
  const t = (frame % cycleFrames) / cycleFrames;
  return 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
}

/** 逗号分隔的数值串 → 数字数组（非法项丢弃） */
export function parseNums(text: unknown): number[] {
  return String(text ?? '')
    .split(/[,，\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

/** 竖线分隔的文本 → 数组（用于对比卡点的要点列表） */
export function parsePoints(text: unknown): string[] {
  return String(text ?? '')
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 文本宽度：优先用 canvas 实测；无 DOM（离线渲染/测试）时按
 * 全角≈1 字号、半角≈0.55 字号估算。
 */
export function textWidth(
  text: unknown,
  fontSize: number,
  weight: 'Heavy' | 'Bold' | 'Regular' | 'Black' = 'Regular',
): number {
  const s = String(text ?? '');
  try {
    if (typeof document !== 'undefined') return measureText(s, fontSize, weight);
  } catch {
    /* 无可用 canvas → 走估算 */
  }
  let w = 0;
  for (const ch of s) {
    w += /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? fontSize : fontSize * 0.55;
  }
  return w;
}

/** 极坐标：角度以 12 点方向为 0，顺时针递增 */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** 环形分段路径（外弧顺时针 + 内弧逆时针闭合） */
export function donutPath(
  cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number,
): string {
  const span = Math.max(0, a1 - a0);
  const large = span > 180 ? 1 : 0;
  const [x0, y0] = polar(cx, cy, rOuter, a0);
  const [x1, y1] = polar(cx, cy, rOuter, a1);
  const [x2, y2] = polar(cx, cy, rInner, a1);
  const [x3, y3] = polar(cx, cy, rInner, a0);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${rOuter} ${rOuter} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
    + ` L${x2.toFixed(2)} ${y2.toFixed(2)} A${rInner} ${rInner} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)} Z`;
}

/** 多边形点串（雷达图用），pts 为 [半径比, 角度] */
export function polygonPoints(
  cx: number, cy: number, maxR: number, pts: { ratio: number; deg: number }[],
): string {
  return pts
    .map(({ ratio, deg }) => {
      const [x, y] = polar(cx, cy, maxR * ratio, deg);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}
