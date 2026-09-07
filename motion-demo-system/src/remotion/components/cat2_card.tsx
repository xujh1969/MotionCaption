import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FONT_STACK } from '../theme';
import { useEnter, useEnterOpacity, useBreath, useGrow } from '../anim';
import { useConfigKey } from '../config';
import { weightNum } from '../measure';
import { tint } from './shared';

const cardBase: React.CSSProperties = {
  position: 'absolute',
  fontFamily: FONT_STACK,
  boxSizing: 'border-box',
};

const T: React.FC<{ x: number; y: number; size: number; weight?: 'Heavy' | 'Bold' | 'Regular';
  color: string; text: string; opacity?: number; translateY?: number; letterSpacing?: number }> = ({
  x, y, size, weight = 'Heavy', color, text, opacity = 1, translateY = 0, letterSpacing = 0 }) => (
  <div style={{
    position: 'absolute', left: x, top: y, fontFamily: FONT_STACK, whiteSpace: 'nowrap',
    fontSize: size, fontWeight: weightNum(weight), color, opacity,
    transform: `translateY(${translateY}px)`, letterSpacing, textShadow: '0 3px 12px rgba(0,0,0,0.45)',
  }}>{text}</div>
);

/* ---------------- t2-01 单侧渐变发光边框文本卡片 ---------------- */
export const T2_01: React.FC = () => {
  const frame = useCurrentFrame();
  const text = useConfigKey('t2-01', 'contentText') as string;
  const borderP = useGrow(frame, 0, 30);
  const tOpacity = useEnterOpacity(frame, 22);
  const breath = useBreath(frame, 1, 1, 0.05);
  const textSize = useConfigKey('t2-01', 'titleSize') as number;
  const textColor = useConfigKey('t2-01', 'titleColor') as string;
  const bStart = useConfigKey('t2-01', 'borderStart') as string;
  const bEnd = useConfigKey('t2-01', 'borderEnd') as string;
  const textW = 560;
  const pad = 24;
  const radius = 8;
  const posX = (useConfigKey('t2-01', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t2-01', 'posY') as number) ?? 240;
  const scale = (useConfigKey('t2-01', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, width: textW * borderP, height: 3,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${tint(bStart, 0)} 0%, ${bStart} 20%, ${bEnd} 80%, ${tint(bEnd, 0)} 100%)`,
        boxShadow: `0 0 10px ${tint(bStart, 0.4 * breath)}`,
      }} />
      <div style={{
        ...cardBase,
        left: 0, top: 0, width: textW, padding: pad, paddingTop: pad + 10,
        opacity: tOpacity,
      }}>
        <div style={{ fontSize: textSize, fontWeight: 700, color: textColor, lineHeight: 1.25 }}>
          {text}
        </div>
      </div>
    </div>
  );
};

/* ---------------- t2-02 半透底色发光圆角标题卡片 ---------------- */
export const T2_02: React.FC = () => {
  const frame = useCurrentFrame();
  const card = useEnter(frame, 0, 32, 0);
  const tagO = useEnterOpacity(frame, 26);
  const titleO = useEnterOpacity(frame, 40);
  const tagSize = useConfigKey('t2-02', 'subSize') as number;
  const tagColor = useConfigKey('t2-02', 'accentColor') as string;
  const titleSize = useConfigKey('t2-02', 'titleSize') as number;
  const borderColor = useConfigKey('t2-02', 'lineColor') as string;
  const tagB = useBreath(frame, 1, 1, 0.05);
  const padL = 48;
  const gap = 12; // 标签与主标题间距
  const contentH = tagSize + gap + titleSize;
  const padY = 62;   // 原始上下等距留白（决定边框总高度）
  const padTop = 42; // 顶部留白减小，文字整体上移（底部留白相应增大，边框位置不变）
  const cardW = 420 + padL * 2;
  const cardH = contentH + padY * 2;
  const posX = (useConfigKey('t2-02', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t2-02', 'posY') as number) ?? 220;
  const scale = (useConfigKey('t2-02', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      <div style={{
        ...cardBase, left: 0, top: 0, width: cardW, height: cardH,
        padding: `${padTop}px ${padL}px ${padY * 2 - padTop}px`,
        borderRadius: 16,
        background: tint(tagColor, 0.059),
        border: `2px solid ${tint(borderColor, 0.9)}`,
        boxShadow: `0 0 8px ${tint(borderColor, 0.2)}`,
        opacity: card.opacity, transform: `scale(${card.scale})`,
      }}>
        <div style={{ fontSize: tagSize, fontWeight: 700, color: tagColor, letterSpacing: 2, opacity: tagO * (0.9 + (tagB - 1) * 0.3) }}>
          {useConfigKey('t2-02', 'tagText')}
        </div>
        <div style={{ fontSize: titleSize, fontWeight: 900, color: COLORS.textPrimary, marginTop: gap, opacity: titleO }}>
          {useConfigKey('t2-02', 'titleText')}
        </div>
      </div>
    </div>
  );
};

/* ---------------- t2-03 弱底色高亮信息模块 ---------------- */
export const T2_03: React.FC = () => {
  const frame = useCurrentFrame();
  const card = useEnter(frame, 0, 30, 0);
  const t = useEnterOpacity(frame, 24);
  const d = useEnterOpacity(frame, 38);
  const breath = useBreath(frame, 1, 1, 0.02);
  const titleSize = useConfigKey('t2-03', 'titleSize') as number;
  const titleColor = useConfigKey('t2-03', 'titleColor') as string;
  const descSize = useConfigKey('t2-03', 'subSize') as number;
  const bgColor = useConfigKey('t2-03', 'accentColor') as string;
  const pad = 32;
  const innerW = 560;
  const cardH = 'auto' as const;
  const posX = (useConfigKey('t2-03', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t2-03', 'posY') as number) ?? 240;
  const scale = (useConfigKey('t2-03', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      <div style={{
        ...cardBase, left: 0, top: 0, width: innerW + pad * 2, height: cardH,
        padding: pad, borderRadius: 12, background: bgColor,
        opacity: card.opacity, transform: `scale(${card.scale})`,
      }}>
        <div style={{ fontSize: titleSize, fontWeight: 900, color: titleColor, opacity: t }}>{useConfigKey('t2-03', 'titleText')}</div>
        <div style={{ fontSize: descSize, fontWeight: 400, color: COLORS.textSecondary, marginTop: 16, opacity: d, lineHeight: 1.5 }}>
          {useConfigKey('t2-03', 'descText')}
        </div>
      </div>
    </div>
  );
};