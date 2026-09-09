import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FONT_STACK } from '../theme';
import { useEnter, useEnterOpacity, useBreath, useGrow, useCount, atFrames } from '../anim';
import { useConfigKey, useConfigList } from '../config';
import { measureText, weightNum } from '../measure';
import { parseKeyText, shadeHex, stripKeyText, tint } from './shared';

// FX 系列卡片框架色（边框/底色，文案色已全部可配置）
const GOLD = '#d0df67', CREAM = '#e9f4f1';

const base: React.CSSProperties = { position: 'absolute', fontFamily: FONT_STACK, whiteSpace: 'nowrap' };
const TX: React.FC<{ x: number; y: number; size: number; color: string; text: string; weight?: number;
  opacity?: number; spacing?: number; maxWidth?: number }> =
  ({ x, y, size, color, text, weight = 400, opacity = 1, spacing = 0, maxWidth }) => (
    <div style={{ ...base, left: x, top: y, fontSize: size, fontWeight: weight, color, opacity,
      letterSpacing: spacing, whiteSpace: maxWidth ? 'normal' : 'nowrap', lineHeight: 1.3, maxWidth }}>{text}</div>
  );

/**
 * 支持 {{重点文字}} 的文本行：普通片段用正文色/正文字号，
 * 重点片段用重点色/重点字号，重点字号缺省时继承正文字号。
 */
const HLTX: React.FC<{ x: number; y: number; size: number; color: string; text: string;
  hlColor: string; hlSize?: number; weight?: number; opacity?: number }> =
  ({ x, y, size, color, text, hlColor, hlSize, weight = 400, opacity = 1 }) => (
    <div style={{ ...base, left: x, top: y, fontSize: size, fontWeight: weight, color, opacity, lineHeight: 1 }}>
      {parseKeyText(text).map((part, idx) => (
        <span
          key={idx}
          style={part.hl ? { color: hlColor, fontSize: hlSize ?? size } : undefined}
        >{part.t}</span>
      ))}
    </div>
  );

/* ---------- FX-1 双色分割横幅标题（蓝/白） ---------- */
export const FX_01: React.FC = () => {
  const frame = useCurrentFrame();
  const m = useEnter(frame, 0, 26, 18);
  const en = useConfigKey('fx-01', 'enText') as string;
  const enSize = useConfigKey('fx-01', 'enSize') as number;
  const enColor = useConfigKey('fx-01', 'enColor') as string;
  const titleText = useConfigKey('fx-01', 'titleText') as string;
  const titleSize = useConfigKey('fx-01', 'titleSize') as number;
  const titleColor = useConfigKey('fx-01', 'titleColor') as string;
  const accent = useConfigKey('fx-01', 'accent') as string;
  const parts = parseKeyText(titleText);
  const posX = (useConfigKey('fx-01', 'posX') as number) ?? 160;
  const posY = (useConfigKey('fx-01', 'posY') as number) ?? 250;
  const posScale = (useConfigKey('fx-01', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, opacity: m.opacity, transformOrigin: 'top left', transform: `translateY(${m.translateY}px) scale(${posScale / 100})` }}>
      <TX x={0} y={0} size={enSize} color={enColor} text={en} weight={600} spacing={4} />
      <div style={{ position: 'absolute', left: 0, top: 64, whiteSpace: 'nowrap', fontFamily: FONT_STACK, fontWeight: weightNum('Heavy'), fontSize: titleSize, lineHeight: 1 }}>
        {parts.map((p, idx) =>
          p.hl ? (
            <span key={idx} style={{ color: accent }}>{p.t}</span>
          ) : (
            <span key={idx} style={{ color: titleColor }}>{p.t}</span>
          )
        )}
      </div>
      <div style={{ position: 'absolute', left: 0, top: 64 + titleSize + 26, width: 470, height: 4, borderRadius: 2,
        background: `linear-gradient(90deg, ${accent} 0%, ${tint(accent, 0.33)} 60%, transparent 100%)` }} />
    </div>
  );
};

/* ---------- FX-2 双色分割横幅标题（白/绿）+ 绿色渐变底线 + 线下方小字 ---------- */
export const FX_02: React.FC = () => {
  const frame = useCurrentFrame();
  const m = useEnter(frame, 0, 26, 18);
  const en = useConfigKey('fx-02', 'enText') as string;
  const enSize = useConfigKey('fx-02', 'enSize') as number;
  const enColor = useConfigKey('fx-02', 'enColor') as string;
  const titleText = useConfigKey('fx-02', 'titleText') as string;
  const titleSize = useConfigKey('fx-02', 'titleSize') as number;
  const titleColor = useConfigKey('fx-02', 'titleColor') as string;
  const subText = useConfigKey('fx-02', 'subText') as string;
  const subSize = useConfigKey('fx-02', 'subSize') as number;
  const subColor = useConfigKey('fx-02', 'subColor') as string;
  const accent = useConfigKey('fx-02', 'accent') as string;
  const parts = parseKeyText(titleText);
  const lineY = 64 + titleSize + 26;
  const posX = (useConfigKey('fx-02', 'posX') as number) ?? 160;
  const posY = (useConfigKey('fx-02', 'posY') as number) ?? 250;
  const posScale = (useConfigKey('fx-02', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, opacity: m.opacity, transformOrigin: 'top left', transform: `translateY(${m.translateY}px) scale(${posScale / 100})` }}>
      <TX x={0} y={0} size={enSize} color={enColor} text={en} weight={600} spacing={4} />
      <div style={{ position: 'absolute', left: 0, top: 64, whiteSpace: 'nowrap', fontFamily: FONT_STACK, fontWeight: weightNum('Heavy'), fontSize: titleSize, lineHeight: 1 }}>
        {parts.map((p, idx) =>
          p.hl ? (
            <span key={idx} style={{ color: accent }}>{p.t}</span>
          ) : (
            <span key={idx} style={{ color: titleColor, textShadow: '0 0 14px rgba(255,255,255,0.45)' }}>{p.t}</span>
          )
        )}
      </div>
      <div style={{ position: 'absolute', left: 0, top: lineY, width: 470, height: 3, borderRadius: 2,
        background: `linear-gradient(90deg, ${accent} 0%, ${tint(accent, 0.4)} 55%, transparent 100%)` }} />
      <TX x={0} y={lineY + 16} size={subSize} color={subColor} text={subText} weight={500} spacing={2} opacity={0.85} />
    </div>
  );
};

/* ---------- FX-3 渐变警示条（菱形感叹号图标 + 双行文字） ---------- */
export const FX_03: React.FC = () => {
  const frame = useCurrentFrame();
  const m = useEnter(frame, 0, 26, 16);
  const en = useConfigKey('fx-03', 'enText') as string;
  const enSize = useConfigKey('fx-03', 'enSize') as number;
  const enColor = useConfigKey('fx-03', 'enColor') as string;
  const cn = useConfigKey('fx-03', 'cnText') as string;
  const cnSize = useConfigKey('fx-03', 'cnSize') as number;
  const cnColor = useConfigKey('fx-03', 'cnColor') as string;
  const accent = useConfigKey('fx-03', 'accent') as string;
  const posX = (useConfigKey('fx-03', 'posX') as number) ?? 130;
  const posY = (useConfigKey('fx-03', 'posY') as number) ?? 260;
  const posScale = (useConfigKey('fx-03', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, opacity: m.opacity, transformOrigin: 'top left', transform: `translateY(${m.translateY}px) scale(${posScale / 100})`, whiteSpace: 'nowrap' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 720, height: 108, borderRadius: 12,
        background: 'linear-gradient(90deg, rgba(61,31,31,0.95) 0%, rgba(61,31,31,0.7) 30%, rgba(26,26,26,0.4) 70%, rgba(26,26,26,0) 100%)',
        border: `1px solid ${accent}`, boxShadow: `0 0 24px ${tint(accent, 0.25)}, inset 0 0 18px ${tint(accent, 0.13)}` }} />
      <div style={{ position: 'absolute', left: 35.5, top: 35.5, width: 37, height: 37, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 37, height: 37, transform: 'rotate(45deg)', border: `3px solid ${accent}` }} />
        <div style={{ color: accent, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>!</div>
      </div>
      <TX x={104} y={20} size={enSize} color={enColor} text={en} weight={600} spacing={3} />
      <TX x={104} y={46} size={cnSize} color={cnColor} text={cn} weight={700} />
    </div>
  );
};

/* ---------- FX-4 指标卡片（顶部标签 + 大标题 + 指标块列表，数量可增减） ---------- */
export const FX_04: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 26, 18);
  const tag = useConfigKey('fx-04', 'tagText') as string;
  const tagSize = useConfigKey('fx-04', 'tagSize') as number;
  const tagColor = useConfigKey('fx-04', 'tagColor') as string;
  const bg = useConfigKey('fx-04', 'bgColor') as string;
  const titleText = useConfigKey('fx-04', 'titleText') as string;
  const titleSize = useConfigKey('fx-04', 'titleSize') as number;
  const titleColor = useConfigKey('fx-04', 'titleColor') as string;
  const nameSize = useConfigKey('fx-04', 'nameSize') as number;
  const pSize = useConfigKey('fx-04', 'pSize') as number;
  const pColor = useConfigKey('fx-04', 'pColor') as string;
  const items = useConfigList('fx-04', 'items');
  const pad = 30, barW = 140, gap = 20, barH = 96;
  const cardW = pad * 2 + items.length * barW + (items.length - 1) * gap;
  const cardH = 300;
  const posX = (useConfigKey('fx-04', 'posX') as number) ?? 130;
  const posY = (useConfigKey('fx-04', 'posY') as number) ?? 240;
  const posScale = (useConfigKey('fx-04', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${posScale / 100})` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: cardW, height: cardH, borderRadius: 18,
        border: `2px solid ${GOLD}`, background: bg, opacity: title.opacity }} />
      <TX x={pad} y={26} size={tagSize} color={tagColor} text={tag} opacity={title.opacity} />
      <TX x={pad + 4} y={64} size={titleSize} color={titleColor} text={titleText} weight={700} opacity={title.opacity} />
      {items.map((it, i) => {
        const o = useEnterOpacity(frame, atFrames(it, i, 26, 10));
        const col = it.color || GOLD;
        // val 语义为指标数值：纯数字或带 % 时按百分比展示；填入短文本（如“行业第一”）时原样显示，不强行加 %。
        const valRaw = String(it.val ?? '').trim();
        const v = valRaw.replace(/%$/, '').trim();
        const showPercent = /%$/.test(valRaw) || /^-?\d+(\.\d+)?$/.test(v);
        return (
          <div key={i} style={{ position: 'absolute', left: pad + i * (barW + gap), top: 168, width: barW, height: barH, borderRadius: 10,
            border: `2px solid ${col}`, opacity: o, background: tint(col, 0.078),
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 6,
            paddingLeft: 20, boxSizing: 'border-box' }}>
            <span style={{ color: col, fontSize: nameSize, fontWeight: 700, whiteSpace: 'nowrap' }}>{it.name}</span>
            <span style={{ color: pColor, fontSize: pSize, fontWeight: 700, whiteSpace: 'nowrap' }}>{v}{showPercent ? '%' : ''}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- FX-5 垂直卡片（整体60%黑底 + 贯穿全高主色线 + 实心胶囊标签 + 主标题 + 白色小标题 + 透明胶囊小标签数组） ---------- */
export const FX_05: React.FC = () => {
  const frame = useCurrentFrame();
  const m = useEnter(frame, 0, 26, 18);
  const tag = useConfigKey('fx-05', 'tagText') as string;
  const tagSize = useConfigKey('fx-05', 'tagSize') as number;
  const theme = useConfigKey('fx-05', 'themeColor') as string;
  const bg = useConfigKey('fx-05', 'bgColor') as string;
  const t1 = useConfigKey('fx-05', 'title1') as string;
  const t2 = useConfigKey('fx-05', 'title2') as string;
  const titleSize = useConfigKey('fx-05', 'titleSize') as number;
  const titleColor = useConfigKey('fx-05', 'titleColor') as string;
  const hlColor = useConfigKey('fx-05', 'hlColor') as string;
  const hlSize = useConfigKey('fx-05', 'hlSize') as number;
  const tags = useConfigList('fx-05', 'tags');
  const gSize = useConfigKey('fx-05', 'gSize') as number;
  const gColor = useConfigKey('fx-05', 'gColor') as string;
  // 布局计算
  const subSize = Math.round(titleSize * 0.5);
  // 第二行重点文字按副标题比例缩放，保证两行重点视觉一致
  const subHlSize = Math.round((hlSize ?? titleSize) * (titleSize > 0 ? subSize / titleSize : 0.5));
  const capsuleH = tagSize + 24;
  const title1Y = capsuleH + 30;
  const subY = title1Y + titleSize + 14;
  const subH = subSize + 10;
  const gY = subY + subH + 44;
  const tagH = gSize + 22;
  const innerH = gY + tagH;
  const H = innerH + 30;                       // 组件内容总高
  // 内容宽度（按实际文字测量，最小 300）
  const contentW = Math.max(
    measureText(tag, tagSize, 'Bold') + 44,
    measureText(stripKeyText(t1), titleSize, 'Bold'),
    measureText(stripKeyText(t2), subSize, 'Regular'),
    tags.reduce((s, r, i) => s + measureText(r.t, gSize, 'Regular') + 52 + (i > 0 ? 18 : 0), 0),
    300,
  );
  const boxX = -30, boxY = -20;
  const boxW = contentW + 26 + 40 + 30;        // 内容起始26 + 右侧留白 + 左侧留白
  const boxH = H + 40;                         // 黑底与线的高度（含上下留白）
  const posX = (useConfigKey('fx-05', 'posX') as number) ?? 160;
  const posY = (useConfigKey('fx-05', 'posY') as number) ?? 210;
  const posScale = (useConfigKey('fx-05', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, opacity: m.opacity, transformOrigin: 'top left', transform: `translateY(${m.translateY}px) scale(${posScale / 100})` }}>
      {/* 整体半透明背景（透明度随 bgColor 配置） */}
      <div style={{ position: 'absolute', left: boxX, top: boxY, width: boxW, height: boxH, borderRadius: 16, background: bg }} />
      {/* 左侧主题色线：贴近背景左边缘，中间空几个像素，贯穿组件全高 */}
      <div style={{ position: 'absolute', left: boxX + 6, top: boxY, width: 3, height: boxH, background: theme }} />
      {/* 顶部胶囊：实心主题色底，黑色文字，flex 垂直居中自动包裹文字 */}
      <div style={{ position: 'absolute', left: 26, top: 0, height: capsuleH, display: 'flex', alignItems: 'center', padding: '0 22px', borderRadius: capsuleH / 2, background: theme }}>
        <span style={{ fontFamily: FONT_STACK, fontSize: tagSize, fontWeight: weightNum('Bold'), color: '#000000', whiteSpace: 'nowrap', lineHeight: 1 }}>{tag}</span>
      </div>
      {/* 主标题（支持 {{重点文字}} 高亮） */}
      <HLTX x={26} y={title1Y} size={titleSize} color={titleColor} text={t1} hlColor={hlColor} hlSize={hlSize} weight={700} />
      {/* 主标题下方：80% 透明的白色小标题（同样支持 {{重点文字}} 高亮） */}
      <HLTX x={26} y={subY} size={subSize} color="#ffffff" text={t2} hlColor={hlColor} hlSize={subHlSize} weight={400} opacity={0.8} />
      {/* 小标签数组：透明底，边线与文字均为主色，胶囊包裹文字 */}
      {tags.map((r, i) => (
        <div key={i} style={{ position: 'absolute', left: 26 + tags.slice(0, i).reduce((s, it) => s + measureText(it.t, gSize, 'Regular') + 52 + 18, 0), top: gY, height: tagH, display: 'flex', alignItems: 'center', padding: '0 24px', borderRadius: tagH / 2, border: `2px solid ${gColor}`, background: 'transparent', boxSizing: 'border-box' }}>
          <span style={{ fontFamily: FONT_STACK, fontSize: gSize, fontWeight: 400, color: gColor, whiteSpace: 'nowrap', lineHeight: 1 }}>{r.t}</span>
        </div>
      ))}
    </div>
  );
};

/* ---------- FX-6 列表行卡片（顶部标签 + 大标题 + 步骤数组 + 补充说明） ---------- */
export const FX_06: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 26, 18);
  const tag = useConfigKey('fx-06', 'tagText') as string;
  const tagSize = useConfigKey('fx-06', 'tagSize') as number;
  const tagColor = useConfigKey('fx-06', 'tagColor') as string;
  const theme = useConfigKey('fx-06', 'themeColor') as string;
  const bg = useConfigKey('fx-06', 'bgColor') as string;
  const titleText = useConfigKey('fx-06', 'titleText') as string;
  const titleSize = useConfigKey('fx-06', 'titleSize') as number;
  const titleColor = useConfigKey('fx-06', 'titleColor') as string;
  const steps = useConfigList('fx-06', 'steps');
  const nSize = useConfigKey('fx-06', 'nSize') as number;
  const nColor = useConfigKey('fx-06', 'nColor') as string;
  const tSize = useConfigKey('fx-06', 'tSize') as number;
  const tColor = useConfigKey('fx-06', 'tColor') as string;
  const dSize = useConfigKey('fx-06', 'dSize') as number;
  const dColor = useConfigKey('fx-06', 'dColor') as string;
  const foot = useConfigKey('fx-06', 'footText') as string;
  const footSize = useConfigKey('fx-06', 'footSize') as number;
  const footColor = useConfigKey('fx-06', 'footColor') as string;
  // 布局：步骤行垂直居中于边框，底部说明在框内留足空间
  const rowStartY = 150, rowH = 54, rowGap = 12;
  const footY = rowStartY + steps.length * (rowH + rowGap) + 20;
  const boxH = footY + footSize + 44;
  const lineEnd = 34 + 34; // 顶部横线右端
  const posX = (useConfigKey('fx-06', 'posX') as number) ?? 130;
  const posY = (useConfigKey('fx-06', 'posY') as number) ?? 240;
  const posScale = (useConfigKey('fx-06', 'scale') as number) ?? 100;
  // 大标题渐显：在卡片出现后单独淡入，不与卡片整体动画绑定
  const titleO = useEnterOpacity(frame, 12);
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${posScale / 100})` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 620, height: boxH, borderRadius: 16,
        border: `2px solid ${theme}`, background: bg, opacity: title.opacity }} />
      <div style={{ position: 'absolute', left: 34, top: 26, width: 34, height: 2, background: theme }} />
      {/* 顶部标签：置于横线右侧，不与横线重叠 */}
      <TX x={lineEnd + 12} y={16} size={tagSize} color={tagColor} text={tag} opacity={title.opacity} />
      <TX x={34} y={62} size={titleSize} color={titleColor} text={titleText} weight={700} opacity={titleO} />
      {steps.map((r, i) => {
        const o = useEnterOpacity(frame, atFrames(r, i, 30, 14));
        return (
          <div key={i} style={{ position: 'absolute', left: 34, top: rowStartY + i * (rowH + rowGap), width: 552, height: rowH, borderRadius: 8, border: `2px solid ${theme}`, opacity: o, background: tint(theme, 0.05), display: 'flex', alignItems: 'center', boxSizing: 'border-box', padding: '0 18px' }}>
            <span style={{ fontFamily: FONT_STACK, fontSize: nSize, fontWeight: 700, color: nColor, whiteSpace: 'nowrap', lineHeight: 1 }}>{r.n}</span>
            <span style={{ marginLeft: 18, fontFamily: FONT_STACK, fontSize: tSize, fontWeight: 700, color: tColor, whiteSpace: 'nowrap', lineHeight: 1 }}>{r.t}</span>
            <span style={{ marginLeft: 'auto', fontFamily: FONT_STACK, fontSize: dSize, color: dColor, whiteSpace: 'nowrap', lineHeight: 1 }}>{r.d}</span>
          </div>
        );
      })}
      <TX x={34} y={footY} size={footSize} color={footColor} text={foot} opacity={title.opacity * 0.7} />
    </div>
  );
};

/* ---------- FX-7 2列小卡片（顶部标签 + 大标题 + 小卡片数组） ---------- */
export const FX_07: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 26, 18);
  const tag = useConfigKey('fx-07', 'tagText') as string;
  const tagSize = useConfigKey('fx-07', 'tagSize') as number;
  const tagColor = useConfigKey('fx-07', 'tagColor') as string;
  const theme = useConfigKey('fx-07', 'themeColor') as string;
  const bg = useConfigKey('fx-07', 'bgColor') as string;
  const titleText = useConfigKey('fx-07', 'titleText') as string;
  const titleSize = useConfigKey('fx-07', 'titleSize') as number;
  const titleColor = useConfigKey('fx-07', 'titleColor') as string;
  const cards = useConfigList('fx-07', 'cards');
  const ctSize = useConfigKey('fx-07', 'ctSize') as number;
  const ctColor = useConfigKey('fx-07', 'ctColor') as string;
  const cdSize = useConfigKey('fx-07', 'cdSize') as number;
  const cdColor = useConfigKey('fx-07', 'cdColor') as string;
  const foot = useConfigKey('fx-07', 'footText') as string;
  const footSize = useConfigKey('fx-07', 'footSize') as number;
  const footColor = useConfigKey('fx-07', 'footColor') as string;
  // 布局：2 列网格，边框随卡片行数与底部说明自由伸展
  const cw = 280, ch = 96, gx = 20, gy = 20;
  const cols = 2;
  const rowsN = Math.max(1, Math.ceil(cards.length / cols));
  const innerLeft = 34;
  const contentW = cols * cw + (cols - 1) * gx;
  const boxW = innerLeft + contentW + 44;      // 右侧留白加大，避免卡片贴边
  const cardsY = 142;
  const cardsBottom = cardsY + rowsN * ch + (rowsN - 1) * gy;
  const footY = cardsBottom + 24;
  const boxH = footY + footSize + 40;          // 底部留白加大，避免说明贴边
  const lineEnd = innerLeft + 34;              // 顶部横线右端
  const posX = (useConfigKey('fx-07', 'posX') as number) ?? 130;
  const posY = (useConfigKey('fx-07', 'posY') as number) ?? 240;
  const posScale = (useConfigKey('fx-07', 'scale') as number) ?? 100;
  // 大标题渐显：在卡片出现后单独淡入，不与卡片整体动画绑定
  const titleO = useEnterOpacity(frame, 12);
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${posScale / 100})` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: boxW, height: boxH, borderRadius: 16,
        border: `2px solid ${theme}`, background: bg, opacity: title.opacity }} />
      <div style={{ position: 'absolute', left: innerLeft, top: 26, width: 34, height: 2, background: theme }} />
      {/* 顶部标签：置于横线右侧，不与横线重叠 */}
      <TX x={lineEnd + 12} y={16} size={tagSize} color={tagColor} text={tag} opacity={title.opacity} />
      <TX x={innerLeft} y={62} size={titleSize} color={titleColor} text={titleText} weight={700} opacity={titleO} />
      {cards.map((c, i) => {
        const o = useEnterOpacity(frame, atFrames(c, i, 30, 12));
        const cx = innerLeft + (i % cols) * (cw + gx), cy = cardsY + Math.floor(i / cols) * (ch + gy);
        return (
          <div key={i} style={{ position: 'absolute', left: cx, top: cy, width: cw, height: ch, borderRadius: 8, border: `2px solid ${theme}`, opacity: o, background: tint(theme, 0.05), boxSizing: 'border-box', padding: '18px 18px' }}>
            <div style={{ fontFamily: FONT_STACK, fontSize: ctSize, fontWeight: 700, color: ctColor, whiteSpace: 'nowrap', lineHeight: 1.2 }}>{c.t}</div>
            <div style={{ marginTop: 12, fontFamily: FONT_STACK, fontSize: cdSize, color: cdColor, lineHeight: 1.4, whiteSpace: 'normal', opacity: o * 0.82 }}>{c.d}</div>
          </div>
        );
      })}
      <TX x={innerLeft} y={footY} size={footSize} color={footColor} text={foot} opacity={title.opacity * 0.7} />
    </div>
  );
};

/* ---------- FX-8 进度条卡片（顶部标签 + 大标题 + 进度条目数组，边框随条目数自由伸展） ---------- */
export const FX_08: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 26, 18);
  const tag = useConfigKey('fx-08', 'tagText') as string;
  const tagSize = useConfigKey('fx-08', 'tagSize') as number;
  const tagColor = useConfigKey('fx-08', 'tagColor') as string;
  const bg = useConfigKey('fx-08', 'bgColor') as string;
  const titleText = useConfigKey('fx-08', 'titleText') as string;
  const titleSize = useConfigKey('fx-08', 'titleSize') as number;
  const titleColor = useConfigKey('fx-08', 'titleColor') as string;
  const nSize = useConfigKey('fx-08', 'nSize') as number;
  const nColor = useConfigKey('fx-08', 'nColor') as string;
  const gSize = useConfigKey('fx-08', 'gSize') as number;
  const bars = useConfigList('fx-08', 'bars');
  // 布局：进度行垂直排列，边框随条目行数自由伸展，行内容与边框保持足够留白
  const innerLeft = 34;
  const rowH = 46, rowGap = 14;
  const barsY = 150;   // 大标题与小标题间距（标题在 y=62）
  const listH = Math.max(0, bars.length) * rowH + Math.max(0, bars.length - 1) * rowGap;
  const boxH = barsY + listH + 46;             // 底部留白，避免内容贴边
  const rowW = 560 - innerLeft - 42;           // 右侧留白 42
  const lineEnd = innerLeft + 34;              // 顶部横线右端
  const posX = (useConfigKey('fx-08', 'posX') as number) ?? 130;
  const posY = (useConfigKey('fx-08', 'posY') as number) ?? 240;
  const posScale = (useConfigKey('fx-08', 'scale') as number) ?? 100;
  // 大标题渐显：在卡片出现后单独淡入，不与卡片整体动画绑定
  const titleO = useEnterOpacity(frame, 12);
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${posScale / 100})` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 560, height: boxH, borderRadius: 16,
        border: `2px solid ${GOLD}`, background: bg, opacity: title.opacity }} />
      <div style={{ position: 'absolute', left: innerLeft, top: 26, width: 34, height: 2, background: GOLD }} />
      {/* 顶部标签：置于横线右侧，不与横线重叠 */}
      <TX x={lineEnd + 12} y={16} size={tagSize} color={tagColor} text={tag} opacity={title.opacity} />
      <TX x={innerLeft} y={62} size={titleSize} color={titleColor} text={titleText} weight={700} opacity={titleO} />
      {bars.map((b, i) => {
        const grow = useGrow(frame, atFrames(b, i, 24, 12));
        const o = useEnterOpacity(frame, atFrames(b, i, 24, 12) + 2);
        const col = b.color || GOLD;
        const g = Math.max(0, Math.min(100, Number(b.g) || 0));
        const y = barsY + i * (rowH + rowGap);
        return (
          <div key={i} style={{ position: 'absolute', left: innerLeft, top: y, width: rowW, opacity: o }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: FONT_STACK, fontSize: nSize, fontWeight: 700, color: nColor, whiteSpace: 'nowrap', lineHeight: 1 }}>{b.n}</span>
              <span style={{ fontFamily: FONT_STACK, fontSize: gSize, fontWeight: 700, color: col, whiteSpace: 'nowrap', lineHeight: 1 }}>{g}%</span>
            </div>
            <div style={{ position: 'absolute', left: 0, top: nSize + 12, width: '100%', height: 12, borderRadius: 6, background: `${CREAM}33` }} />
            <div style={{ position: 'absolute', left: 0, top: nSize + 12, width: `${100 * Math.min(grow, g / 100)}%`, height: 12, borderRadius: 6, background: col }} />
          </div>
        );
      })}
    </div>
  );
};

/* ---------- FX-9 深色渐变数字卡片 ---------- */
export const FX_09: React.FC = () => {
  const frame = useCurrentFrame();
  const m = useEnter(frame, 0, 26, 18);
  const bg = useConfigKey('fx-09', 'bgColor') as string;
  const tag = useConfigKey('fx-09', 'tagText') as string;
  const tagSize = useConfigKey('fx-09', 'tagSize') as number;
  const tagColor = useConfigKey('fx-09', 'tagColor') as string;
  const sub = useConfigKey('fx-09', 'subText') as string;
  const subSize = useConfigKey('fx-09', 'subSize') as number;
  const subColor = useConfigKey('fx-09', 'subColor') as string;
  const numTxt = useConfigKey('fx-09', 'numText') as string;
  const numSize = useConfigKey('fx-09', 'numSize') as number;
  const numColor = useConfigKey('fx-09', 'numColor') as string;
  const plus = useConfigKey('fx-09', 'plusText') as string;
  const plusSize = useConfigKey('fx-09', 'plusSize') as number;
  const plusColor = useConfigKey('fx-09', 'plusColor') as string;
  const source = useConfigKey('fx-09', 'sourceText') as string;
  const sourceSize = useConfigKey('fx-09', 'sourceSize') as number;
  const sourceColor = useConfigKey('fx-09', 'sourceColor') as string;
  const target = Number(numTxt) || 0;
  const num = useCount(frame, target, 20, 38);
  const numStr = num.toLocaleString();
  const finalStr = target.toLocaleString();
  const numW = measureText(finalStr, numSize, 'Black'); // 数字宽度（用最终值，避免动画中跳动）
  const oat = useEnterOpacity(frame, 40);
  const shimmer = useBreath(frame, 1, 1, 0.05);
  const posX = (useConfigKey('fx-09', 'posX') as number) ?? 130;
  const posY = (useConfigKey('fx-09', 'posY') as number) ?? 240;
  const posScale = (useConfigKey('fx-09', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, opacity: m.opacity, transformOrigin: 'top left', transform: `translateY(${m.translateY}px) scale(${posScale / 100})` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 720, height: 360, borderRadius: 16, background: bg }} />
      {/* 顶部颜色标题：左侧同色竖线，与标签等高，标签不折行 */}
      <div style={{ position: 'absolute', left: 46, top: 44, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 4, height: tagSize, borderRadius: 2, background: tagColor }} />
        <div style={{ color: tagColor, fontSize: tagSize, fontWeight: 700, letterSpacing: 6, whiteSpace: 'nowrap', lineHeight: 1 }}>{tag}</div>
      </div>
      {/* 副标题：不折行 */}
      <div style={{ position: 'absolute', left: 46, top: 96, color: subColor, fontSize: subSize, whiteSpace: 'nowrap' }}>{sub}</div>
      <div style={{ position: 'absolute', left: 40, top: 150, fontSize: numSize, fontWeight: 900, lineHeight: 1, whiteSpace: 'nowrap',
        backgroundImage: `linear-gradient(180deg, ${shadeHex(numColor, 0)} 0%, ${shadeHex(numColor, -18)} 30%, ${shadeHex(numColor, -38)} 55%, ${shadeHex(numColor, -60)} 100%)`,
        WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
        opacity: 0.95 + 0.05 * shimmer }}>
        {numStr}
      </div>
      {/* 加号：位于数字右侧，垂直方向与数字中上部对齐 */}
      <div style={{ position: 'absolute', left: 40 + numW + 16, top: 150 + numSize * 0.16, fontSize: plusSize, fontWeight: 500, color: plusColor, whiteSpace: 'nowrap', lineHeight: 1 }}>{plus}</div>
      {/* 底部说明：不折行 */}
      <div style={{ position: 'absolute', left: 46, top: 300, color: sourceColor, fontSize: sourceSize, opacity: oat, whiteSpace: 'nowrap' }}>{source}</div>
    </div>
  );
};