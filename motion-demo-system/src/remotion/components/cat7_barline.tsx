import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { FONT, itemProgress, panelBox } from './cardKit';
import { easeOutExpo } from '../anim';
import { useConfigKey, useConfigList } from '../config';

/**
 * t7-07 横向分组条形图（A/B 双序列，逐类生长 + 单次斜向扫光）
 * t7-08 折线趋势图（折线从左向右生长，数据点依次点亮，光点沿折线循环移动）
 */
const DIM = 0.18;

/** 图表容器渐亮：初始 0.18，开场 12 帧内点亮到 1.0 */
function containerOpacity(frame: number, delay = 0): number {
  const p = interpolate(frame, [delay, delay + 12], [0, 1], {
    easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return DIM + (1 - DIM) * p;
}

/* ---------------- t7-07 横向分组条形图 ---------------- */
export const T7_07: React.FC = () => {
  const frame = useCurrentFrame();
  const data = useConfigList('t7-07', 'items') as {
    category?: string; valA?: string; valB?: string; at?: string;
  }[];
  const rows = data.length > 0
    ? data
    : [
      { category: '模型A', valA: '82', valB: '64' },
      { category: '模型B', valA: '91', valB: '76' },
      { category: '模型C', valA: '77', valB: '88' },
    ];
  const W = useConfigKey('t7-07', 'boxW') as number;
  const H = useConfigKey('t7-07', 'boxH') as number;
  const radius = useConfigKey('t7-07', 'radius') as number;
  const bg = useConfigKey('t7-07', 'boxBg') as string;
  const borderW = useConfigKey('t7-07', 'borderW') as number;
  const borderColor = useConfigKey('t7-07', 'borderColor') as string;
  const barW = useConfigKey('t7-07', 'barW') as number;
  const barGap = useConfigKey('t7-07', 'barGap') as number;
  const barRadius = useConfigKey('t7-07', 'barRadius') as number;
  const colorA = useConfigKey('t7-07', 'colorA') as string;
  const colorB = useConfigKey('t7-07', 'colorB') as string;
  const labelSize = useConfigKey('t7-07', 'labelSize') as number;
  const labelColor = useConfigKey('t7-07', 'labelColor') as string;
  const tickSize = useConfigKey('t7-07', 'tickSize') as number;
  const tickColor = useConfigKey('t7-07', 'tickColor') as string;
  const legendSize = useConfigKey('t7-07', 'legendSize') as number;
  const legendA = useConfigKey('t7-07', 'legendA') as string;
  const legendB = useConfigKey('t7-07', 'legendB') as string;
  const growMs = useConfigKey('t7-07', 'growMs') as number;
  const gridColor = useConfigKey('t7-07', 'gridColor') as string;
  const scale = useConfigKey('t7-07', 'scale') as number;
  const posX = (useConfigKey('t7-07', 'posX') as number) ?? 140;
  const posY = (useConfigKey('t7-07', 'posY') as number) ?? 580;

  const growFrames = Math.max(6, Math.round((growMs / 1000) * 30));
  const padX = 26, padTop = 46, padBottom = 46, axisW = 54;
  const plotX = padX + axisW;
  const plotW = Math.max(60, W - padX * 2 - axisW);
  const plotH = Math.max(40, H - padTop - padBottom);
  const values = rows.flatMap((r) => [Number(r.valA), Number(r.valB)]).filter((n) => Number.isFinite(n));
  const maxV = Math.max(1, ...values) * 1.15;
  const n = rows.length;
  const slot = plotW / n;
  const groupW = barW * 2 + barGap;

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      <div style={{ ...panelBox(W, H, radius, borderW, borderColor, bg, 1, 0.3, 14), opacity: containerOpacity(frame) }}>
        {/* 图例 */}
        <div style={{
          position: 'absolute', right: padX, top: 14, display: 'flex', alignItems: 'center',
          gap: 18, fontSize: legendSize, fontWeight: 700, color: labelColor,
        }}>
          {[[colorA, legendA], [colorB, legendB]].map(([c, t], k) => (
            <span key={`l${k}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: legendSize * 0.7, height: legendSize * 0.7, borderRadius: 3, background: c as string,
              }} />
              {t as string}
            </span>
          ))}
        </div>
        {/* Y 轴刻度与网格 */}
        {[0, 1, 2, 3, 4].map((k) => {
          const v = (maxV * k) / 4;
          const y = padTop + plotH - (plotH * k) / 4;
          return (
            <React.Fragment key={`g${k}`}>
              <div style={{
                position: 'absolute', left: plotX, top: y, width: plotW, height: 1,
                background: gridColor,
              }} />
              <div style={{
                position: 'absolute', left: padX, top: y - tickSize * 0.6, width: axisW - 10,
                textAlign: 'right', fontSize: tickSize, color: tickColor, fontWeight: 400,
              }}>{Math.round(v)}</div>
            </React.Fragment>
          );
        })}
        {/* 分组条形 */}
        {rows.map((r, i) => {
          const p = itemProgress(frame, r, i, 10, 36, growFrames);
          const sweep = interpolate(frame, [growFrames, growFrames + 22], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          const x0 = plotX + slot * i + (slot - groupW) / 2;
          const base = padTop + plotH;
          const bar = (val: number, color: string, x: number, key: string) => {
            const h = Math.max(0, (Number.isFinite(val) ? val : 0) / maxV) * plotH * p;
            return (
              <div key={key} style={{
                position: 'absolute', left: x, top: base - h, width: barW, height: h,
                borderTopLeftRadius: barRadius, borderTopRightRadius: barRadius,
                background: color, overflow: 'hidden',
                boxShadow: p > 0 ? `0 0 ${(10 * p).toFixed(1)}px ${color}` : 'none',
              }}>
                <div style={{
                  position: 'absolute', left: '-60%', width: '220%', height: '40%',
                  top: `${120 - sweep * 180}%`,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)',
                  opacity: sweep > 0 && sweep < 1 ? 0.9 : 0,
                }} />
              </div>
            );
          };
          return (
            <React.Fragment key={`c${i}`}>
              {bar(Number(r.valA), colorA, x0, 'a')}
              {bar(Number(r.valB), colorB, x0 + barW + barGap, 'b')}
              <div style={{
                position: 'absolute', left: plotX + slot * i, top: padTop + plotH + 10,
                width: slot, textAlign: 'center', fontSize: labelSize, fontWeight: 700,
                color: labelColor, opacity: 0.35 + 0.65 * p, whiteSpace: 'nowrap',
              }}>{r.category ?? ''}</div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- t7-08 折线趋势图 ---------------- */
export const T7_08: React.FC = () => {
  const frame = useCurrentFrame();
  const data = useConfigList('t7-08', 'items') as { xLabel?: string; value?: string; at?: string }[];
  const rows = data.length > 0
    ? data
    : [
      { xLabel: '第1周', value: '32' },
      { xLabel: '第2周', value: '48' },
      { xLabel: '第3周', value: '69' },
      { xLabel: '第4周', value: '84' },
    ];
  const W = useConfigKey('t7-08', 'boxW') as number;
  const H = useConfigKey('t7-08', 'boxH') as number;
  const radius = useConfigKey('t7-08', 'radius') as number;
  const bg = useConfigKey('t7-08', 'boxBg') as string;
  const borderW = useConfigKey('t7-08', 'borderW') as number;
  const borderColor = useConfigKey('t7-08', 'borderColor') as string;
  const lineW = useConfigKey('t7-08', 'lineW') as number;
  const lineColor = useConfigKey('t7-08', 'lineColor') as string;
  const pointR = useConfigKey('t7-08', 'pointR') as number;
  const areaFill = useConfigKey('t7-08', 'areaFill') as string;
  const gridColor = useConfigKey('t7-08', 'gridColor') as string;
  const tickSize = useConfigKey('t7-08', 'tickSize') as number;
  const tickColor = useConfigKey('t7-08', 'tickColor') as string;
  const drawMs = useConfigKey('t7-08', 'drawMs') as number;
  const staggerMs = useConfigKey('t7-08', 'staggerMs') as number;
  const breathMs = useConfigKey('t7-08', 'breathMs') as number;
  const scale = useConfigKey('t7-08', 'scale') as number;
  const posX = (useConfigKey('t7-08', 'posX') as number) ?? 140;
  const posY = (useConfigKey('t7-08', 'posY') as number) ?? 580;

  const drawFrames = Math.max(6, Math.round((drawMs / 1000) * 30));
  const stagger = Math.max(1, Math.round((staggerMs / 1000) * 30));
  const cycle = Math.max(10, Math.round((breathMs / 1000) * 30));

  const padX = 30, padTop = 26, padBottom = 44, axisW = 46;
  const plotX = padX + axisW;
  const plotW = Math.max(60, W - padX * 2 - axisW);
  const plotH = Math.max(40, H - padTop - padBottom);
  const vals = rows.map((r) => Number(r.value));
  const maxV = Math.max(1, ...vals.filter((v) => Number.isFinite(v))) * 1.15;
  const n = rows.length;
  const pts = rows.map((r, i) => {
    const v = Number.isFinite(Number(r.value)) ? Number(r.value) : 0;
    const x = plotX + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
    const y = padTop + plotH - (v / maxV) * plotH;
    return { x, y, delay: Math.round(atDelay(r, i, stagger)) };
  });

  const firstD = pts[0]?.delay ?? 0;
  const lastD = pts[pts.length - 1]?.delay ?? 0;
  const drawP = interpolate(frame, [firstD, lastD + drawFrames], [0, 1], {
    easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${plotX},${padTop + plotH} ${line} ${pts[pts.length - 1]?.x.toFixed(1)},${padTop + plotH}`;

  // 沿折线循环移动的光点
  const segs = pts.slice(0, -1).map((p, i) => {
    const q = pts[i + 1];
    return { a: p, b: q, len: Math.hypot(q.x - p.x, q.y - p.y) };
  });
  const total = segs.reduce((s, g) => s + g.len, 0) || 1;
  const t = ((frame - (lastD + drawFrames)) % cycle) / cycle;
  let target = t * total;
  let dot = pts[0] ?? { x: plotX, y: padTop + plotH };
  for (const g of segs) {
    if (target <= g.len) {
      const k = g.len === 0 ? 0 : target / g.len;
      dot = { x: g.a.x + (g.b.x - g.a.x) * k, y: g.a.y + (g.b.y - g.a.y) * k, delay: g.a.delay };
      break;
    }
    target -= g.len;
    dot = g.b;
  }
  const showDot = drawP >= 0.999 && frame >= lastD + drawFrames;

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      <div style={{ ...panelBox(W, H, radius, borderW, borderColor, bg, 1, 0.3, 12), opacity: containerOpacity(frame) }}>
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
          {/* 网格 */}
          {[0, 1, 2, 3, 4].map((k) => (
            <line key={`g${k}`} x1={plotX} y1={padTop + (plotH * k) / 4} x2={plotX + plotW}
              y2={padTop + (plotH * k) / 4} stroke={gridColor} strokeWidth={1} strokeDasharray="6,4" />
          ))}
          {/* 面积 */}
          <polygon points={area} fill={areaFill} opacity={drawP} />
          {/* 折线（按绘制进度裁剪） */}
          <clipPath id="t708-clip">
            <rect x={plotX - 4} y={0} width={Math.max(0, plotW * drawP + 8)} height={H} />
          </clipPath>
          <polyline
            points={line} fill="none" stroke={lineColor} strokeWidth={lineW}
            strokeLinecap="round" strokeLinejoin="round" clipPath="url(#t708-clip)"
            style={{ filter: `drop-shadow(0 0 6px ${lineColor})` }}
          />
          {/* 数据点 */}
          {pts.map((p, i) => {
            const pp = interpolate(frame, [p.delay, p.delay + 10], [0, 1], {
              easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
            return (
              <circle key={`p${i}`} cx={p.x} cy={p.y} r={pointR * (0.4 + 0.6 * pp)}
                fill={lineColor} opacity={0.25 + 0.75 * pp}
                style={{ filter: pp > 0 ? `drop-shadow(0 0 8px ${lineColor})` : 'none' }} />
            );
          })}
          {/* 循环光点 */}
          {showDot && (
            <circle cx={dot.x} cy={dot.y} r={pointR * 0.85} fill="#ffffff"
              style={{ filter: `drop-shadow(0 0 10px ${lineColor})` }} />
          )}
        </svg>
        {/* X 轴标签 */}
        {pts.map((p, i) => (
          <div key={`x${i}`} style={{
            position: 'absolute', left: p.x, top: padTop + plotH + 10, transform: 'translateX(-50%)',
            fontSize: tickSize, color: tickColor, whiteSpace: 'nowrap',
          }}>{rows[i]?.xLabel ?? ''}</div>
        ))}
      </div>
    </div>
  );
};

/** 条目入场帧：at（秒）优先，缺省回退 base 10 + i*step */
function atDelay(row: { at?: string }, i: number, step: number): number {
  const raw = row.at;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n * 30;
  }
  return 10 + i * step;
}
