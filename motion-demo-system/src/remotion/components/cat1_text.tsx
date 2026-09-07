import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FONT_STACK } from '../theme';
import { useEnter, useBreath, useEnterOpacity, useGrow, useGrowDown, useGrowCenter } from '../anim';
import { useConfigKey, useConfigList } from '../config';
import { weightNum, measureText } from '../measure';
import { tint } from './shared';

const baseStyle: React.CSSProperties = {
  position: 'absolute',
  fontFamily: FONT_STACK,
  fontWeight: 700,
};

interface TextProps {
  x: number;
  y: number;
  size: number;
  weight?: 'Heavy' | 'Bold' | 'Regular';
  color: string;
  align?: 'left' | 'right';
  text: string;
  opacity?: number;
  translateY?: number;
  scale?: number;
  letterSpacing?: number;
  wrap?: boolean;
  maxWidth?: number;
}

const T: React.FC<TextProps> = ({
  x, y, size, weight = 'Heavy', color, align = 'left', text, opacity = 1,
  translateY = 0, scale = 1, letterSpacing = 0, wrap = false, maxWidth,
}) => (
  <div
    style={{
      ...baseStyle,
      left: x,
      top: y,
      fontSize: size,
      fontWeight: weightNum(weight),
      color,
      textAlign: align,
      whiteSpace: wrap ? 'normal' : 'nowrap',
      maxWidth,
      lineHeight: wrap ? 1.35 : undefined,
      opacity,
      transform: `translateY(${translateY}px) scale(${scale})`,
      transformOrigin: align === 'right' ? 'right top' : 'left top',
      letterSpacing,
      textShadow: '0 3px 12px rgba(0,0,0,0.45)',
    }}
  >
    {text}
  </div>
);

/* ---------------- t1-01 顶部状态标签+主标题副标题组合 (右侧) ---------------- */
export const T1_01: React.FC = () => {
  const frame = useCurrentFrame();
  const breath = useBreath(frame, 1, 1, 0.03);
  const tag = useEnter(frame, 0, 30, 20);
  const en = useEnter(frame, 15, 30, 20);
  const title = useEnter(frame, 30, 34, 24);
  const sub = useEnter(frame, 45, 30, 20);
  const titleSize = useConfigKey('t1-01', 'titleSize') as number;
  const titleColor = useConfigKey('t1-01', 'titleColor') as string;
  const subSize = useConfigKey('t1-01', 'subSize') as number;
  const subColor = useConfigKey('t1-01', 'subColor') as string;
  const accent = useConfigKey('t1-01', 'accentColor') as string;
  const tagSize = useConfigKey('t1-01', 'tagSize') as number;
  const enSize = useConfigKey('t1-01', 'enSize') as number;
  const tagText = useConfigKey('t1-01', 'tagText') as string;
  const enText = useConfigKey('t1-01', 'enText') as string;
  const titleText = useConfigKey('t1-01', 'titleText') as string;
  const subText = useConfigKey('t1-01', 'subText') as string;
  const x = 1790;
  // 统一行间距：英文标签到主标题、主标题到副标题的距离保持一致
  const G = 24;
  const enY = tagSize + G;
  const titleY = enY + enSize + G;
  const subY = titleY + titleSize + G;
  const posX = (useConfigKey('t1-01', 'posX') as number) ?? 1220;
  const posY = (useConfigKey('t1-01', 'posY') as number) ?? 160;
  const scale = (useConfigKey('t1-01', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, width: 570, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      <T x={0} y={0} size={tagSize} weight="Bold" color={subColor} align="right"
        text={tagText} opacity={tag.opacity * breath} translateY={tag.translateY} letterSpacing={4} />
      <T x={0} y={enY} size={enSize} weight="Bold" color={accent} align="right"
        text={enText} opacity={en.opacity} translateY={en.translateY} letterSpacing={2} />
      <T x={0} y={titleY} size={titleSize} weight="Heavy" color={titleColor} align="right"
        text={titleText} opacity={title.opacity} translateY={title.translateY} scale={title.scale} wrap maxWidth={570} />
      <T x={0} y={subY} size={subSize} weight="Regular" color={subColor} align="right"
        text={subText} opacity={sub.opacity} translateY={sub.translateY} wrap maxWidth={570} />
    </div>
  );
};

/* ---------------- t1-02 左侧竖线引用注释组件 ---------------- */
export const T1_02: React.FC = () => {
  const frame = useCurrentFrame();
  const quote = useConfigKey('t1-02', 'quoteText') as string;
  const note = useConfigKey('t1-02', 'noteText') as string;
  const qSize = useConfigKey('t1-02', 'subSize') as number;
  const qColor = useConfigKey('t1-02', 'titleColor') as string;
  const nSize = useConfigKey('t1-02', 'titleSize') as number;
  const lineColor = useConfigKey('t1-02', 'lineColor') as string;
  const line = useGrowDown(frame, 0, 30);
  const qOpacity = useEnterOpacity(frame, 20);
  const nOpacity = useEnterOpacity(frame, 35);
  const breath = useBreath(frame, 1, 1, 0.05);
  const qMaxW = 490;
  const qBlock = Math.max(1, Math.ceil(measureText(quote, qSize, 'Bold') / qMaxW));
  const quoteBlockH = Math.round(qBlock * qSize * 1.35);
  const posX = (useConfigKey('t1-02', 'posX') as number) ?? 140;
  const posY = (useConfigKey('t1-02', 'posY') as number) ?? 220;
  const scale = (useConfigKey('t1-02', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, width: qMaxW + 50, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, width: 3, borderRadius: 2,
        height: quoteBlockH * line, background: lineColor,
        opacity: 0.9, transformOrigin: 'top', boxShadow: `0 0 8px ${tint(lineColor, 0.5)}`,
      }} />
      <T x={50} y={0} size={qSize} weight="Bold" color={qColor}
        text={quote} opacity={qOpacity} wrap maxWidth={qMaxW} />
      <T x={50} y={quoteBlockH + 20} size={nSize} weight="Regular" color={COLORS.textSecondary}
        text={note} opacity={nOpacity * (1 + (breath - 1) * 0.3)} wrap maxWidth={qMaxW} />
    </div>
  );
};

/* ---------------- t1-03 顶部小字注解+主标题 (左侧) ---------------- */
export const T1_03: React.FC = () => {
  const frame = useCurrentFrame();
  const note = useEnter(frame, 0, 28, 18);
  const title = useEnter(frame, 25, 34, 24);
  const noteSize = useConfigKey('t1-03', 'subSize') as number;
  const titleSize = useConfigKey('t1-03', 'titleSize') as number;
  const titleColor = useConfigKey('t1-03', 'titleColor') as string;
  const noteColor = useConfigKey('t1-03', 'subColor') as string;
  const noteText = useConfigKey('t1-03', 'noteText') as string;
  const titleText = useConfigKey('t1-03', 'titleText') as string;
  const titleY = Math.round(noteSize + 26);
  const posX = (useConfigKey('t1-03', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t1-03', 'posY') as number) ?? 180;
  const scale = (useConfigKey('t1-03', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, width: 590, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      <T x={0} y={0} size={noteSize} weight="Regular" color={noteColor}
        text={noteText} opacity={note.opacity} translateY={note.translateY} />
      <T x={0} y={titleY} size={titleSize} weight="Heavy" color={titleColor}
        text={titleText} opacity={title.opacity} translateY={title.translateY} scale={title.scale} wrap maxWidth={590} />
    </div>
  );
};

/* ---------------- t1-04 小标题-主标题-副标题层级 ---------------- */
export const T1_04: React.FC = () => {
  const frame = useCurrentFrame();
  const tag = useEnter(frame, 0, 28, 16);
  const title = useEnter(frame, 15, 32, 22);
  const desc = useEnter(frame, 30, 30, 20);
  const tagSize = useConfigKey('t1-04', 'subSize') as number;
  const tagColor = useConfigKey('t1-04', 'accentColor') as string;
  const titleSize = useConfigKey('t1-04', 'titleSize') as number;
  const titleColor = useConfigKey('t1-04', 'titleColor') as string;
  const descSize = useConfigKey('t1-04', 'descSize') as number;
  const tagText = useConfigKey('t1-04', 'tagText') as string;
  const titleText = useConfigKey('t1-04', 'titleText') as string;
  const descText = useConfigKey('t1-04', 'descText') as string;
  const titleY = Math.round(tagSize + 22);
  const posX = (useConfigKey('t1-04', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t1-04', 'posY') as number) ?? 180;
  const scale = (useConfigKey('t1-04', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, width: 590, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      <T x={0} y={0} size={tagSize} weight="Bold" color={tagColor}
        text={tagText} opacity={tag.opacity} translateY={tag.translateY} letterSpacing={2} />
      <T x={0} y={titleY} size={titleSize} weight="Heavy" color={titleColor}
        text={titleText} opacity={title.opacity} translateY={title.translateY} scale={title.scale} wrap maxWidth={590} />
      <T x={0} y={titleY + titleSize + 34} size={descSize} weight="Regular" color={COLORS.textSecondary}
        text={descText} opacity={desc.opacity} translateY={desc.translateY} wrap maxWidth={590} />
    </div>
  );
};

/* ---------------- t1-05 双层粗细线条标题装饰 ---------------- */
export const T1_05: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useConfigKey('t1-05', 'titleText') as string;
  const desc = useConfigKey('t1-05', 'descText') as string;
  const titleSize = useConfigKey('t1-05', 'titleSize') as number;
  const titleColor = useConfigKey('t1-05', 'titleColor') as string;
  const descSize = useConfigKey('t1-05', 'subSize') as number;
  const lineColor = useConfigKey('t1-05', 'lineColor') as string;
  const w = Math.max(200, Math.round(measureText(title, titleSize, 'Heavy')));
  const tOpacity = useEnterOpacity(frame, 0);
  const dOpacity = useEnterOpacity(frame, 15);
  const lineP = useGrow(frame, 25);
  const breath = useBreath(frame, 1, 1, 0.05);
  const lineTop = titleSize + descSize + 58;
  const posX = (useConfigKey('t1-05', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t1-05', 'posY') as number) ?? 200;
  const scale = (useConfigKey('t1-05', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, width: 590, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={titleColor} text={title} opacity={tOpacity} wrap maxWidth={590} />
      <T x={0} y={titleSize + 22} size={descSize} weight="Regular" color={COLORS.textSecondary} text={desc} opacity={dOpacity} wrap maxWidth={590} />
      {/* 单条渐变线，从左向右延展，渐变方向：左侧实色 → 右侧透明 */}
      <div style={{
        position: 'absolute', left: 0, top: lineTop, width: w * lineP, height: 3,
        background: `linear-gradient(90deg, ${lineColor} 0%, ${tint(lineColor, 0)} 100%)`,
        borderRadius: 2, opacity: breath,
      }} />
    </div>
  );
};

/* ---------------- t1-06 标题底部双平行线平衡组件 ---------------- */
export const T1_06: React.FC = () => {
  const frame = useCurrentFrame();
  const en = useEnter(frame, 0, 28, 16);
  const title = useEnter(frame, 15, 32, 22);
  const desc = useEnter(frame, 30, 30, 20);
  const enSize = useConfigKey('t1-06', 'subSize') as number;
  const enColor = useConfigKey('t1-06', 'accentColor') as string;
  const titleSize = useConfigKey('t1-06', 'titleSize') as number;
  const lineColor = useConfigKey('t1-06', 'lineColor') as string;
  const descSize = useConfigKey('t1-06', 'descSize') as number;
  const enText = useConfigKey('t1-06', 'enText') as string;
  const titleText = useConfigKey('t1-06', 'titleText') as string;
  const descText = useConfigKey('t1-06', 'descText') as string;
  const p1 = useGrowCenter(frame, 38);
  const breath = useBreath(frame, 1, 1, 0.045);
  const w = 400;
  const posX = (useConfigKey('t1-06', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t1-06', 'posY') as number) ?? 200;
  const scale = (useConfigKey('t1-06', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, width: 590, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      <T x={0} y={0} size={enSize} weight="Bold" color={enColor}
        text={enText} opacity={en.opacity} translateY={en.translateY} letterSpacing={3} />
      <T x={0} y={22} size={titleSize} weight="Heavy" color={COLORS.textPrimary}
        text={titleText} opacity={title.opacity} translateY={title.translateY} scale={title.scale} wrap maxWidth={570} />
      <T x={0} y={titleSize + 56} size={descSize} weight="Regular" color={COLORS.textSecondary}
        text={descText} opacity={desc.opacity} translateY={desc.translateY} wrap maxWidth={570} />
      {/* 单条渐变线，从左侧生长，渐变方向：左侧实色 → 右侧透明 */}
      <div style={{
        position: 'absolute', left: 0, top: titleSize + 118, width: w * p1, height: 3,
        background: `linear-gradient(90deg, ${lineColor} 0%, ${tint(lineColor, 0)} 100%)`,
        borderRadius: 2, opacity: 0.9 * breath,
      }} />
    </div>
  );
};

/* ---------------- t1-07 双层重叠标题+辅助说明 ---------------- */
export const T1_07: React.FC = () => {
  const frame = useCurrentFrame();
  const bg = useEnterOpacity(frame, 0);
  const title = useEnter(frame, 20, 32, 22);
  const desc = useEnter(frame, 40, 30, 20);
  const topSize = useConfigKey('t1-07', 'titleSize') as number;
  const topColor = useConfigKey('t1-07', 'titleColor') as string;
  const kickerSize = useConfigKey('t1-07', 'kickerSize') as number;
  const kickerColor = useConfigKey('t1-07', 'kickerColor') as string;
  const kickerText = useConfigKey('t1-07', 'kickerText') as string;
  const descSize = useConfigKey('t1-07', 'descSize') as number;
  const topText = useConfigKey('t1-07', 'topText') as string;
  const descText = useConfigKey('t1-07', 'descText') as string;
  const kickerY = kickerSize + 12;
  const posX = (useConfigKey('t1-07', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t1-07', 'posY') as number) ?? 200;
  const scale = (useConfigKey('t1-07', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, width: 590, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      {/* 第一行：顶部文字（kicker），文案/字号/颜色均可由属性修改 */}
      <T x={0} y={0} size={kickerSize} weight="Bold" color={kickerColor}
        text={kickerText} opacity={bg} letterSpacing={4} />
      {/* 第二行：主标题（与第一行分离，避免重叠） */}
      <T x={0} y={kickerY} size={topSize} weight="Heavy" color={topColor}
        text={topText} opacity={title.opacity} translateY={title.translateY} scale={title.scale} wrap maxWidth={570} />
      {/* 第三行：辅助说明小字（字号显著更小） */}
      <T x={0} y={kickerY + topSize + 14} size={descSize} weight="Regular" color={COLORS.textSecondary}
        text={descText} opacity={desc.opacity} translateY={desc.translateY} wrap maxWidth={570} />
    </div>
  );
};

/* ---------------- t1-08 顶部锚点标签+正文段落 ---------------- */
export const T1_08: React.FC = () => {
  const frame = useCurrentFrame();
  const tag = useEnter(frame, 0, 28, 16);
  const title = useEnter(frame, 15, 32, 22);
  const body = useEnterOpacity(frame, 38);
  const bBreath = useBreath(frame, 1, 1, 0.06);
  const tagSize = useConfigKey('t1-08', 'subSize') as number;
  const tagColor = useConfigKey('t1-08', 'accentColor') as string;
  const titleSize = useConfigKey('t1-08', 'titleSize') as number;
  const bodySize = useConfigKey('t1-08', 'bodySize') as number;
  const hlColor = useConfigKey('t1-08', 'hlColor') as string;
  const tagText = useConfigKey('t1-08', 'tagText') as string;
  const titleText = useConfigKey('t1-08', 'titleText') as string;
  const bodyText = useConfigKey('t1-08', 'bodyText') as string;
  // 解析 {{重点文本}}，被框选的文字用「重点文本颜色」绘制
  const parts: { t: string; hl: boolean }[] = [];
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(bodyText)) !== null) {
    if (m.index > last) parts.push({ t: bodyText.slice(last, m.index), hl: false });
    parts.push({ t: m[1], hl: true });
    last = m.index + m[0].length;
  }
  if (last < bodyText.length) parts.push({ t: bodyText.slice(last), hl: false });
  const posX = (useConfigKey('t1-08', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t1-08', 'posY') as number) ?? 180;
  const scale = (useConfigKey('t1-08', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, width: 590, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      <T x={0} y={0} size={tagSize} weight="Bold" color={tagColor}
        text={tagText} opacity={tag.opacity} translateY={tag.translateY} letterSpacing={3} />
      <T x={0} y={48} size={titleSize} weight="Heavy" color={COLORS.textPrimary}
        text={titleText} opacity={title.opacity} translateY={title.translateY} scale={title.scale} wrap maxWidth={570} />
      <div style={{ position: 'absolute', left: 0, top: titleSize + 96, opacity: body, width: 590, lineHeight: 1.5 }}>
        <span style={{ fontSize: bodySize, fontWeight: 400, color: COLORS.textSecondary, whiteSpace: 'normal' }}>
          {parts.map((p, idx) =>
            p.hl ? (
              <b key={idx} style={{ color: hlColor, opacity: 0.9 * bBreath }}>{p.t}</b>
            ) : (
              <span key={idx}>{p.t}</span>
            )
          )}
        </span>
      </div>
    </div>
  );
};

/* ---------------- t1-09 主文本块底部注释 ---------------- */
export const T1_09: React.FC = () => {
  const frame = useCurrentFrame();
  const body = useEnter(frame, 0, 32, 22);
  const note = useEnterOpacity(frame, 22);
  const breath = useBreath(frame, 1, 1, 0.06);
  const bodySize = useConfigKey('t1-09', 'titleSize') as number;
  const bodyColor = useConfigKey('t1-09', 'titleColor') as string;
  const noteSize = useConfigKey('t1-09', 'subSize') as number;
  const noteColor = useConfigKey('t1-09', 'accentColor') as string;
  const bodyText = useConfigKey('t1-09', 'bodyText') as string;
  const noteText = useConfigKey('t1-09', 'noteText') as string;
  const posX = (useConfigKey('t1-09', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t1-09', 'posY') as number) ?? 300;
  const scale = (useConfigKey('t1-09', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, width: 590, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      <T x={0} y={0} size={bodySize} weight="Bold" color={bodyColor}
        text={bodyText} opacity={body.opacity} translateY={body.translateY} wrap maxWidth={560} />
      <T x={0} y={bodySize + 150} size={noteSize} weight="Regular" color={noteColor}
        text={noteText} opacity={note * (0.9 + (breath - 1) * 0.3)} />
    </div>
  );
};