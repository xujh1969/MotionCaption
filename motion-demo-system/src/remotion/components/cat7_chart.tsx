import React from 'react';
import { Easing, useCurrentFrame, interpolate } from 'remotion';
import { COLORS, FONT_STACK } from '../theme';
import { useEnter, useEnterOpacity, useBreath, useCount, useGrow, easeOutExpo, atFrames } from '../anim';
import { useConfigKey, useConfigList } from '../config';
import { weightNum, measureText } from '../measure';
import { tint, shadeHex, renderKeyParts, withAlpha, stripKeyText, WrappedText } from './shared';

const base: React.CSSProperties = { position: 'absolute', fontFamily: FONT_STACK, whiteSpace: 'nowrap' };
const T: React.FC<{ x: number; y: number; size: number; weight?: 'Heavy' | 'Bold' | 'Regular';
  color: string; text: string; opacity?: number; translateY?: number;
  /** 重点文字颜色：文本含 {{重点}} 标记时用该色绘制重点片段。 */
  hl?: string }> = ({
  x, y, size, weight = 'Heavy', color, text, opacity = 1, translateY = 0, hl }) => (
  <div style={{ ...base, left: x, top: y, fontSize: size, fontWeight: weightNum(weight), color,
    opacity, transform: `translateY(${translateY}px)`, textShadow: '0 3px 12px rgba(0,0,0,0.45)' }}>
    {renderKeyParts(text, hl)}
  </div>
);

/* ---------------- t7-01 4柱竖向迷你柱状图 ---------------- */
export const T7_01: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const data = useConfigList('t7-01', 'items');
  const titleSize = useConfigKey('t7-01', 'titleSize') as number;
  const titleText = useConfigKey('t7-01', 'titleText') as string;
  const hl = useConfigKey('t7-01', 'hlColor') as string;
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
        opacity={title.opacity} translateY={title.translateY} hl={hl} />
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
  const hl = useConfigKey('t7-02', 'hlColor') as string;
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
        opacity={title.opacity} translateY={title.translateY} hl={hl} />
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
  const hl = useConfigKey('t7-03', 'hlColor') as string;
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
        opacity={title.opacity} translateY={title.translateY} hl={hl} />
      {/* 每段弧各自包一层容器：导出重绘器对同一父元素下的多个 SVG 图形只渲染第一个 */}
      {segs.map((s, i) => {
        const offset = acc;
        acc += s.pct;
        const visible = s.pct * total;
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: top, width: svgSize, height: svgSize, transform: 'rotate(-90deg)', opacity: 0.9 * barB }}>
            <svg width={svgSize} height={svgSize}>
              <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={s.color} strokeWidth={outerR - innerR}
                strokeDasharray={`${(visible / 100) * C} ${C}`}
                strokeDashoffset={(-offset / 100) * C}
                style={{ filter: `drop-shadow(0 0 6px ${s.color})` }}
              />
            </svg>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: cx - 70, top: top + cy - 60, width: 140, textAlign: 'center', opacity: centerO }}>
        <div style={{ fontSize: centerNumSize, fontWeight: 900, color: COLORS.textPrimary }}>{centerNum}%</div>
        <div style={{ fontSize: centerSize, fontWeight: 400, color: centerColor, marginTop: 6, opacity: subO }}>{renderKeyParts(centerText as string, hl)}</div>
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
  const hl = useConfigKey('t7-04', 'hlColor') as string;
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
        opacity={title.opacity} translateY={title.translateY} hl={hl} />
      {/* 图例：置于标题正下方，保持合理间距，避免与标题文案重叠 */}
      <div style={{ position: 'absolute', left: 0, top: titleSize + 28, whiteSpace: 'nowrap', opacity: legendO }}>
        {lines.map((l, i) => (
          <span key={i} style={{ marginRight: i === lines.length - 1 ? 0 : 24 }}>
            <span style={{ display: 'inline-block', width: 14, height: 14, background: l.color, verticalAlign: 'middle', marginRight: 6 }} />
            <span style={{ fontSize: legendSize, color: legendColor }}>{l.name}</span>
          </span>
        ))}
      </div>
      {/* 每条折线、每个数据点各自包一层容器：导出重绘器对同一父元素下的多个 SVG 图形只渲染第一个 */}
      {allPaths.map((pts, l) => {
        const color = lines[l].color;
        const len = pathLens[l] || 1;
        const d = `M ${pts[0].x} ${pts[0].y}` + pts.slice(1).map((p) => ` L ${p.x} ${p.y}`).join('');
        return (
          <div key={l} style={{ position: 'absolute', left: canvasX, top: canvasY, width: canvasW, height: canvasH }}>
            <svg width={canvasW} height={canvasH} style={{ overflow: 'visible' }}>
              <path d={d} fill="none" stroke={color} strokeWidth={4}
                strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={len} strokeDashoffset={len - len * drawAll} opacity={0.9} />
            </svg>
          </div>
        );
      })}
      {allPaths.map((pts, l) =>
        pts.map((p, i) => {
          const o = useEnterOpacity(frame, 30 + i * 10 + l * 6);
          const color = lines[l].color;
          return (
            <div key={`${l}-${i}`} style={{ position: 'absolute', left: canvasX, top: canvasY, width: canvasW, height: canvasH }}>
              <svg width={canvasW} height={canvasH} style={{ overflow: 'visible' }}>
                <circle cx={p.x} cy={p.y} r={7} fill={color} opacity={o} style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' }} />
              </svg>
            </div>
          );
        }),
      )}
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
  const hl = useConfigKey('t7-05', 'hlColor') as string;
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
        opacity={title.opacity} translateY={title.translateY} hl={hl} />
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
  const hl = useConfigKey('t7-06', 'hlColor') as string;
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
      {/* 底层灰色半圆弧轨道 + 蓝色进度弧（同圆心同半径）。
          导出重绘器对同一父元素下的多个 SVG 图形只渲染第一个，因此每条弧各自包一层容器。 */}
      <div style={{ position: 'absolute', left: svgLeft, top: svgTop, width: svgW, height: svgH, overflow: 'visible' }}>
        <svg width={svgW} height={svgH} style={{ overflow: 'visible' }}>
          <path d={arcD} fill="none" stroke={trackColor} strokeWidth={strokeW} strokeLinecap="round"
            pathLength={100} strokeDasharray="100" strokeDashoffset={0} opacity={trackO} />
        </svg>
      </div>
      <div style={{ position: 'absolute', left: svgLeft, top: svgTop, width: svgW, height: svgH, overflow: 'visible' }}>
        <svg width={svgW} height={svgH} style={{ overflow: 'visible' }}>
          <path d={arcD} fill="none" stroke={arcColor} strokeWidth={strokeW} strokeLinecap="round"
            pathLength={100} strokeDasharray="100" strokeDashoffset={dash} opacity={0.94} />
        </svg>
      </div>
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
      }}>{renderKeyParts(labelText, hl)}</div>
    </div>
  );
};

/* ---------------- t7-12 漏斗转化图表（分层梯形·两侧标注·用户图标飘落） ---------------- */
export const T7_12: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = useConfigList('t7-12', 'layers') as {
    innerText?: string; leftLabel?: string; rightTitle?: string; rightDesc?: string;
    color?: string; at?: string;
  }[];
  const layers = raw.length > 0 ? raw : [{
    innerText: '有效触达', leftLabel: '阶段一', rightTitle: '认知扩圈',
    rightDesc: '场景内容与达人测评覆盖目标人群。',
  }];
  const funnelW = useConfigKey('t7-12', 'funnelW') as number;
  const layerH = useConfigKey('t7-12', 'layerH') as number;
  const layerGap = useConfigKey('t7-12', 'layerGap') as number;
  const taper = useConfigKey('t7-12', 'taper') as number;
  const colorA = useConfigKey('t7-12', 'colorA') as string;
  const colorB = useConfigKey('t7-12', 'colorB') as string;
  const innerSize = useConfigKey('t7-12', 'innerSize') as number;
  const leftSize = useConfigKey('t7-12', 'leftSize') as number;
  const titleSize = useConfigKey('t7-12', 'titleSize') as number;
  const descSize = useConfigKey('t7-12', 'descSize') as number;
  const titleColor = useConfigKey('t7-12', 'titleColor') as string;
  const descColor = useConfigKey('t7-12', 'descColor') as string;
  const leftWidth = useConfigKey('t7-12', 'leftWidth') as number;
  const rightWidth = useConfigKey('t7-12', 'rightWidth') as number;
  const sideGap = useConfigKey('t7-12', 'sideGap') as number;
  const growMs = useConfigKey('t7-12', 'growMs') as number;
  const fallMs = useConfigKey('t7-12', 'fallMs') as number;
  const iconCount = Math.max(0, Math.round(useConfigKey('t7-12', 'iconCount') as number));
  const iconColor = useConfigKey('t7-12', 'iconColor') as string;
  const scale = useConfigKey('t7-12', 'scale') as number;
  const posX = (useConfigKey('t7-12', 'posX') as number) ?? 160;
  const posY = (useConfigKey('t7-12', 'posY') as number) ?? 120;

  const n = layers.length;
  const growFrames = Math.max(8, Math.round((growMs / 1000) * 30));
  const fallFrames = Math.max(12, Math.round((fallMs / 1000) * 30));
  // 每层宽度：顶层 funnelW，逐层 × taper 收窄（漏斗上宽下窄）
  const widths = layers.map((_, i) => funnelW * Math.pow(taper, i));
  // 圆台造型：顶/底各有一个扁椭圆（纵向半径 eH 全组件统一，保证层距均匀）
  const eH = Math.max(8, Math.round(funnelW * 0.05));
  const pitch = layerH + 2 * eH + layerGap;
  const layerY = (i: number) => i * pitch;
  const leftCapW = Math.max(90, leftWidth - 70);
  const cx = leftWidth + sideGap + funnelW / 2;   // 漏斗中心线（组件内 X）
  const dotX = cx + funnelW / 2 + sideGap;        // 右侧圆点固定列（右列对齐不随层宽漂移）
  const clampOpt = { easing: easeOutExpo, extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

  // 各层入场帧（at 秒优先，缺省均摊）
  const arrives = layers.map((it, i) => atFrames(it, i, 8, 12));
  // 当前层 = 最后一个已完成生长的层（发光增强到 0.45）
  let activeIdx = -1;
  for (let i = 0; i < n; i += 1) if (frame >= arrives[i] + growFrames) activeIdx = i;
  const pulse = 0.5 + 0.5 * Math.sin((frame / 45) * Math.PI * 2);

  // 用户图标：从漏斗上口上方飘落汇入，错开依次落下，落入口部后消失
  const d0 = arrives[0] ?? 8;
  const icons = Array.from({ length: iconCount }, (_, k) => {
    const start = d0 + (k * fallFrames) / Math.max(1, iconCount);
    const p = interpolate(frame, [start, start + fallFrames], [0, 1], clampOpt);
    const o = p < 0.72 ? 1 : Math.max(0, 1 - (p - 0.72) / 0.28);
    const jitter = (k % 2 === 0 ? -1 : 1) * (8 + k * 7);
    return { key: `u${k}`, x: cx + jitter, y: -84 * (1 - p), o };
  });

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT_STACK,
    }}>
      {/* 用户图标（纯 div 拼装：圆头 + 圆顶肩，避开 SVG 多图形限制） */}
      {icons.map((ic) => (
        <div key={ic.key} style={{
          position: 'absolute', left: ic.x - 19, top: ic.y, width: 38, height: 40, opacity: ic.o * 0.9,
        }}>
          <div style={{ position: 'absolute', left: 10, top: 0, width: 18, height: 18, borderRadius: '50%', background: iconColor }} />
          <div style={{ position: 'absolute', left: 1, top: 22, width: 36, height: 18, borderRadius: '18px 18px 4px 4px', background: iconColor }} />
        </div>
      ))}
      {layers.map((it, i) => {
        const d = arrives[i];
        const w = widths[i];
        const wNext = i + 1 < n ? widths[i + 1] : w * taper;
        const yTop = layerY(i);
        const ly = yTop + eH + layerH / 2;
        const colorRaw = stripKeyText(it.color ?? '');
        const fill = colorRaw.length > 0 ? colorRaw : (i % 2 === 0 ? colorA : colorB);
        const grow = interpolate(frame, [d, d + growFrames], [0, 1], clampOpt);
        const sx = 0.6 + 0.4 * grow;   // 由窄扩宽
        const glowA = frame < d + growFrames || i === activeIdx ? 0.45 : 0.2 + 0.15 * pulse;
        // 层内文字 / 左标注 / 右标注依次淡入
        const pIn = interpolate(frame, [d + growFrames * 0.5, d + growFrames * 0.5 + 10], [0, 1], clampOpt);
        const pLeft = interpolate(frame, [d + growFrames * 0.7, d + growFrames * 0.7 + 10], [0, 1], clampOpt);
        const pDot = interpolate(frame, [d + growFrames * 0.8, d + growFrames * 0.8 + 8], [0, 1], clampOpt);
        const pTitle = interpolate(frame, [d + growFrames * 0.9, d + growFrames * 0.9 + 10], [0, 1], clampOpt);
        const pDesc = interpolate(frame, [d + growFrames, d + growFrames + 12], [0, 1], clampOpt);
        // 梯形（SVG polygon，包围盒 = 上边宽 × 层高）：上边 w、下边 wNext
        const svgH = layerH + 2 * eH;
        const points = `0,${eH} ${w},${eH} ${(w + wNext) / 2},${eH + layerH} ${(w - wNext) / 2},${eH + layerH}`;
        const x0 = cx - w / 2;
        const lineW = Math.max(0, dotX - (cx + w / 2) - 8);
        // 右侧文本块高度（标题 + 说明实际行数），按层中心垂直居中，避免与相邻层文字重叠
        const descLines = Math.max(1, Math.ceil(measureText(stripKeyText(it.rightDesc ?? ''), descSize, 'Regular') / Math.max(80, rightWidth - 24)));
        const blockH = titleSize * 1.15 + 12 + descLines * descSize * 1.4;
        return (
          <React.Fragment key={`f${i}`}>
            {/* 左侧阶段胶囊 + 引线 */}
            <div style={{
              position: 'absolute', left: 0, top: ly - 22, width: leftCapW, height: 44,
              borderRadius: 40, background: 'rgba(20,20,30,0.75)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', opacity: pLeft,
            }}>
              <span style={{ fontSize: leftSize, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
                {stripKeyText(it.leftLabel ?? '')}
              </span>
            </div>
            <div style={{
              position: 'absolute', left: leftCapW + 4, top: ly,
              width: Math.max(0, cx - w / 2 - leftCapW - 8), height: 1,
              background: 'rgba(255,255,255,0.3)', opacity: pLeft,
            }} />
            {/* 漏斗层（圆台：底面暗椭圆 + 侧面梯形 + 顶面亮椭圆，生长 = 由窄扩宽 + 向下展开） */}
            <div style={{ position: 'absolute', left: x0, top: yTop, width: w, height: svgH, opacity: grow }}>
              <div style={{ position: 'absolute', inset: 0, transform: `scale(${sx.toFixed(3)}, ${grow.toFixed(3)})`, transformOrigin: '50% 0' }}>
                <svg width={w} height={svgH} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
                  <ellipse cx={w / 2} cy={eH + layerH} rx={wNext / 2} ry={eH} fill={shadeHex(fill, 0.35)} />
                </svg>
                <svg width={w} height={svgH} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: `drop-shadow(0 0 14px ${withAlpha(fill, glowA)})` }}>
                  <polygon points={points} fill={fill} opacity={0.72} />
                </svg>
                <svg width={w} height={svgH} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
                  <ellipse cx={w / 2} cy={eH} rx={w / 2} ry={eH} fill={tint(fill, 0.28)} />
                </svg>
              </div>
              <div style={{
                position: 'absolute', left: 0, top: eH, width: w, height: layerH, display: 'flex',
                alignItems: 'center', justifyContent: 'center', opacity: pIn,
              }}>
                <span style={{
                  fontSize: innerSize, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap',
                  textShadow: '0 2px 6px rgba(0,0,0,0.35)',
                }}>{stripKeyText(it.innerText ?? '')}</span>
              </div>
            </div>
            {/* 右侧圆点 + 标题 + 说明 */}
            <div style={{
              position: 'absolute', left: cx + w / 2 + 4, top: ly, width: lineW, height: 1,
              background: 'rgba(255,255,255,0.3)', opacity: pDot,
            }} />
            <div style={{
              position: 'absolute', left: dotX, top: ly - 4, width: 8, height: 8, borderRadius: '50%',
              background: fill, boxShadow: `0 0 8px ${withAlpha(fill, 0.4)}`, opacity: pDot,
            }} />
            <div style={{ position: 'absolute', left: dotX + 20, top: ly - blockH / 2, width: rightWidth - 20 }}>
              <div style={{
                fontSize: titleSize, fontWeight: 700, color: titleColor, lineHeight: 1.15,
                whiteSpace: 'nowrap', textShadow: '0 2px 6px rgba(0,0,0,0.35)', opacity: pTitle,
              }}>{stripKeyText(it.rightTitle ?? '')}</div>
              <div style={{ marginTop: 12, opacity: pDesc }}>
                <WrappedText
                  text={it.rightDesc ?? ''} size={descSize} maxWidth={rightWidth - 24} baseWeight="Regular" lineHeight={1.4}
                  style={{ fontSize: descSize, color: withAlpha(descColor, 0.7), textShadow: '0 2px 6px rgba(0,0,0,0.35)' }}
                />
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};