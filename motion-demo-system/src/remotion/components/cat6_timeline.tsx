import React from 'react';
import { Easing, useCurrentFrame, interpolate, useVideoConfig } from 'remotion';
import { COLORS, FONT_STACK } from '../theme';
import { easeOutExpo, useEnter, useEnterOpacity, useBreath, useGrowDown, useGrow, useCount, atFrames } from '../anim';
import { useConfigKey, useConfigList, useEffectClipLength } from '../config';
import { weightNum, measureText } from '../measure';
import { tint, mixColor, renderKeyParts, stripKeyText, WrappedText } from './shared';

const base: React.CSSProperties = { position: 'absolute', fontFamily: FONT_STACK, whiteSpace: 'nowrap' };
const T: React.FC<{ x: number; y: number; size: number; weight?: 'Heavy' | 'Bold' | 'Regular';
  color: string; text: string; opacity?: number; translateY?: number; letterSpacing?: number;
  maxWidth?: number; wrap?: boolean; lineHeight?: number;
  /** 重点文字颜色：文本含 {{重点}} 标记时用该色绘制重点片段。 */
  hl?: string }> = ({
  x, y, size, weight = 'Heavy', color, text, opacity = 1, translateY = 0, letterSpacing = 0, maxWidth, wrap = false, lineHeight, hl }) => (
  <div style={{ ...base, left: x, top: y, fontSize: size, fontWeight: weightNum(weight), color,
    whiteSpace: wrap ? 'normal' : 'nowrap', maxWidth, lineHeight,
    opacity, transform: `translateY(${translateY}px)`, letterSpacing, textShadow: '0 3px 12px rgba(0,0,0,0.45)' }}>
    {renderKeyParts(text, hl)}
  </div>
);

/* ---------------- t6-01 竖向时间轴时间线 ---------------- */
export const T6_01: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const posX = (useConfigKey('t6-01', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t6-01', 'posY') as number) ?? 200;
  const scale = (useConfigKey('t6-01', 'scale') as number) ?? 100;
  const nodes = useConfigList('t6-01', 'nodes') as { time: string; t: string; d: string }[];
  const list = nodes.length > 0 ? nodes : [{ time: '2025-03', t: '事件', d: '-' }];
  const titleSize = useConfigKey('t6-01', 'titleSize') as number;
  const nodeTitle = useConfigKey('t6-01', 'subSize') as number;
  const accent = useConfigKey('t6-01', 'accentColor') as string;
  const timeSize = useConfigKey('t6-01', 'timeSize') as number;
  const timeColor = useConfigKey('t6-01', 'timeColor') as string;
  const nodeColor = useConfigKey('t6-01', 'nodeColor') as string;
  const descSize = useConfigKey('t6-01', 'descSize') as number;
  const descColor = useConfigKey('t6-01', 'descColor') as string;
  const titleText = useConfigKey('t6-01', 'titleText') as string;
  const hl = useConfigKey('t6-01', 'hlColor') as string;
  const nodeGap = 148;
  const lastH = 64 + 64;
  const totalH = list.length * nodeGap + lastH;
  const lineP = useGrowDown(frame, 16, 40);
  const activeB = useBreath(frame, 1, 1, 0.12);
  const trackTop = titleSize + 56;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={COLORS.textPrimary} text={titleText}
        opacity={title.opacity} translateY={title.translateY} hl={hl} />
      <div style={{
        position: 'absolute', left: 22, top: trackTop, width: 3, height: totalH * lineP,
        background: tint(accent, 0.3), transformOrigin: 'top',
      }} />
      {list.map((n, i) => {
        const y = trackTop + i * nodeGap;
        const d = atFrames(n, i, 26, 16);
        const dotO = useEnterOpacity(frame, d);
        const timeO = useEnterOpacity(frame, d + 6);
        const tO = useEnterOpacity(frame, d + 14);
        const dO = useEnterOpacity(frame, d + 22);
        const isActive = i === 1;
        return (
          <div key={`n${i}`} style={{ position: 'absolute', left: 0, top: 0 }}>
            <div style={{
              position: 'absolute', left: 15, top: y - 10, width: 20, height: 20, borderRadius: '50%',
              background: accent, opacity: dotO,
              transform: `scale(${isActive ? activeB : 1})`, zIndex: 2,
              boxShadow: isActive ? `0 0 12px ${tint(accent, 0.8)}` : `0 0 6px ${tint(accent, 0.5)}`,
            }} />
            <T x={56} y={y - 8} size={timeSize} weight="Bold" color={timeColor} text={n.time} opacity={timeO} />
            <T x={56} y={y + 24} size={nodeTitle} weight="Bold" color={nodeColor} text={n.t} opacity={tO} />
            <T x={56} y={y + 24 + nodeTitle + 14} size={descSize} weight="Regular" color={descColor} text={n.d} opacity={dO} />
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t6-02 多节点横向箭头数据流 ---------------- */
export const T6_02: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const posX = (useConfigKey('t6-02', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t6-02', 'posY') as number) ?? 260;
  const scale = (useConfigKey('t6-02', 'scale') as number) ?? 100;
  const nodes = useConfigList('t6-02', 'nodes') as { t: string; d: string }[];
  const list = nodes.length > 0 ? nodes : [{ t: '节点', d: '-' }];
  const titleSize = useConfigKey('t6-02', 'titleSize') as number;
  const arrowColor = useConfigKey('t6-02', 'accentColor') as string;
  const nodeTitle = useConfigKey('t6-02', 'subSize') as number;
  const nodeColor = useConfigKey('t6-02', 'nodeColor') as string;
  const descSize = useConfigKey('t6-02', 'descSize') as number;
  const descColor = useConfigKey('t6-02', 'descColor') as string;
  const titleText = useConfigKey('t6-02', 'titleText') as string;
  const hl = useConfigKey('t6-02', 'hlColor') as string;
  const nodeW = 130, gapH = 90;      // 节点宽130、间距90
  const descGap = 10;                // 节点标题与说明的间距
  const nodeH = nodeTitle + descGap + descSize + 32; // 卡片高度随字号自适应（上下各16px留白）
  const startX = 0;
  const nodeO = list.map((n, i) => useEnterOpacity(frame, atFrames(n, i, 24, 16)));
  const nodeTop = titleSize + 36;    // 标题下 36px
  const arrowY = nodeTop + nodeH / 2 - 1; // 箭头垂直对齐卡片中线
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={COLORS.textPrimary} text={titleText}
        opacity={title.opacity} translateY={title.translateY} hl={hl} />
      {list.map((n, i) => (
        <div key={i} style={{
          position: 'absolute', left: startX + i * (nodeW + gapH), top: nodeTop, width: nodeW, height: nodeH,
          borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          boxSizing: 'border-box', opacity: nodeO[i],
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: nodeTitle, fontWeight: 700, color: nodeColor, lineHeight: 1, whiteSpace: 'nowrap' }}>{n.t}</div>
          <div style={{ fontSize: descSize, fontWeight: 400, color: descColor, lineHeight: 1, marginTop: descGap, whiteSpace: 'nowrap' }}>{n.d}</div>
        </div>
      ))}
      {list.slice(0, -1).map((_, i) => {
        // 箭头 i 连接节点 i→i+1：跟随下一节点的出现时机生长
        const aP = useGrow(frame, atFrames(list[i + 1], i + 1, 24, 16), 26);
        const flow = interpolate((frame + 50 + i * 20) % 46, [0, 45], [0, 1]);
        return drawArrow(startX + (i + 1) * nodeW + i * gapH, arrowY, gapH - 8, aP, flow, arrowColor);
      })}
    </div>
  );
};
function drawArrow(x: number, y: number, len: number, p: number, flow: number, color: string): React.ReactNode {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: len, height: 2, overflow: 'visible' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: len, height: 2, background: color, transformOrigin: 'left', transform: `scaleX(${p})`, opacity: 0.8 }} />
      <div style={{
        position: 'absolute', left: len - 12, top: -5, width: 0, height: 0,
        borderLeft: `12px solid ${color}`, borderTop: '6px solid transparent', borderBottom: '6px solid transparent',
        opacity: p,
      }} />
      <div style={{
        position: 'absolute', left: 6 + flow * (len - 30), top: -4, width: 0, height: 0,
        borderLeft: `10px solid ${color}`, borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
        filter: `drop-shadow(0 0 5px ${color})`, opacity: p,
      }} />
    </div>
  );
}

/* ---------------- t6-03 分段进度条指标组件 ---------------- */
export const T6_03: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const posX = (useConfigKey('t6-03', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t6-03', 'posY') as number) ?? 300;
  const scale = (useConfigKey('t6-03', 'scale') as number) ?? 100;
  const titleSize = useConfigKey('t6-03', 'titleSize') as number;
  const fillColor = useConfigKey('t6-03', 'lineColor') as string;
  const numSize = useConfigKey('t6-03', 'subSize') as number;
  const numColor = useConfigKey('t6-03', 'titleColor') as string;
  const titleText = useConfigKey('t6-03', 'titleText') as string;
  const descText = useConfigKey('t6-03', 'descText') as string;
  const hl = useConfigKey('t6-03', 'hlColor') as string;
  const descSize = useConfigKey('t6-03', 'descSize') as number;
  const descColor = useConfigKey('t6-03', 'descColor') as string;
  const barW = 570;
  const target = 82;
  const fillP = useGrow(frame, 18, 38);
  const num = useCount(frame, target, 20, 36);
  const fillB = useBreath(frame, 1, 1, 0.04);
  const bgO = useEnterOpacity(frame, 12);
  const numO = useEnterOpacity(frame, 22);
  const descO = useEnterOpacity(frame, 34);
  const pctW = (barW * target) / 100 * fillP;
  const barTop = titleSize + 30;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, width: 570, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={COLORS.textPrimary} text={titleText}
        opacity={title.opacity} translateY={title.translateY} hl={hl} />
      <div style={{ position: 'absolute', left: 0, top: barTop, width: barW, height: 14, borderRadius: 7, background: COLORS.track, opacity: bgO }} />
      <div style={{
        position: 'absolute', left: 0, top: barTop, width: pctW, height: 14, borderRadius: 7,
        background: fillColor, opacity: 0.9 * fillB, boxShadow: `0 0 12px ${tint(fillColor, 0.4)}`,
      }} />
      <div style={{ position: 'absolute', left: 0, top: barTop + 30, width: barW, display: 'flex', alignItems: 'flex-end' }}>
        <span style={{ fontSize: numSize, fontWeight: 700, color: numColor, opacity: numO, whiteSpace: 'nowrap', textShadow: '0 3px 12px rgba(0,0,0,0.45)' }}>{num}%</span>
        <WrappedText
          text={String(descText ?? '')} size={descSize} maxWidth={550 - numSize * 2} baseWeight="Regular" hlColor={hl}
          style={{ fontSize: descSize, fontWeight: 400, color: descColor, marginLeft: 24, opacity: descO }}
        />
      </div>
    </div>
  );
};

/* ---------------- t6-04 单输入双分支分叉流向图 ---------------- */
export const T6_04: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const posX = (useConfigKey('t6-04', 'posX') as number) ?? 560;
  const posY = (useConfigKey('t6-04', 'posY') as number) ?? 230;
  const scale = (useConfigKey('t6-04', 'scale') as number) ?? 100;
  const titleSize = useConfigKey('t6-04', 'titleSize') as number;
  const titleColor = useConfigKey('t6-04', 'titleColor') as string;
  const titleText = useConfigKey('t6-04', 'titleText') as string;
  const hl = useConfigKey('t6-04', 'hlColor') as string;
  const inText = useConfigKey('t6-04', 'inText') as string;
  const inSize = useConfigKey('t6-04', 'inSize') as number;
  const inColor = useConfigKey('t6-04', 'inColor') as string;
  const aText = useConfigKey('t6-04', 'aText') as string;
  const bText = useConfigKey('t6-04', 'bText') as string;
  const branchA = useConfigKey('t6-04', 'branchA') as string;
  const branchB = useConfigKey('t6-04', 'branchB') as string;
  const nodeSize = useConfigKey('t6-04', 'subSize') as number;

  const inO = useEnter(frame, 18, 26, 10);
  // 布局：以主干轴线 x=0 为中心，输入在顶部，分叉点向下，分支向左右展开
  const pillPadV = 14, pillPadH = 30;
  const inTop = titleSize + 48;                        // 输入胶囊顶部
  const pillH = inSize + pillPadV * 2;                 // 输入胶囊高度
  const trunkTop = inTop + pillH + 20;                 // 主干线起点（胶囊底部下方）
  const forkY = trunkTop + 96;                         // 分叉点
  const nodeY = forkY + 118;                           // 分支线终点
  const spread = 175;                                  // 分支横向展开距离
  const dy = nodeY - forkY;
  const branchLen = Math.hypot(spread, dy);
  const branchAng = (Math.atan2(spread, dy) * 180) / Math.PI; // 分支相对竖直方向的张开角度

  // 入场时序：标题 → 输入胶囊 → 主干生长 → 分叉点 → 分支生长 → 分支节点
  const lineMain = useGrowDown(frame, 30, 28);
  const forkO = useEnterOpacity(frame, 52, 10);
  const branchP = interpolate(frame, [58, 86], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const n1 = useEnter(frame, 80, 26, 10);
  const n2 = useEnter(frame, 90, 26, 10);

  // 流动光点：主干 + 两条分支循环流动，体现"流向"
  const CYC = 46;
  const trunkFlow = interpolate((frame + 30) % CYC, [0, CYC - 1], [0, forkY - trunkTop]);
  const flowA = interpolate((frame + 8) % CYC, [0, CYC - 1], [0, 1]);
  const flowB = interpolate((frame + 24) % CYC, [0, CYC - 1], [0, 1]);
  const trunkDotO = useEnterOpacity(frame, 60, 10);
  const branchDotO = useEnterOpacity(frame, 90, 10);

  const shadow = '0 3px 12px rgba(0,0,0,0.45)';
  // 斜向分支线：从分叉点向左下/右下生长
  // 注意：CSS 屏幕(y向下)坐标系中 rotate(正角) 使向下延伸的线底端向左偏，故右侧需负角、左侧需正角
  const branchLine = (dir: 1 | -1, color: string) => (
    <div style={{
      position: 'absolute', left: -1.5, top: forkY, width: 3,
      height: branchLen * branchP, background: color, opacity: 0.65,
      transform: `rotate(${-dir * branchAng}deg)`, transformOrigin: 'top center',
    }} />
  );
  // 沿分支线流动的光点
  const branchDot = (dir: 1 | -1, color: string, t: number) => (
    <div style={{
      position: 'absolute', left: dir * spread * t - 4, top: forkY + dy * t - 4,
      width: 8, height: 8, borderRadius: '50%', background: color,
      boxShadow: `0 0 10px ${tint(color, 0.9)}`, opacity: branchDotO,
    }} />
  );
  // 分支节点胶囊（描边+浅底，颜色跟随分支色）
  const branchPill = (dir: 1 | -1, text: string, color: string, m: { opacity: number; translateY: number }) => (
    <div style={{
      position: 'absolute', left: dir * spread, top: nodeY + 16,
      transform: `translate(-50%, ${m.translateY}px)`, opacity: m.opacity,
      fontSize: nodeSize, fontWeight: weightNum('Bold'), color, lineHeight: 1,
      padding: `12px ${pillPadH}px`, borderRadius: 999,
      border: `1.5px solid ${tint(color, 0.75)}`, background: tint(color, 0.1),
      letterSpacing: 2, textShadow: shadow,
    }}>{renderKeyParts(text, hl)}</div>
  );
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, fontFamily: FONT_STACK, whiteSpace: 'nowrap', transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      {/* 主标题：居中于主干轴线 */}
      <div style={{
        position: 'absolute', left: 0, top: 0, transform: `translate(-50%, ${title.translateY}px)`,
        fontSize: titleSize, fontWeight: weightNum('Heavy'), color: titleColor,
        opacity: title.opacity, textShadow: shadow,
      }}>{renderKeyParts(titleText, hl)}</div>
      {/* 输入节点胶囊 */}
      <div style={{
        position: 'absolute', left: 0, top: inTop, transform: `translate(-50%, ${inO.translateY}px)`,
        opacity: inO.opacity, fontSize: inSize, fontWeight: weightNum('Bold'), color: inColor,
        lineHeight: 1, padding: `${pillPadV}px ${pillPadH}px`, borderRadius: 999,
        background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.28)',
        letterSpacing: 2, textShadow: shadow,
      }}>{renderKeyParts(inText, hl)}</div>
      {/* 主干竖线 */}
      <div style={{
        position: 'absolute', left: -1.5, top: trunkTop, width: 3,
        height: (forkY - trunkTop) * lineMain, background: tint(branchA, 0.5),
      }} />
      {/* 主干流动光点 */}
      <div style={{
        position: 'absolute', left: -3, top: trunkTop + trunkFlow - 3, width: 6, height: 6,
        borderRadius: '50%', background: branchA, boxShadow: `0 0 8px ${tint(branchA, 0.9)}`,
        opacity: trunkDotO,
      }} />
      {/* 分叉点 */}
      <div style={{
        position: 'absolute', left: -8, top: forkY - 8, width: 16, height: 16, borderRadius: '50%',
        background: branchA, boxShadow: `0 0 12px ${tint(branchA, 0.7)}`, opacity: forkO,
      }} />
      {/* 左右分支线 */}
      {branchLine(-1, branchA)}
      {branchLine(1, branchB)}
      {/* 分支流动光点 */}
      {branchDot(-1, branchA, flowA)}
      {branchDot(1, branchB, flowB)}
      {/* 分支节点 */}
      {branchPill(-1, aText, branchA, n1)}
      {branchPill(1, bText, branchB, n2)}
    </div>
  );
};

/* ---------------- t6-05 节点分步入场时间线 ---------------- */
export const T6_05: React.FC = () => {
  const frame = useCurrentFrame();
  const posX = (useConfigKey('t6-05', 'posX') as number) ?? 260;
  const posY = (useConfigKey('t6-05', 'posY') as number) ?? 40;
  const scale = (useConfigKey('t6-05', 'scale') as number) ?? 100;
  const stepText = useConfigKey('t6-05', 'stepText') as string;
  const hl = useConfigKey('t6-05', 'hlColor') as string;
  const stepSize = useConfigKey('t6-05', 'stepSize') as number;
  const sloganText = useConfigKey('t6-05', 'sloganText') as string;
  const sloganSize = useConfigKey('t6-05', 'sloganSize') as number;
  const sloganColor = useConfigKey('t6-05', 'sloganColor') as string;
  const accent = useConfigKey('t6-05', 'accentColor') as string;
  const numSize = useConfigKey('t6-05', 'numSize') as number;
  const numColor = useConfigKey('t6-05', 'numColor') as string;
  const nodeSize = useConfigKey('t6-05', 'subSize') as number;
  const nodeColor = useConfigKey('t6-05', 'nodeColor') as string;
  const enSize = useConfigKey('t6-05', 'enSize') as number;
  const enColor = useConfigKey('t6-05', 'enColor') as string;
  const nodes = useConfigList('t6-05', 'nodes') as { num: string; t: string; en: string }[];
  const list = nodes.length > 0 ? nodes : [{ num: '01', t: '标题', en: 'TEXT' }];

  // 0-0.6s：STEP + 装饰竖线淡入，随后副标题淡入
  const headerO = interpolate(frame, [0, 12], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sloganO = interpolate(frame, [8, 18], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 0.6-1.2s：主竖线从上向下生长
  const lineP = useGrowDown(frame, 18, 36);
  // 节点位置常量（压缩整体纵向尺度，确保底部节点不被播放器控制条遮挡）
  const firstCy = 280, nodeGap = 135, tail = 45;
  const d = numSize + 56;            // 圆圈直径随序号字号缩放（默认32→88）
  const cr = d / 2;                  // 圆圈半径
  const lineTop = firstCy;           // 竖线从序号1开始，不向上冒头
  const lastCy = firstCy + (list.length - 1) * nodeGap;
  const totalLine = lastCy + cr + tail - lineTop;
  const lineH = totalLine * lineP;
  const fadeZone = Math.min(0.5, Math.max(0.1, (tail + cr) / totalLine)); // 线尾渐变透明区
  const enGap = 18;                  // 节点标题与英文说明之间间距
  // 头部布局：装饰竖线顶=STEP标签顶、底=副标题底；STEP与副标题保留合理间隙
  const hGap = 14;                              // STEP 与副标题之间间隙
  const stepTop = 75 - stepSize / 2;            // STEP 标签顶部
  const subTop = stepTop + stepSize + hGap;     // 副标题顶部
  const hLineTop = stepTop;                     // 装饰竖线顶部 = STEP 顶
  const hLineH = subTop + sloganSize - hLineTop; // 装饰竖线高度 = 副标题底 - STEP 顶
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      {/* 顶部左侧装饰竖线（顶对齐STEP顶、底对齐副标题底） */}
      <div style={{ position: 'absolute', left: 80, top: hLineTop, width: 4, height: hLineH, background: accent, opacity: headerO }} />
      {/* STEP 标签 */}
      <T x={110} y={stepTop} size={stepSize} weight="Bold" color={accent}
        text={stepText} opacity={headerO} letterSpacing={8} lineHeight={1} hl={hl} />
      {/* 副标题 */}
      <T x={110} y={subTop} size={sloganSize} weight="Regular" color={sloganColor}
        text={sloganText} opacity={sloganO} lineHeight={1} hl={hl} />
      {/* 主垂直时间轴（从序号1开始向下生长，尾部渐变透明） */}
      <div style={{
        position: 'absolute', left: 113.5, top: lineTop, width: 3, height: lineH,
        background: `linear-gradient(180deg, ${accent} 0%, ${accent} ${(1 - fadeZone) * 100}%, transparent 100%)`,
        transformOrigin: 'top',
      }} />
      {list.map((n, i) => {
        const cy = firstCy + i * nodeGap;
        // 标题+英文说明视为整体，其垂直中线与序号水平中线(cy)对齐
        const blockTop = cy - (nodeSize + enGap + enSize) / 2;
        // 节点逐个串行入场：每个整套 0.7s(21帧)，间隔 8 帧停顿；row.at 优先（秒→帧）
        const st = atFrames(n, i, 36, 29);
        const circleO = interpolate(frame, [st, st + 7], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const circleS = interpolate(frame, [st, st + 13], [0.3, 1], { easing: Easing.out(Easing.back(1.6)), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const titleP = interpolate(frame, [st + 5, st + 16], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const enO = interpolate(frame, [st + 11, st + 21], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={`n${i}`} style={{ position: 'absolute', left: 0, top: 0 }}>
            {/* 圆点弹出 + 序号 */}
            <div style={{
              position: 'absolute', left: 115 - cr, top: cy - cr, width: d, height: d,
              borderRadius: '50%', background: accent, opacity: circleO,
              transform: `scale(${circleS})`,
              boxShadow: `0 0 24px ${tint(accent, 0.55)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: numSize, fontWeight: 700, color: numColor, lineHeight: 1 }}>{n.num}</span>
            </div>
            {/* 中文标题滑入 */}
            <div style={{
              position: 'absolute', left: 200, top: blockTop,
              fontSize: nodeSize, fontWeight: 700, color: nodeColor, whiteSpace: 'nowrap', lineHeight: 1,
              opacity: titleP, transform: `translateX(${(1 - titleP) * -26}px)`,
              textShadow: '0 3px 12px rgba(0,0,0,0.45)',
            }}>{n.t}</div>
            {/* 英文说明淡入 */}
            <div style={{
              position: 'absolute', left: 200, top: blockTop + nodeSize + enGap,
              fontSize: enSize, fontWeight: 400, color: enColor, whiteSpace: 'nowrap', lineHeight: 1,
              opacity: enO, letterSpacing: 2,
              textShadow: '0 3px 12px rgba(0,0,0,0.45)',
            }}>{n.en}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t6-06 多步骤向上浮动递进时间线 ---------------- */
export const T6_06: React.FC = () => {
  const frame = useCurrentFrame();
  const posX = (useConfigKey('t6-06', 'posX') as number) ?? 0;
  const posY = (useConfigKey('t6-06', 'posY') as number) ?? 0;
  const scale = (useConfigKey('t6-06', 'scale') as number) ?? 100;
  const titleSize = useConfigKey('t6-06', 'titleSize') as number;
  const titleColor = useConfigKey('t6-06', 'titleColor') as string;
  const titleText = useConfigKey('t6-06', 'titleText') as string;
  const hl = useConfigKey('t6-06', 'hlColor') as string;
  const stepNumSize = useConfigKey('t6-06', 'stepNumSize') as number;
  const stepNumColor = useConfigKey('t6-06', 'stepNumColor') as string;
  const stepLabelSize = useConfigKey('t6-06', 'stepLabelSize') as number;
  const stepLabelColor = useConfigKey('t6-06', 'stepLabelColor') as string;
  const stepGap = useConfigKey('t6-06', 'stepGap') as number;
  const arrowSize = useConfigKey('t6-06', 'arrowSize') as number;
  const arrowColor = useConfigKey('t6-06', 'arrowColor') as string;
  const footerText = useConfigKey('t6-06', 'footerText') as string;
  const footerSize = useConfigKey('t6-06', 'footerSize') as number;
  const footerColor = useConfigKey('t6-06', 'footerColor') as string;
  const steps = useConfigList('t6-06', 'steps') as { num: string; t: string }[];
  const list = steps.length > 0 ? steps : [{ num: '01', t: '步骤' }];
  const n = list.length;
  const SH = '0 2px 6px rgba(0,0,0,0.35)'; // 柔和文字投影
  // 主标题入场：0.3 透明度淡入 + 上移 12px，600ms(18帧)
  const titleP = interpolate(frame, [0, 18], [0.3, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 18], [12, 0], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 步骤逐条入场：透明度 0.22→1，向上浮动 40px→0
  const stepDelay = 26, stepDur = 21;
  // 箭头循环点亮：每步箭头间距 1200ms(36帧)，从左到右依次高亮
  const cycle = frame % 36;
  const numA = Math.max(1, n - 1);
  const travel = (cycle / 36) * numA;
  // 底部备注：全部步骤入场后淡入 0→0.72，700ms(21帧)
  const footDelay = stepDelay + (n - 1) * 20 + 24;
  const footP = interpolate(frame, [footDelay, footDelay + 21], [0, 0.72], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${scale / 100})` }}>
      {/* 主标题 */}
      <div style={{
        position: 'absolute', left: 40, top: 140, fontSize: titleSize, fontWeight: 700,
        color: titleColor, opacity: titleP, transform: `translateY(${titleY}px)`,
        textShadow: SH, whiteSpace: 'nowrap',
      }}>{renderKeyParts(titleText, hl)}</div>
      {/* 步骤序列（锚点 y:360，水平间距 stepGap） */}
      <div style={{ position: 'absolute', left: 40, top: 360, display: 'flex', alignItems: 'center', gap: stepGap }}>
        {list.map((s, i) => {
          const delay = atFrames(s, i, stepDelay, 20);
          const p = interpolate(frame, [delay, delay + stepDur], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const opacity = 0.22 + 0.78 * p;
          // 上浮带轻微物理回弹（Hyperframes 式弹簧感，过冲幅度克制），结束归位
          const ty = interpolate(frame, [delay, delay + stepDur], [40, 0], { easing: Easing.out(Easing.back(1.4)), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          // 本步箭头点亮度：到标点距离越近越亮（最后一步无箭头）
          const d = Math.abs(i + 0.5 - travel);
          const bright = Math.max(0, 1 - d);
          const arrowO = 0.35 + 0.65 * bright;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity, transform: `translateY(${ty}px)`, whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: stepNumSize, fontWeight: 600, color: stepNumColor, lineHeight: 1, textShadow: SH }}>{s.num}</span>
              <span style={{ fontSize: stepLabelSize, fontWeight: 650, color: stepLabelColor, lineHeight: 1, textShadow: SH }}>{s.t}</span>
              {i < n - 1 && (
                <span style={{ fontSize: arrowSize, fontWeight: 700, color: arrowColor, lineHeight: 1, opacity: arrowO, textShadow: SH }}>&gt;</span>
              )}
            </div>
          );
        })}
      </div>
      {/* 底部备注 */}
      <div style={{
        position: 'absolute', left: 50, top: 585, fontSize: footerSize, fontWeight: 400,
        color: footerColor, opacity: footP, textShadow: SH, whiteSpace: 'nowrap',
      }}>{renderKeyParts(footerText, hl)}</div>
    </div>
  );
};

/* ---------------- t6-07 有序序号步骤列表（焦点滚动切换） ----------------
 * 设计约束：左侧安全区渲染（默认 x=120），透明叠加，无自带底色；
 * 行结构 = 序号方块(96) + 右侧连接线 + 步骤文本；新行逐条入场、焦点切换。
 * 每条目按其所在场景时段（按实例总时长均分）依次成为焦点：
 *   当前：大字号高亮 + 红色方块；历史：缩小白色；未到达：隐藏。
 * 末段整体 600ms 淡出（用实例时长上下文 useEffectClipLength 计算）。 */
export const T6_07: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = useVideoConfig().fps;
  const clipFrames = useEffectClipLength() || Math.max(1, Math.round(4 * fps));
  const posX = (useConfigKey('t6-07', 'posX') as number) ?? 120;
  const posY = (useConfigKey('t6-07', 'posY') as number) ?? 160;
  const scale = (useConfigKey('t6-07', 'scale') as number) ?? 100;
  const titleText = useConfigKey('t6-07', 'titleText') as string;
  const hl = useConfigKey('t6-07', 'hlColor') as string;
  const titleSize = (useConfigKey('t6-07', 'titleSize') as number) ?? 50;
  const titleColor = (useConfigKey('t6-07', 'titleColor') as string) ?? '#FFFFFF';
  const boxSize = (useConfigKey('t6-07', 'boxSize') as number) ?? 96;
  const boxRadius = (useConfigKey('t6-07', 'boxRadius') as number) ?? 16;
  const rowPitch = (useConfigKey('t6-07', 'rowPitch') as number) ?? 140;
  const boxActiveColor = (useConfigKey('t6-07', 'boxActiveColor') as string) ?? '#ff3322';
  const boxPastColor = (useConfigKey('t6-07', 'boxPastColor') as string) ?? 'rgba(60,60,60,0.65)';
  const numSize = (useConfigKey('t6-07', 'numSize') as number) ?? 48;
  const numColor = (useConfigKey('t6-07', 'numColor') as string) ?? '#FFFFFF';
  const lineThickness = (useConfigKey('t6-07', 'lineThickness') as number) ?? 4;
  const lineActiveColor = (useConfigKey('t6-07', 'lineActiveColor') as string) ?? '#ff3322';
  const activeSize = (useConfigKey('t6-07', 'textActiveSize') as number) ?? 88;
  const pastSize = (useConfigKey('t6-07', 'textPastSize') as number) ?? 54;
  const activeColor = (useConfigKey('t6-07', 'textActiveColor') as string) ?? '#ff5522';
  const pastColor = (useConfigKey('t6-07', 'textPastColor') as string) ?? '#FFFFFF';
  const pastOpacity = ((useConfigKey('t6-07', 'pastOpacity') as number) ?? 92) / 100;
  const stepMs = (useConfigKey('t6-07', 'stepMs') as number) ?? 420;

  const raw = useConfigList('t6-07', 'items') as { label?: string }[];
  const list = raw.length > 0 ? raw : [{ label: '机器人' }, { label: '智能体' }, { label: '复杂软件' }];
  const n = list.length;

  const msToF = (ms: number) => Math.max(1, Math.round((ms * fps) / 1000));
  const Tf = msToF(stepMs);          // 步骤焦点切换过渡
  const exitF = msToF(600);          // 整体出场淡出
  const introF = msToF(300);         // 入场淡入
  const seg = Math.max(1, Math.max(0, clipFrames - exitF) / n); // 每条目焦点窗口（均匀回退）
  // row.at（秒）优先：每条目在其字幕对应时刻成为焦点；无 at 回退均分窗口
  const hasAt = list.some((item) => Number.isFinite(Number((item as { at?: unknown }).at)));
  const actStartOf = (i: number) => (hasAt ? atFrames(list[i], i, 0, 0) : i * seg);

  const hasTitle = typeof titleText === 'string' && titleText.trim().length > 0;
  const listTop = hasTitle ? titleSize + 54 : 0; // 首行顶部（标题下方留 54px 呼吸）
  const boxRight = boxSize;                       // 方块右边缘（本地 x）
  const lineX = boxRight + 3;                     // 连接线紧贴方块右侧
  const textX = boxRight + 32;                    // 步骤文本距方块右边缘 32px
  const rowBottom = (i: number) => listTop + i * rowPitch + boxSize;

  // 组透明度：入场淡入 × 末段整体淡出
  const groupIn = interpolate(frame, [0, introF], [0, 1], {
    easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const groupOut = interpolate(frame, [clipFrames - exitF, clipFrames], [1, 0], {
    easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const groupOp = groupIn * groupOut;

  // 焦点序号：f = 最后一个已到达的条目（at 模式按 actStart 判定，回退模式按均分窗口）
  let focus = 0;
  for (let i = 0; i < n; i++) if (frame >= actStartOf(i)) focus = i;
  // 连接线：已走过的红色段自顶向下生长
  const trackH = rowBottom(n - 1) - listTop;
  const redGrow = interpolate(frame, [0, introF], [0, 1], {
    easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const focusStart = actStartOf(focus);
  const redEnd = focus === 0
    ? (listTop + (rowBottom(0) - listTop) * redGrow)
    : (rowBottom(focus - 1) + (rowBottom(focus) - rowBottom(focus - 1))
      * interpolate(frame, [focusStart, focusStart + Tf], [0, 1], {
        easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      }));

  // 单条 ease-out 过渡系数
  const easeOutCubic = (v: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3);

  // 根容器必须给出真实尺寸：导出重绘器对「尺寸为 0 的容器」不应用 opacity，
  // 末段淡出会整体失效（子元素全 absolute 时容器盒为 0×0）。
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, fontFamily: FONT_STACK,
      width: 820, height: listTop + (n - 1) * rowPitch + boxSize,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, opacity: groupOp }}>
      {hasTitle && (
        <div style={{
          position: 'absolute', left: textX, top: 0, fontSize: titleSize, fontWeight: 700,
          color: titleColor, whiteSpace: 'nowrap', lineHeight: 1.1, letterSpacing: 1,
          opacity: groupIn, textShadow: '0 3px 12px rgba(0,0,0,0.45)',
        }}>{renderKeyParts(titleText, hl)}</div>
      )}
      {/* 连接线：整轨淡痕 + 红色已走段 */}
      <div style={{
        position: 'absolute', left: lineX, top: listTop, width: lineThickness, height: trackH,
        background: tint(lineActiveColor, 0.32), opacity: 0.9, transformOrigin: 'top',
      }} />
      <div style={{
        position: 'absolute', left: lineX, top: listTop, width: lineThickness,
        height: Math.max(0, redEnd - listTop), background: lineActiveColor,
        opacity: 0.92, boxShadow: `0 0 8px ${tint(lineActiveColor, 0.5)}`, transformOrigin: 'top',
      }} />
      {/* 行条目 */}
      {list.map((item, i) => {
        const label = String(item.label ?? '');
        const actStart = actStartOf(i);
        const pastStart = i < n - 1 ? actStartOf(i + 1) : null;
        if (i > 0 && frame < actStart) return <div key={i} />; // 未到达：占位隐藏
        const aIn = i === 0 ? 1 : easeOutCubic((frame - actStart) / Tf); // 到达入场
        const past = pastStart !== null && frame >= pastStart;
        const pFrac = past && pastStart !== null ? easeOutCubic((frame - pastStart) / Tf) : 0;
        // 字号/颜色在 焦点↔历史 之间平滑插值；行垂直中线始终对齐方块中线
        const size = past
          ? pastSize + (activeSize - pastSize) * (1 - pFrac)
          : pastSize + (activeSize - pastSize) * aIn;
        const color = past
          ? mixColor(activeColor, pastColor, pFrac)
          : mixColor(pastColor, activeColor, aIn);
        const boxBg = past
          ? mixColor(boxActiveColor, boxPastColor, pFrac)
          : boxActiveColor;
        const op = (i === 0 ? 1 : aIn) * (past ? pastOpacity : 1);
        const rowY = listTop + i * rowPitch;
        const cy = rowY + boxSize / 2;
        // 超宽文本按比例缩号（不小于 0.5x），避免侵入画面中央人物区
        const maxW = 760;
        const rawW = measureText(stripKeyText(label), size, 'Bold');
        const shrink = rawW > maxW ? Math.max(0.5, maxW / rawW) : 1;
        const tSize = size * shrink;
        const glow = past ? 0 : (i === 0 ? 1 : aIn);
        const boxScale = past ? 1 : (i === 0 ? 1 : 0.86 + 0.14 * aIn);
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0 }}>
            {/* 序号方块 */}
            <div style={{
              position: 'absolute', left: 0, top: rowY, width: boxSize, height: boxSize,
              borderRadius: boxRadius, background: boxBg, opacity: op,
              boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: `scale(${boxScale})`, transformOrigin: 'center',
            }}>
              <span style={{
                fontSize: numSize, fontWeight: 700, color: numColor, lineHeight: 1,
                textShadow: '0 2px 6px rgba(0,0,0,0.4)',
              }}>{i + 1}</span>
            </div>
            {/* 步骤文本 */}
            <div style={{
              position: 'absolute', left: textX, top: cy - tSize / 2, fontSize: tSize,
              fontWeight: 700, color, opacity: op, whiteSpace: 'nowrap', lineHeight: 1,
              textShadow: glow > 0 ? `0 0 14px ${tint(activeColor, 0.22 * glow)}` : undefined,
            }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
};