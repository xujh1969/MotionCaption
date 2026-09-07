import React from 'react';
import { useCurrentFrame } from 'remotion';
import { CANVAS } from '../theme';
import { useConfigKey } from '../config';

/**
 * 视频舞台：1920×1080，默认深蓝色渐变背景（代替底层视频）。
 * 组件作为透明叠加素材渲染在其上方。
 */
export const CanvasFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        width: CANVAS.width,
        height: CANVAS.height,
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(120% 90% at 22% 12%, #0f2a52 0%, #0b1e3a 42%, #060c1c 100%)',
      }}
    >
      {/* 精细网格增加科技感 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* 环境光晕 */}
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          left: CANVAS.centerXMin,
          top: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(76,201,240,0.12) 0%, transparent 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 700,
          height: 700,
          right: -120,
          bottom: -120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(199,125,255,0.10) 0%, transparent 70%)',
        }}
      />
      {children}
    </div>
  );
};

// 供组件内部使用：回传当前帧号（提供简单 Hook 封装）
export { useCurrentFrame };

export interface KeyTextPart { t: string; hl: boolean }

/**
 * 解析 {{重点文本}}，将高亮片段与普通片段拆开，
 * 高亮片段可用组件主色单独绘制。
 */
export function parseKeyText(text: string): KeyTextPart[] {
  const parts: KeyTextPart[] = [];
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: text.slice(last, m.index), hl: false });
    parts.push({ t: m[1], hl: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ t: text.slice(last), hl: false });
  return parts;
}

/* ==================== 颜色工具 ==================== */

export interface RGB { r: number; g: number; b: number; a: number }

/**
 * 解析颜色字符串（#rrggbb / #rgb / rgb() / rgba()）为 RGBA，失败返回 null。
 */
export function parseColor(c: string): RGB | null {
  if (typeof c !== 'string') return null;
  c = c.trim();
  let m = /^#([0-9a-f]{8})$/i.exec(c);
  if (m) {
    const n = parseInt(m[1], 16);
    return { r: (n >> 24) & 0xff, g: (n >> 16) & 0xff, b: (n >> 8) & 0xff, a: Math.round(((n & 0xff) / 255) * 100) / 100 };
  }
  m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) {
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff, a: 1 };
  }
  m = /^#([0-9a-f]{3})$/i.exec(c);
  if (m) {
    const s = m[1];
    return { r: parseInt(s[0] + s[0], 16), g: parseInt(s[1] + s[1], 16), b: parseInt(s[2] + s[2], 16), a: 1 };
  }
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(c);
  if (m) {
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }
  return null;
}

/** 取颜色透明度（0-1），解析失败视为 1 */
export function alphaOf(c: string): number {
  const p = parseColor(c);
  return p ? Math.max(0, Math.min(1, p.a)) : 1;
}

/** 取 #rrggbb（丢弃透明度），解析失败原样返回 */
export function hexOf(c: string): string {
  const p = parseColor(c);
  if (!p) return c;
  return '#' + ((1 << 24) | (p.r << 16) | (p.g << 8) | p.b).toString(16).slice(1);
}

/** 合并颜色与透明度；alpha ≥ 0.999 时返回 hex（更直观） */
export function withAlpha(c: string, a: number): string {
  const p = parseColor(c);
  if (!p) return c;
  const al = Math.max(0, Math.min(1, a));
  if (al >= 0.999) return hexOf(c);
  return `rgba(${p.r},${p.g},${p.b},${Math.round(al * 100) / 100})`;
}

/** hex 与透明度合并（同 withAlpha） */
export function joinColor(hex: string, a: number): string {
  return withAlpha(hex, a);
}

/** 拆分颜色值为 {hex, alpha} */
export function splitColor(c: string): { hex: string; a: number } {
  return { hex: hexOf(c), a: alphaOf(c) };
}

/**
 * 将任意颜色（hex 或 rgba）按给定透明度输出为 CSS 颜色。
 * 用于替换组件中 `${color}XX` 拼接：当颜色值本身是 rgba 时拼接会失效。
 * 透明度 >= 0.999 时返回 hex（更直观）。
 */
export function tint(c: string, a: number): string {
  return withAlpha(c, a);
}

/**
 * 按百分比提亮(正数)/压暗(负数)，支持 #rrggbb 与 rgba()，保留原透明度。
 */
export function shadeHex(hex: string, pct: number): string {
  const p = parseColor(hex);
  if (!p) return hex;
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + pct)));
  const h = '#' + ((1 << 24) | (c(p.r) << 16) | (c(p.g) << 8) | c(p.b)).toString(16).slice(1);
  return withAlpha(h, p.a);
}