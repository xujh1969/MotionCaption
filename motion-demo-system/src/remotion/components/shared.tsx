import React from 'react';
import { useCurrentFrame } from 'remotion';
import { CANVAS } from '../theme';
import { useConfigKey } from '../config';
import { measureText } from '../measure';

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

/** 去掉 {{}} 标记，返回纯文本（用于宽度测量、导出等不需要高亮信息的场合） */
export function stripKeyText(text: string): string {
  return String(text ?? '').replace(/\{\{([^}]+)\}\}/g, '$1');
}

/**
 * 按宽度手动折行（替代浏览器 white-space:normal 的原生折行）。
 *
 * 为什么必须手动折行：导出路径（@remotion/web-renderer）不是截图，而是把 DOM
 * 重新手绘到 canvas；跨多个内联元素的段落断行由它自行模拟，与浏览器布局存在
 * 差异，导致导出与预览断行位置不一致（t1-08 实测错位）。手动断行后，预览与
 * 导出调用同一个 measureText（同一 canvas、同一字体状态），断行结果完全一致。
 *
 * 断行规则：CJK 字符可任意断；连续拉丁/数字视为整词不切断；行首空格丢弃。
 * 返回行数组，每行是着色片段序列（hl 标记重点片段）。
 */
/**
 * 手动折行文本块（现成调用点）：预览与导出共用同一 measureText 断行，
 * 因此断点必然一致，不会出现「导出重新断行」的错位。
 * 传入带 {{重点}} 标记的文本；hlColor 给定时高亮片段用该色绘制。
 * 样式通过 style 透传（字号/字重/颜色/阴影等由调用方决定）。
 */
export const WrappedText: React.FC<{
  text: string;
  size: number;
  maxWidth: number;
  baseWeight?: 'Heavy' | 'Bold' | 'Regular';
  hlColor?: string;
  lineHeight?: number | string;
  style?: React.CSSProperties;
}> = ({ text, size, maxWidth, baseWeight = 'Regular', hlColor, lineHeight, style }) => (
  <div style={style}>
    {wrapKeySpansToLines(parseKeyText(text), size, maxWidth, baseWeight).map((line, li) => (
      <div key={li} style={{ whiteSpace: 'nowrap', lineHeight }}>
        {line.map((seg, si) => (seg.hl && hlColor ? (
          <span key={si} style={{ color: hlColor }}>{seg.t}</span>
        ) : (
          <span key={si}>{seg.t}</span>
        )))}
      </div>
    ))}
  </div>
);

export function wrapKeySpansToLines(
  parts: KeyTextPart[],
  size: number,
  maxWidth: number,
  /** 普通片段的字重（高亮片段固定按 Bold 测量），默认 Regular。 */
  baseWeight: 'Heavy' | 'Bold' | 'Regular' = 'Regular',
): KeyTextPart[][] {
  const measure = (t: string, hl: boolean) => measureText(t, size, hl ? 'Bold' : baseWeight);
  // 拆 token：连续拉丁/数字整词，其余字符逐个
  const toks: KeyTextPart[] = [];
  for (const p of parts) {
    let word = '';
    const flush = () => {
      if (word) {
        toks.push({ t: word, hl: p.hl });
        word = '';
      }
    };
    for (const ch of p.t) {
      if (/[A-Za-z0-9]/.test(ch)) {
        word += ch;
        continue;
      }
      flush();
      toks.push({ t: ch, hl: p.hl });
    }
    flush();
  }
  const lines: KeyTextPart[][] = [[]];
  let width = 0;
  for (const tok of toks) {
    const isSpace = /^\s$/.test(tok.t);
    const w = measure(tok.t, tok.hl);
    if (width + w > maxWidth && lines[lines.length - 1].length > 0) {
      lines.push([]);
      width = 0;
      if (isSpace) continue; // 丢弃行首空格
    } else if (isSpace && width === 0) {
      continue;
    }
    lines[lines.length - 1].push(tok);
    width += w;
  }
  return lines;
}

/**
 * 渲染支持 {{重点文字}} 的文本节点：普通片段继承基色，
 * 重点片段用 hlColor 绘制。文本无 {{}} 标记或未传 hlColor 时原样返回纯文本。
 * 供各组件的文本渲染点统一接入重点文字能力。
 */
export function renderKeyParts(text: string, hlColor?: string): React.ReactNode {
  if (!hlColor || !text || !text.includes('{{')) return text;
  return parseKeyText(text).map((p, i) =>
    p.hl
      ? <span key={i} style={{ color: hlColor }}>{p.t}</span>
      : <React.Fragment key={i}>{p.t}</React.Fragment>
  );
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

/**
 * 颜色线性插值（t=0 → a，t=1 → b），支持 #rrggbb / #rgb / rgb() / rgba()。
 * 结果 alpha ≥ 0.999 时返回 hex，否则返回 rgba()。
 */
export function mixColor(a: string, b: string, t: number): string {
  const pa = parseColor(a);
  const pb = parseColor(b);
  if (!pa || !pb) return t >= 0.5 ? b : a;
  const k = Math.max(0, Math.min(1, t));
  const rgb: RGB = {
    r: Math.round(pa.r + (pb.r - pa.r) * k),
    g: Math.round(pa.g + (pb.g - pa.g) * k),
    b: Math.round(pa.b + (pb.b - pa.b) * k),
    a: Math.round((pa.a + (pb.a - pa.a) * k) * 100) / 100,
  };
  if (rgb.a >= 0.999) {
    return '#' + ((1 << 24) | (rgb.r << 16) | (rgb.g << 8) | rgb.b).toString(16).slice(1);
  }
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${rgb.a})`;
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