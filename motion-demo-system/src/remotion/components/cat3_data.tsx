import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FONT_STACK } from '../theme';
import { useEnter, useEnterOpacity, useBreath, useCount, useEnterScale, useScanAcross, atFrames } from '../anim';
import { useConfigKey, useConfigList } from '../config';
import { weightNum, measureText } from '../measure';
import { tint } from './shared';

const base: React.CSSProperties = { position: 'absolute', fontFamily: FONT_STACK, whiteSpace: 'nowrap' };

/* 全宽斜向扫光覆盖层：光束从左侧进入、右侧完全移出，覆盖整个容器 */
const Scan: React.FC<{ x: number; y: number; w: number; h: number; frame: number }> = ({
  x, y, w, h, frame,
}) => {
  const pos = useScanAcross(frame, w);
  const beam = Math.max(140, w * 0.4);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', left: pos, top: 0, width: beam, height: h,
        transform: 'skewX(-18deg)',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
      }} />
    </div>
  );
};

/* 圆角透明矩形底版：半透白底 + 细边框，内部承载内容与扫光 */
const DataBox: React.FC<{ x: number; y: number; w: number; h: number; frame: number; border: string; scale?: number; children: React.ReactNode }> = ({
  x, y, w, h, frame, border, scale = 100, children,
}) => (
  <div style={{
    position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box',
    borderRadius: 20, background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${tint(border, 0.24)}`,
    boxShadow: '0 12px 44px rgba(0,0,0,0.28)',
    overflow: 'hidden',
    transformOrigin: 'top left', transform: `scale(${scale / 100})`,
  }}>
    {children}
    <Scan x={0} y={0} w={w} h={h} frame={frame} />
  </div>
);

interface TextProps {
  x: number; y: number; size: number; weight?: 'Heavy' | 'Bold' | 'Regular';
  color: string; text: string; opacity?: number; translateY?: number; letterSpacing?: number;
}
const T: React.FC<TextProps> = ({ x, y, size, weight = 'Heavy', color, text, opacity = 1, translateY = 0, letterSpacing = 0 }) => (
  <div style={{
    ...base, left: x, top: y, fontSize: size, fontWeight: weightNum(weight), color,
    opacity, transform: `translateY(${translateY}px)`, letterSpacing, textShadow: '0 3px 12px rgba(0,0,0,0.45)',
  }}>{text}</div>
);

/* ---------------- t3-01 大数字+单位底部说明（整组件扫光 + 圆角透明底） ---------------- */
export const T3_01: React.FC = () => {
  const frame = useCurrentFrame();
  const note = useEnter(frame, 0, 28, 18);
  const desc = useEnterOpacity(frame, 42);
  const scale = useEnterScale(frame, 20, 36);
  const breath = useBreath(frame, 1, 1, 0.03);
  const unitB = useBreath(frame, 1, 1, 0.05);
  const posX = (useConfigKey('t3-01', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t3-01', 'posY') as number) ?? 200;
  const configScale = (useConfigKey('t3-01', 'scale') as number) ?? 100;
  const noteSize = useConfigKey('t3-01', 'subSize') as number;
  const numSize = useConfigKey('t3-01', 'titleSize') as number;
  const numColor = useConfigKey('t3-01', 'titleColor') as string;
  const unitSize = useConfigKey('t3-01', 'unitSize') as number;
  const unitColor = useConfigKey('t3-01', 'accentColor') as string;
  const descSize = useConfigKey('t3-01', 'descSize') as number;
  const value = useConfigKey('t3-01', 'value') as number;
  const noteText = useConfigKey('t3-01', 'noteText') as string;
  const unitText = useConfigKey('t3-01', 'unitText') as string;
  const descText = useConfigKey('t3-01', 'descText') as string;
  const val = useCount(frame, value, 20, 34);

  const padX = 60, padY = 52, colW = 640;
  const numH = Math.max(numSize, unitSize);
  const g1 = 26, g2 = 34;
  const descBlock = Math.max(1, Math.ceil(measureText(descText, descSize, 'Regular') / colW));
  const descH = Math.round(descBlock * descSize * 1.4);
  const boxW = colW + padX * 2;
  const boxH = Math.round(padY * 2 + noteSize + g1 + numH + g2 + descH);

  return (
    <DataBox x={posX} y={posY} w={boxW} h={boxH} frame={frame} border={unitColor} scale={configScale}>
      <div style={{ position: 'absolute', left: padX, top: padY, width: colW }}>
        <div style={{ ...base, left: 0, top: 0, fontSize: noteSize, fontWeight: 400, color: COLORS.textSecondary, opacity: note.opacity, transform: `translateY(${note.translateY}px)` }}>
          {noteText}
        </div>
        <div style={{ ...base, left: 0, top: noteSize + g1, transform: `scale(${scale})`, transformOrigin: 'left top' }}>
          <span style={{ fontSize: numSize, fontWeight: 900, color: numColor, lineHeight: 1, opacity: 0.9 + (breath - 1) * 0.4, letterSpacing: -3 }}>{val}</span>
          <span style={{ fontSize: unitSize, fontWeight: 700, color: unitColor, lineHeight: 1, marginLeft: 10, opacity: 0.9 * unitB }}>{unitText}</span>
        </div>
        <div style={{ ...base, left: 0, top: noteSize + g1 + numH + g2, width: colW, textAlign: 'center', fontSize: descSize, fontWeight: 400, color: COLORS.textSecondary, lineHeight: 1.4, whiteSpace: 'normal', opacity: desc }}>
          {descText}
        </div>
      </div>
    </DataBox>
  );
};

/* ---------------- t3-02 前缀标签-数值-单位单行（圆角透明底 + 数值可改） ---------------- */
export const T3_02: React.FC = () => {
  const frame = useCurrentFrame();
  const m = useEnter(frame, 0, 34, 0);
  const unitB = useBreath(frame, 1, 1, 0.05);
  const posX = (useConfigKey('t3-02', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t3-02', 'posY') as number) ?? 240;
  const configScale = (useConfigKey('t3-02', 'scale') as number) ?? 100;
  const tagSize = useConfigKey('t3-02', 'subSize') as number;
  const tagColor = useConfigKey('t3-02', 'accentColor') as string;
  const numSize = useConfigKey('t3-02', 'titleSize') as number;
  const unitSize = useConfigKey('t3-02', 'unitSize') as number;
  const descSize = useConfigKey('t3-02', 'descSize') as number;
  const value = useConfigKey('t3-02', 'value') as number;
  const tagText = useConfigKey('t3-02', 'tagText') as string;
  const unitText = useConfigKey('t3-02', 'unitText') as string;
  const descText = useConfigKey('t3-02', 'descText') as string;
  const val = useCount(frame, value, 14, 32);
  const scale = useEnterScale(frame, 14, 32);

  const padX = 60, padY = 54, colW = 700;
  const numH = Math.max(tagSize, numSize, unitSize);
  const g = 28;
  const descBlock = Math.max(1, Math.ceil(measureText(descText, descSize, 'Regular') / colW));
  const descH = Math.round(descBlock * descSize * 1.4);
  const boxW = colW + padX * 2;
  const boxH = Math.round(padY * 2 + numH + g + descH);

  return (
    <DataBox x={posX} y={posY} w={boxW} h={boxH} frame={frame} border={tagColor} scale={configScale}>
      <div style={{ position: 'absolute', left: padX, top: padY, width: colW }}>
        <div style={{ ...base, left: 0, top: 0, opacity: m.opacity, transform: `scale(${m.scale})`, transformOrigin: 'left top' }}>
          <span style={{ fontSize: tagSize, fontWeight: 700, color: tagColor }}>{tagText}</span>
          <span style={{ fontSize: numSize, fontWeight: 900, color: COLORS.textPrimary, marginLeft: 10, transform: `scale(${scale})`, transformOrigin: 'left center', display: 'inline-block', lineHeight: 1, letterSpacing: -2 }}>{val}</span>
          <span style={{ fontSize: unitSize, fontWeight: 700, color: tagColor, marginLeft: 8, opacity: 0.9 * unitB }}>{unitText}</span>
        </div>
        <div style={{ ...base, left: 0, top: numH + g, width: colW, textAlign: 'center', fontSize: descSize, fontWeight: 400, color: COLORS.textSecondary, lineHeight: 1.4, whiteSpace: 'normal' }}>
          {descText}
        </div>
      </div>
    </DataBox>
  );
};

/* ---------------- t3-03 双栏对比数据组件 ---------------- */
export const T3_03: React.FC = () => {
  const frame = useCurrentFrame();
  const posX = (useConfigKey('t3-03', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t3-03', 'posY') as number) ?? 240;
  const configScale = (useConfigKey('t3-03', 'scale') as number) ?? 100;
  const accentA = useConfigKey('t3-03', 'accentColor') as string;
  const accentB = useConfigKey('t3-03', 'accent2') as string;
  const numSize = useConfigKey('t3-03', 'titleSize') as number;
  const numColor = useConfigKey('t3-03', 'titleColor') as string;
  const valueL = useConfigKey('t3-03', 'valueL') as number;
  const valueR = useConfigKey('t3-03', 'valueR') as number;
  const l = {
    label: useEnter(frame, 0, 28, 16),
    val: useCount(frame, valueL, 15, 30),
    scale: useEnterScale(frame, 15, 30),
    desc: useEnterOpacity(frame, 34),
  };
  const r = {
    label: useEnter(frame, 18, 28, 16),
    val: useCount(frame, valueR, 33, 30),
    scale: useEnterScale(frame, 33, 30),
    desc: useEnterOpacity(frame, 52),
  };
  const colGap = (useConfigKey('t3-03', 'colGap') as number) ?? 340;
  const descY = numSize + 56;
  const descSize = useConfigKey('t3-03', 'descSize') as number;
  const labelL = useConfigKey('t3-03', 'labelL') as string;
  const descL = useConfigKey('t3-03', 'descL') as string;
  // 左栏实际最宽内容（标签 / 数值 / 说明）：右栏至少退到它之后，避免大字号、多位数时两侧粘连
  const widthOf = (text: string, size: number) => {
    try {
      return measureText(String(text ?? ''), size, 'Bold');
    } catch {
      return String(text ?? '').length * size * 0.6;
    }
  };
  const leftContentW = Math.max(
    widthOf(labelL, 40),
    widthOf(String(valueL ?? ''), numSize),
    widthOf(descL, descSize),
  );
  const rightLeft = Math.max(colGap, Math.ceil(leftContentW) + 100);
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${configScale / 100})` }}>
      <div style={{ position: 'absolute', left: 0, top: 0 }}>
        <T x={0} y={0} size={40} weight="Bold" color={accentA} text={labelL} opacity={l.label.opacity} translateY={l.label.translateY} />
        <div style={{ ...base, left: 0, top: 44, fontSize: numSize, fontWeight: 900, color: numColor, transform: `scale(${l.scale})`, transformOrigin: 'left top', opacity: 0.92 }}>{l.val}</div>
        <T x={0} y={descY} size={descSize} weight="Regular" color={COLORS.textSecondary} text={descL} opacity={l.desc} />
      </div>
      <div style={{ position: 'absolute', left: rightLeft, top: 0 }}>
        <T x={0} y={0} size={40} weight="Bold" color={accentB} text={useConfigKey('t3-03', 'labelR') as string} opacity={r.label.opacity} translateY={r.label.translateY} />
        <div style={{ ...base, left: 0, top: 44, fontSize: numSize, fontWeight: 900, color: numColor, transform: `scale(${r.scale})`, transformOrigin: 'left top', opacity: 0.92 }}>{r.val}</div>
        <T x={0} y={descY} size={descSize} weight="Regular" color={COLORS.textSecondary} text={useConfigKey('t3-03', 'descR') as string} opacity={r.desc} />
      </div>
    </div>
  );
};

/* ---------------- t3-04 多行 key-value 数据条目（可编辑含数值/文字 + 增删 + 防重叠） ---------------- */
export const T3_04: React.FC = () => {
  const frame = useCurrentFrame();
  const posX = (useConfigKey('t3-04', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t3-04', 'posY') as number) ?? 220;
  const configScale = (useConfigKey('t3-04', 'scale') as number) ?? 100;
  const rows = useConfigList('t3-04', 'rows');
  const title = useEnter(frame, 0, 30, 20);
  const titleSize = useConfigKey('t3-04', 'titleSize') as number;
  const rowSize = useConfigKey('t3-04', 'subSize') as number;
  const accent = useConfigKey('t3-04', 'accentColor') as string;
  const dataColor = useConfigKey('t3-04', 'titleColor') as string;
  const keyW = 200, valueW = 260;
  const rowGap = Math.round(rowSize * 2.0);
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, width: 940, transformOrigin: 'top left', transform: `scale(${configScale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={COLORS.textPrimary} text={useConfigKey('t3-04', 'titleText') as string} opacity={title.opacity} translateY={title.translateY} />
      {rows.map((row, i) => {
        const atN = Number(row.at);
        const o = useEnterOpacity(frame, atFrames(row, i, 20, 12));
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: titleSize + 56 + i * rowGap, width: 900, display: 'flex', alignItems: 'baseline', opacity: o }}>
            <span style={{ fontSize: rowSize, fontWeight: 700, color: accent, width: keyW, flex: '0 0 auto', whiteSpace: 'nowrap' }}>{row.k ?? ''}</span>
            <span style={{ fontSize: rowSize, fontWeight: 900, color: dataColor, width: valueW, flex: '0 0 auto', whiteSpace: 'nowrap' }}>{row.v ?? ''}</span>
            <span style={{ fontSize: Math.round(rowSize * 0.62), fontWeight: 400, color: COLORS.textSecondary, flex: '1 1 auto', whiteSpace: 'normal', lineHeight: 1.4 }}>{row.d ?? ''}</span>
          </div>
        );
      })}
    </div>
  );
};