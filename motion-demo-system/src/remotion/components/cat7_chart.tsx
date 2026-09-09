import React from 'react';
import { Easing, useCurrentFrame, interpolate } from 'remotion';
import { COLORS, FONT_STACK } from '../theme';
import { useEnter, useEnterOpacity, useBreath, useCount, useGrow, easeOutExpo, atFrames } from '../anim';
import { useConfigKey, useConfigList } from '../config';
import { weightNum } from '../measure';
import { tint } from './shared';

const base: React.CSSProperties = { position: 'absolute', fontFamily: FONT_STACK, whiteSpace: 'nowrap' };
const T: React.FC<{ x: number; y: number; size: number; weight?: 'Heavy' | 'Bold' | 'Regular';
  color: string; text: string; opacity?: number; translateY?: number }> = ({
  x, y, size, weight = 'Heavy', color, text, opacity = 1, translateY = 0 }) => (
  <div style={{ ...base, left: x, top: y, fontSize: size, fontWeight: weightNum(weight), color,
    opacity, transform: `translateY(${translateY}px)`, textShadow: '0 3px 12px rgba(0,0,0,0.45)' }}>
    {text}
  </div>
);

/* ---------------- t7-01 4柱竖向迷你柱状图 ---------------- */
export const T7_01: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const data = useConfigList('t7-01', 'items');
  const titleSize = useConfigKey('t7-01', 'titleSize') as number;
  const titleText = useConfigKey('t7-01', 'titleText') as string;
  const barA = useConfigKey('t7-01', 'barA') as string;
  const barB = useConfigKey('t7-01', 'barB') as string;
  const valSize = useConfigKey('t7-01', 'subSize') as number;
  const valColor = useConfigKey('t7-01', 'valColor') as string;
  const catSize = useConfigKey('t7-01', 'catSize') as number;
  const catColor = useConfigKey('t7-01', 'catColor') as string;
  const canvasX = 0, canvasY = titleSize + 70, canvasH = 220;
  const barW = 102, gap = 20;
  const startX = 0;
  const vals = data.map((r) => Number(r.val)).filter((n) => Number.isFinite(n));
  const maxV = Math.max(92, ...vals);
  const barB_ = useBreath(frame, 1, 1, 0.05);
  const posX = (useConfigKey('t7-01', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t7-01', 'posY') as number) ?? 220;
  const configScale = (useConfigKey('t7-01', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${configScale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={COLORS.textPrimary} text={titleText as string}
        opacity={title.opacity} translateY={title.translateY} />
      {data.map((r, i) => {
        const val = Number(r.val);
        const highlight = r.hl === '1' || (r.hl as string) === '高亮';
        const d = atFrames(r, i, 20, 10);
        const grow = useGrow(frame, d);
        const h = (val / maxV) * canvasH * grow;
        const x = startX + i * (barW + gap);
        const color = highlight ? barB : barA;
        const labelO = useEnterOpacity(frame, d + 20);
        const catO = useEnterOpacity(frame, d + 28);
        const num = useCount(frame, val, d + 6, 30);
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: canvasY }}>
            <div style={{
              position: 'absolute', left: 0, top: canvasH - h, width: barW, height: h,
              borderRadius: 6, background: color, opacity: 0.85 * (highlight ? 1 : 0.9 * barB_),
              boxShadow: highlight ? `0 0 14px ${tint(color, 0.4)}` : `0 0 8px ${tint(color, 0.3)}`,
            }} />
            <div style={{ position: 'absolute', left: 0, top: canvasH - h - valSize * 1.2, width: barW, textAlign: 'center', fontSize: valSize, fontWeight: 700, color: valColor, opacity: labelO }}>{num}</div>
            <div style={{ position: 'absolute', left: 0, top: canvasH + 16, width: barW, textAlign: 'center', fontSize: catSize, fontWeight: 400, color: catColor, opacity: catO }}>{r.cat}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t7-02 横向条形对比图 ---------------- */
export const T7_02: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const nodes = useConfigList('t7-02', 'nodes') as { cat: string; val: string }[];
  const rows = nodes.map((r) => ({ cat: r.cat, val: Number(r.val) }));
  const titleSize = useConfigKey('t7-02', 'titleSize') as number;
  const titleText = useConfigKey('t7-02', 'titleText') as string;
  const barColor = useConfigKey('t7-02', 'lineColor') as string;
  const catSize = useConfigKey('t7-02', 'catSize') as number;
  const catColor = useConfigKey('t7-02', 'catColor') as string;
  const valSize = useConfigKey('t7-02', 'valSize') as number;
  const valColor = useConfigKey('t7-02', 'valColor') as string;
  const barMaxW = 300;
  const itemH = 72;
  const barO = useBreath(frame, 1, 1, 0.04);
  const listTop = titleSize + 56;
  const posX = (useConfigKey('t7-02', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t7-02', 'posY') as number) ?? 240;
  const configScale = (useConfigKey('t7-02', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${configScale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={COLORS.textPrimary} text={titleText as string}
        opacity={title.opacity} translateY={title.translateY} />
      {rows.map((r, i) => {
        const d = atFrames(r, i, 18, 14);
        const catO = useEnterOpacity(frame, d);
        const bgO = useEnterOpacity(frame, d + 4);
        const fill = useGrow(frame, d + 8, 34);
        const valO = useEnterOpacity(frame, d + 20);
        const w = barMaxW * (r.val / 100) * fill;
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: listTop + i * itemH }}>
            <div style={{ position: 'absolute', left: 0, top: 8, width: 160, fontSize: catSize, fontWeight: 700, color: catColor, opacity: catO }}>{r.cat}</div>
            <div style={{ position: 'absolute', left: 170, top: 14, width: barMaxW, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.18)', opacity: bgO }} />
            <div style={{ position: 'absolute', left: 170, top: 14, width: w, height: 32, borderRadius: 16, background: barColor, opacity: 0.9 * barO, boxShadow: `0 0 10px ${tint(barColor, 0.4)}` }} />
            <div style={{ position: 'absolute', left: 170 + w + 12, top: 12, fontSize: valSize, fontWeight: 700, color: valColor, opacity: valO }}>{r.val}%</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t7-03 多段环形占比图 ---------------- */
const SEG_PALETTE = ['#4CC9F0', '#06D6A0', '#F72585', '#FFB703', '#8338EC', '#FB5607'];

export const T7_03: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const titleSize = useConfigKey('t7-03', 'titleSize') as number;
  const titleText = useConfigKey('t7-03', 'titleText') as string;
  const centerText = useConfigKey('t7-03', 'centerText') as string;
  const centerSize = useConfigKey('t7-03', 'centerSize') as number;
  const centerColor = useConfigKey('t7-03', 'centerColor') as string;
  const centerNumSize = useConfigKey('t7-03', 'centerNumSize') as number;
  const nameSize = useConfigKey('t7-03', 'nameSize') as number;
  const nameColor = useConfigKey('t7-03', 'nameColor') as string;
  const pctSize = useConfigKey('t7-03', 'pctSize') as number;
  const pctColor = useConfigKey('t7-03', 'pctColor') as string;
  const segsRaw = useConfigList('t7-03', 'segs') as { name: string; pct: string; color?: string }[];
  const segs = segsRaw.map((s, i) => ({
    name: s.name,
    pct: Number(s.pct) || 0,
    color: s.color || SEG_PALETTE[i % SEG_PALETTE.length],
    at: (s as { at?: unknown }).at,
  }));
  const outerR = 110, innerR = 62; // 环更大：路径中心线半径110，环宽48，外缘=110+24=134
  const svgSize = 280, cx = 140, cy = 140; // SVG半经140>134，避免裁剪
  const C = 2 * Math.PI * outerR;
  const total = useGrow(frame, 18, 44);
  const segSum = segs.reduce((a, s) => a + s.pct, 0);
  const centerNum = useCount(frame, segSum, 26, 34);
  const centerO = useEnterOpacity(frame, 30);
  const subO = useEnterOpacity(frame, 44);
  let acc = 0;
  const barB = useBreath(frame, 1, 1, 0.02);
  const top = titleSize + 56;
  // 图例垂直方向与环的纵轴中线（垂直中心线）对齐：整体块高度中点落在 cy 处
  const step = 70, rowH = 46;
  const blockH = step * (segs.length - 1) + rowH;
  const legendTop = top + cy - blockH / 2;
  const posX = (useConfigKey('t7-03', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t7-03', 'posY') as number) ?? 200;
  const configScale = (useConfigKey('t7-03', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${configScale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={COLORS.textPrimary} text={titleText as string}
        opacity={title.opacity} translateY={title.translateY} />
      <svg width={svgSize} height={svgSize} style={{ position: 'absolute', left: 0, top: top, transform: 'rotate(-90deg)', opacity: 0.9 * barB }}>
        {segs.map((s, i) => {
          const offset = acc;
          acc += s.pct;
          const visible = s.pct * total;
          return (
            <circle key={i} cx={cx} cy={cy} r={outerR} fill="none" stroke={s.color} strokeWidth={outerR - innerR}
              strokeDasharray={`${(visible / 100) * C} ${C}`}
              strokeDashoffset={(-offset / 100) * C}
              style={{ filter: `drop-shadow(0 0 6px ${s.color})` }}
            />
          );
        })}
      </svg>
      <div style={{ position: 'absolute', left: cx - 70, top: top + cy - 60, width: 140, textAlign: 'center', opacity: centerO }}>
        <div style={{ fontSize: centerNumSize, fontWeight: 900, color: COLORS.textPrimary }}>{centerNum}%</div>
        <div style={{ fontSize: centerSize, fontWeight: 400, color: centerColor, marginTop: 6, opacity: subO }}>{centerText as string}</div>
      </div>
      {segs.map((s, i) => {
        const o = useEnterOpacity(frame, atFrames(s, i, 40, 14));
        return (
          <div key={i} style={{ position: 'absolute', left: svgSize + 40, top: legendTop + i * step, opacity: o, whiteSpace: 'nowrap' }}>
            <div style={{ display: 'inline-block', width: 16, height: 16, background: s.color, marginRight: 12, verticalAlign: 'middle', borderRadius: 3 }} />
            <span style={{ fontSize: nameSize, fontWeight: 400, color: nameColor }}>{s.name}</span>
            <span style={{ fontSize: pctSize, fontWeight: 700, color: pctColor, marginLeft: 12 }}>{s.pct}%</span>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t7-04 双线条迷你折线图 ---------------- */
export const T7_04: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const titleSize = useConfigKey('t7-04', 'titleSize') as number;
  const titleText = useConfigKey('t7-04', 'titleText') as string;
  const xLabelSize = useConfigKey('t7-04', 'subSize') as number;
  const legendSize = useConfigKey('t7-04', 'legendSize') as number;
  const legendColor = useConfigKey('t7-04', 'legendColor') as string;
  const rawLines = useConfigList('t7-04', 'lines') as { name: string; color: string; data: string }[];
  // 解析每组折线数据为数值数组（逗号分隔）
  const lines = rawLines.map((l) => ({
    name: l.name || '折线',
    color: l.color || '#4CC9F0',
    data: String(l.data ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((v) => !Number.isNaN(v)),
  })).filter((l) => l.data.length > 0);
  const xlText = useConfigKey('t7-04', 'xlText') as string;
  const xLabelColor = useConfigKey('t7-04', 'xLabelColor') as string;
  // 横轴标签：单行逗号分隔，数量与数据点对齐（取对应索引，缺失则留空）
  const xLabels = String(xlText ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const canvasW = 520, canvasH = 200, canvasX = 0, canvasY = titleSize + 56;
  // 自动计算 Y 轴上下限：底部锚定 0（不出现 0 轴以下），顶部仅比数据最大值多 10% 余量，保证曲线完整铺满
  const allVals = lines.flatMap((l) => l.data);
  const dMax = allVals.length > 0 ? Math.max(...allVals) : 100;
  const low = 0;
  const high = Math.max(dMax, 1) * 1.1;
  const ySpan = Math.max(high - low, 1);
  // 以数据最长的折线确定采样点数，其余折线按自身数据长度映射
  const maxPts = Math.max(...lines.map((l) => l.data.length), 2);
  const nSlots = Math.max(maxPts - 1, 1);
  // 绘图区上下留白（SVG内部坐标系，SVG自身已定位在 canvasY）：顶部24px、底部52px，保证曲线与横轴文字之间留出安全间距
  const plotTop = 24;
  const plotBottom = canvasH - 52;
  const pt = (v: number, i: number) => ({
    x: canvasX + (canvasW / nSlots) * i,
    y: plotBottom - ((Math.min(Math.max(v, low), high) - low) / ySpan) * (plotBottom - plotTop),
  });
  const allPaths = lines.map((l) => l.data.map((v, i) => pt(v, i)));
  // 计算每条折线的实际路径长度，用于正确的从左到右描线动画
  const lineLen = (pts: { x: number; y: number }[]) =>
    pts.reduce((s, p, i) => (i === 0 ? 0 : s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y)), 0);
  const pathLens = allPaths.map(lineLen);
  const drawAll = useGrow(frame, 24, 40);
  const legendO = useEnterOpacity(frame, 18);
  const posX = (useConfigKey('t7-04', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t7-04', 'posY') as number) ?? 260;
  const configScale = (useConfigKey('t7-04', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${configScale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={COLORS.textPrimary} text={titleText as string}
        opacity={title.opacity} translateY={title.translateY} />
      {/* 图例：置于标题正下方，保持合理间距，避免与标题文案重叠 */}
      <div style={{ position: 'absolute', left: 0, top: titleSize + 28, whiteSpace: 'nowrap', opacity: legendO }}>
        {lines.map((l, i) => (
          <span key={i} style={{ marginRight: i === lines.length - 1 ? 0 : 24 }}>
            <span style={{ display: 'inline-block', width: 14, height: 14, background: l.color, verticalAlign: 'middle', marginRight: 6 }} />
            <span style={{ fontSize: legendSize, color: legendColor }}>{l.name}</span>
          </span>
        ))}
      </div>
      <svg width={canvasW} height={canvasH} style={{ position: 'absolute', left: canvasX, top: canvasY, overflow: 'visible' }}>
        {allPaths.map((pts, l) => {
          const color = lines[l].color;
          const len = pathLens[l] || 1;
          const d = `M ${pts[0].x} ${pts[0].y}` + pts.slice(1).map((p) => ` L ${p.x} ${p.y}`).join('');
          return (
            <path key={l} d={d} fill="none" stroke={color} strokeWidth={4}
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={len} strokeDashoffset={len - len * drawAll} opacity={0.9} />
          );
        })}
        {allPaths.map((pts, l) =>
          pts.map((p, i) => {
            const o = useEnterOpacity(frame, 30 + i * 10 + l * 6);
            const color = lines[l].color;
            return <circle key={`${l}-${i}`} cx={p.x} cy={p.y} r={7} fill={color} opacity={o} style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' }} />;
          }),
        )}
      </svg>
      {Array.from({ length: maxPts }).map((_, i) => {
        const o = useEnterOpacity(frame, 40 + i * 8);
        const lb = xLabels[i] ?? '';
        return (
          <div key={i} style={{ position: 'absolute', left: (canvasW / nSlots) * i - 30, top: canvasY + canvasH + 8, width: 60, textAlign: 'center', fontSize: xLabelSize, fontWeight: 400, color: xLabelColor, opacity: o, whiteSpace: 'nowrap' }}>{lb}</div>
        );
      })}
    </div>
  );
};

/* ---------------- t7-05 双卡片指标快照组件 ---------------- */
export const T7_05: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const titleSize = useConfigKey('t7-05', 'titleSize') as number;
  const titleText = useConfigKey('t7-05', 'titleText') as string;
  const nameSize = useConfigKey('t7-05', 'nameSize') as number;
  const nameColor = useConfigKey('t7-05', 'nameColor') as string;
  const valSize = useConfigKey('t7-05', 'valSize') as number;
  const valColor = useConfigKey('t7-05', 'valColor') as string;
  const deltaSize = useConfigKey('t7-05', 'deltaSize') as number;
  const upColor = useConfigKey('t7-05', 'upColor') as string;
  const downColor = useConfigKey('t7-05', 'downColor') as string;
  const cards = useConfigList('t7-05', 'cards') as { name: string; val: string; delta: string; dir: string }[];
  const cardO = useBreath(frame, 1, 1, 0.02);
  const listTop = titleSize + 56;
  const posX = (useConfigKey('t7-05', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t7-05', 'posY') as number) ?? 240;
  const configScale = (useConfigKey('t7-05', 'scale') as number) ?? 100;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${configScale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={COLORS.textPrimary} text={titleText as string}
        opacity={title.opacity} translateY={title.translateY} />
      {cards.map((c, i) => {
        const d = atFrames(c, i, 18, 16);
        const o = useEnter(frame, d, 30, 0);
        const valP = 0.9 + 0.1 * i;
        const deltaB = useBreath(frame, 1, 1, 0.08);
        const m = String(c.val).match(/^([\d.]+)(.*)$/);
        const target = m ? Number(m[1]) : NaN;
        const suffix = m ? m[2] : '';
        const decimals = m && m[1].includes('.') ? m[1].split('.')[1].length : 0;
        const p = Number.isFinite(target)
          ? interpolate(frame, [d + 8, d + 42], [0, 1], {
              easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            })
          : 1;
        const displayVal = Number.isFinite(target) ? (target * p).toFixed(decimals) + suffix : String(c.val);
        const deltaColor = c.dir === 'up' ? upColor : downColor;
        return (
          <div key={i} style={{
            position: 'absolute', left: i * (270 + 30), top: listTop, width: 270,
            padding: '24px 20px', borderRadius: 12, background: `rgba(255,255,255,${0.08 * cardO})`,
            opacity: o.opacity, transform: `scale(${o.scale})`, whiteSpace: 'nowrap',
          }}>
            <div style={{ fontSize: nameSize, fontWeight: 400, color: nameColor }}>{c.name}</div>
            <div style={{ fontSize: valSize, fontWeight: 900, color: valColor, marginTop: 8, opacity: valP }}>{displayVal}</div>
            <div style={{ fontSize: deltaSize, fontWeight: 700, marginTop: 6, color: deltaColor, opacity: 0.85 * deltaB }}>{c.delta}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t7-06 半环形占比仪表盘 ---------------- */
export const T7_06: React.FC = () => {
  const frame = useCurrentFrame();
  const percent = useConfigKey('t7-06', 'percent') as number;
  const labelText = useConfigKey('t7-06', 'labelText') as string;
  const trackColor = useConfigKey('t7-06', 'trackColor') as string;
  const arcColor = useConfigKey('t7-06', 'arcColor') as string;
  const numSize = useConfigKey('t7-06', 'numSize') as number;
  const numColor = useConfigKey('t7-06', 'numColor') as string;
  const labelSize = useConfigKey('t7-06', 'labelSize') as number;
  const labelColor = useConfigKey('t7-06', 'labelColor') as string;
  const sliderFill = useConfigKey('t7-06', 'sliderFill') as string;
  const glowColor = useConfigKey('t7-06', 'glowColor') as string;
  const radius = useConfigKey('t7-06', 'radius') as number;
  const strokeW = useConfigKey('t7-06', 'strokeW') as number;
  const scale = useConfigKey('t7-06', 'scale') as number;
  const posX = (useConfigKey('t7-06', 'posX') as number) ?? 60;
  const posY = (useConfigKey('t7-06', 'posY') as number) ?? 220;

  // 设计稿坐标（1920×1080，整体缩放到左右安全区）
  const cx = 960, cy = 440;
  const p = percent / 100;
  // 进度弧生长 950ms（帧10→38），端点滑块同步跟随
  const prog = interpolate(frame, [10, 38], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 底轨淡入
  const trackO = interpolate(frame, [0, 16], [0, 0.42], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 大数字数值随弧生长同步滚动（0→percent），淡入提前到弧开始生长
  const numV = interpolate(frame, [10, 38], [0, percent], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const numS = interpolate(frame, [10, 25], [0.85, 1], { easing: Easing.out(Easing.back(1.6)), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const numO = interpolate(frame, [10, 22], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 标签在弧长结束后淡入
  const labelO = interpolate(frame, [40, 55], [0, 0.8], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 端点滑块外圈光晕呼吸：透明度 0.35~0.55，周期 1250ms(37.5帧)
  const glowO = 0.35 + 0.20 * (0.5 + 0.5 * Math.sin((frame / 37.5) * Math.PI * 2));

  // SVG 半圆（开口朝下）：左端 A → 上拱顶 → 右端 B
  const lineHalf = strokeW / 2;
  const svgPad = lineHalf + 30;                       // 视口留白（含线宽与光晕）
  const svgLeft = cx - radius - svgPad, svgTop = cy - radius - svgPad;
  const svgW = (radius + svgPad) * 2, svgH = (radius + svgPad) * 2;
  // 半圆弧路径（SVG 内部坐标）：左端 (pad, radius+pad) → 右端 (2*radius+pad, radius+pad)
  const ax = svgPad, ay = radius + svgPad, bx = 2 * radius + svgPad, by = radius + svgPad;
  const arcD = `M ${ax} ${ay} A ${radius} ${radius} 0 0 1 ${bx} ${by}`;
  // 进度弧按 pathLength=100 归一化，dashoffset 从 100 减到 100*(1-p)
  const dash = 100 - 100 * p * prog;
  // 端点滑块位置：θ = 180° + p*prog*180°（弧度 π→2π，沿上弧）
  const theta = Math.PI + p * prog * Math.PI;
  const sx = cx + radius * Math.cos(theta);
  const sy = cy + radius * Math.sin(theta);
  const sliderR = 24;

  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transform: `scale(${scale / 100})`, transformOrigin: 'top left' }}>
      {/* 底层灰色半圆弧轨道 + 蓝色进度弧（同圆心同半径） */}
      <svg style={{ position: 'absolute', left: svgLeft, top: svgTop, width: svgW, height: svgH, overflow: 'visible' }}>
        <path d={arcD} fill="none" stroke={trackColor} strokeWidth={strokeW} strokeLinecap="round"
          pathLength={100} strokeDasharray="100" strokeDashoffset={0} opacity={trackO} />
        <path d={arcD} fill="none" stroke={arcColor} strokeWidth={strokeW} strokeLinecap="round"
          pathLength={100} strokeDasharray="100" strokeDashoffset={dash} opacity={0.94} />
      </svg>
      {/* 进度端点圆点滑块（双层：外圈光晕 + 内层填充） */}
      <div style={{ position: 'absolute', left: sx - sliderR, top: sy - sliderR, width: sliderR * 2, height: sliderR * 2, opacity: prog }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: glowColor, filter: 'blur(16px)', opacity: glowO }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: sliderFill }} />
      </div>
      {/* 中心大数字（百分比，随弧生长滚动） */}
      <div style={{
        position: 'absolute', left: cx, top: cy - 90, transform: `translate(-50%, -50%) scale(${numS})`,
        fontSize: numSize, fontWeight: 700, color: numColor, opacity: numO, lineHeight: 1,
        textShadow: '0 3px 10px rgba(0,0,0,0.45)', whiteSpace: 'nowrap',
      }}>{Math.round(numV)}%</div>
      {/* 中心下方小字标签 */}
      <div style={{
        position: 'absolute', left: cx, top: cy + 60, transform: 'translateX(-50%)',
        fontSize: labelSize, fontWeight: 400, color: labelColor, opacity: labelO, lineHeight: 1,
        letterSpacing: 2, whiteSpace: 'nowrap',
      }}>{labelText}</div>
    </div>
  );
};