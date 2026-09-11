import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { FONT, itemProgress, panelBox, donutPath, polar, polygonPoints, countValue, parseNums } from './cardKit';
import { easeOutExpo, atFrames } from '../anim';
import { useConfigKey, useConfigList } from '../config';
import { renderKeyParts, WrappedText } from './shared';

/**
 * t7-09 环形占比饼图（分段按数组顺序生长 + 中心数字计数）
 * t7-10 迷你波形图（从左向右绘制，完成后持续微小波动）
 * t7-11 进度雷达图（顶点依次点亮，多边形随顶点生长闭合 + 光点绕行）
 */
const DIM = 0.18;

function containerOpacity(frame: number, delay = 0): number {
  const p = interpolate(frame, [delay, delay + 12], [0, 1], {
    easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return DIM + (1 - DIM) * p;
}

/* ---------------- t7-09 环形占比饼图 ---------------- */
export const T7_09: React.FC = () => {
  const frame = useCurrentFrame();
  const data = useConfigList('t7-09', 'items') as {
    percent?: string; color?: string; label?: string; at?: string;
  }[];
  const rows = data.length > 0
    ? data
    : [
      { percent: '45', color: '#46e0d0', label: '算力' },
      { percent: '35', color: '#6398f2', label: '存储' },
      { percent: '20', color: '#f2bc46', label: '网络' },
    ];
  const W = useConfigKey('t7-09', 'boxW') as number;
  const H = useConfigKey('t7-09', 'boxH') as number;
  const radius = useConfigKey('t7-09', 'radius') as number;
  const bg = useConfigKey('t7-09', 'boxBg') as string;
  const borderW = useConfigKey('t7-09', 'borderW') as number;
  const borderColor = useConfigKey('t7-09', 'borderColor') as string;
  const outerR = useConfigKey('t7-09', 'outerR') as number;
  const innerR = useConfigKey('t7-09', 'innerR') as number;
  const bgRing = useConfigKey('t7-09', 'bgRing') as string;
  const numSize = useConfigKey('t7-09', 'numSize') as number;
  const numColor = useConfigKey('t7-09', 'numColor') as string;
  const descSize = useConfigKey('t7-09', 'descSize') as number;
  const descColor = useConfigKey('t7-09', 'descColor') as string;
  const centerNum = useConfigKey('t7-09', 'centerNum') as number;
  const centerUnit = useConfigKey('t7-09', 'centerUnit') as string;
  const centerDesc = useConfigKey('t7-09', 'centerDesc') as string;
  const hl = useConfigKey('t7-09', 'hlColor') as string;
  const legendSize = useConfigKey('t7-09', 'legendSize') as number;
  const legendGap = (useConfigKey('t7-09', 'legendGap') as number) ?? 28;
  const segMs = useConfigKey('t7-09', 'segMs') as number;
  const countMs = useConfigKey('t7-09', 'countMs') as number;
  const scale = useConfigKey('t7-09', 'scale') as number;
  const posX = (useConfigKey('t7-09', 'posX') as number) ?? 160;
  const posY = (useConfigKey('t7-09', 'posY') as number) ?? 560;

  const segFrames = Math.max(6, Math.round((segMs / 1000) * 30));
  const countFrames = Math.max(6, Math.round((countMs / 1000) * 30));
  /** 外框高度自适应：固定 boxH 只作下限；圆环 + 图例间距 + 图例放不下时自动延展 */
  const legendBlock = legendGap + legendSize + 12;
  const HNeeded = Math.max(H, Math.ceil(16 + outerR * 2 + legendBlock));
  const cx = W / 2;
  const cy = (HNeeded - legendBlock) / 2 + 4;
  const total = rows.reduce((s, r) => s + Math.max(0, Number(r.percent) || 0), 0) || 1;

  let acc = 0;
  const segments = rows.map((r, i) => {
    const pct = Math.max(0, Number(r.percent) || 0);
    const span = (pct / total) * 360;
    const a0 = acc;
    acc += span;
    const p = itemProgress(frame, r, i, 10, 30, segFrames);
    return {
      color: r.color || '#46e0d0', label: r.label ?? '', pct, a0, a1: a0 + span * p, p,
    };
  });

  const firstDelay = atFrames(rows[0], 0, 10, 30);
  const shown = countValue(frame, Number(centerNum) || 0, firstDelay, countFrames, 0);

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      <div style={{
        ...panelBox(W, HNeeded, radius, borderW, borderColor, bg, 1, 0.3, 14),
        opacity: containerOpacity(frame), position: 'relative',
      }}>
        <svg width={W} height={HNeeded} style={{ position: 'absolute', left: 0, top: 0 }}>
          <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none"
            stroke={bgRing} strokeWidth={outerR - innerR} />
          {segments.map((s, i) => (
            <path key={`s${i}`} d={donutPath(cx, cy, outerR, innerR, s.a0, s.a1)}
              fill={s.color} opacity={0.25 + 0.75 * s.p}
              style={{ filter: s.p > 0 ? `drop-shadow(0 0 8px ${s.color})` : 'none' }} />
          ))}
        </svg>
        {/* 中心数字 + 小字说明 */}
        <div style={{
          position: 'absolute', left: 0, top: cy - numSize * 0.75, width: W, textAlign: 'center',
          display: 'flex', alignItems: 'baseline', justifyContent: 'center',
        }}>
          <span style={{ fontSize: numSize, fontWeight: 800, color: numColor, lineHeight: 1 }}>{shown}</span>
          <span style={{
            marginLeft: 4, fontSize: numSize * 0.42, fontWeight: 700, color: borderColor, lineHeight: 1,
          }}>{centerUnit}</span>
        </div>
        <WrappedText
          text={String(centerDesc ?? '')} size={descSize} maxWidth={W} baseWeight="Regular" hlColor={hl}
          style={{
            position: 'absolute', left: 0, top: cy + numSize * 0.34, width: W, textAlign: 'center',
            fontSize: descSize, color: descColor,
          }}
        />
        {/* 图例：固定在圆环下方 legendGap 处，框随内容延展 */}
        <div style={{
          position: 'absolute', left: 0, top: HNeeded - 12 - legendSize, width: W, display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 14,
          fontSize: legendSize, color: descColor,
        }}>
          {segments.map((s, i) => (
            <span key={`l${i}`} style={{
              display: 'flex', alignItems: 'center', gap: 6, opacity: 0.35 + 0.65 * s.p,
            }}>
              <span style={{
                width: legendSize * 0.6, height: legendSize * 0.6, borderRadius: '50%', background: s.color,
              }} />
              {s.label} {Math.round(s.pct)}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ---------------- t7-10 迷你波形图（HUD 风格实时波动） ---------------- */
export const T7_10: React.FC = () => {
  const frame = useCurrentFrame();
  const W = useConfigKey('t7-10', 'boxW') as number;
  const H = useConfigKey('t7-10', 'boxH') as number;
  const radius = useConfigKey('t7-10', 'radius') as number;
  const bg = useConfigKey('t7-10', 'boxBg') as string;
  const borderW = useConfigKey('t7-10', 'borderW') as number;
  const borderColor = useConfigKey('t7-10', 'borderColor') as string;
  const waveW = useConfigKey('t7-10', 'waveW') as number;
  const waveColor = useConfigKey('t7-10', 'waveColor') as string;
  const areaFill = useConfigKey('t7-10', 'areaFill') as string;
  const gridColor = useConfigKey('t7-10', 'gridColor') as string;
  const tickSize = useConfigKey('t7-10', 'tickSize') as number;
  const tickColor = useConfigKey('t7-10', 'tickColor') as string;
  const tickLabels = useConfigKey('t7-10', 'tickLabels') as string;
  const pointsText = useConfigKey('t7-10', 'wavePoints') as string;
  const drawMs = useConfigKey('t7-10', 'drawMs') as number;
  const oscMs = useConfigKey('t7-10', 'oscMs') as number;
  const oscAmp = useConfigKey('t7-10', 'oscAmp') as number;
  const scale = useConfigKey('t7-10', 'scale') as number;
  const posX = (useConfigKey('t7-10', 'posX') as number) ?? 140;
  const posY = (useConfigKey('t7-10', 'posY') as number) ?? 620;

  const drawFrames = Math.max(6, Math.round((drawMs / 1000) * 30));
  const cycle = Math.max(10, Math.round((oscMs / 1000) * 30));
  const padX = 16, padTop = 16, padBottom = tickSize + 12;
  const plotW = Math.max(40, W - padX * 2);
  const plotH = Math.max(20, H - padTop - padBottom);
  const raw = parseNums(pointsText);
  const vals = raw.length > 0 ? raw : [0.2, 0.7, 0.4, 0.8, 0.3, 0.6, 0.4, 0.9, 0.5, 0.7];
  const drawP = interpolate(frame, [6, 6 + drawFrames], [0, 1], {
    easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const pts = vals.map((v, i) => {
    const x = padX + (vals.length === 1 ? plotW / 2 : (plotW * i) / (vals.length - 1));
    const live = Math.sin((frame / cycle) * Math.PI * 2 + i * 0.7) * oscAmp * drawP;
    const y = padTop + plotH - Math.max(0, Math.min(1, v)) * plotH + live;
    return { x, y };
  });
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${padX},${padTop + plotH} ${line} ${pts[pts.length - 1].x.toFixed(1)},${padTop + plotH}`;
  const ticks = String(tickLabels ?? '').split('|').map((s) => s.trim()).filter(Boolean);

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      <div style={{
        ...panelBox(W, H, radius, borderW, borderColor, bg, 1, 0.3, 12),
        opacity: containerOpacity(frame), position: 'relative',
      }}>
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
          {[0, 1, 2].map((k) => (
            <line key={`g${k}`} x1={padX} y1={padTop + (plotH * k) / 2} x2={padX + plotW}
              y2={padTop + (plotH * k) / 2} stroke={gridColor} strokeWidth={1} strokeDasharray="4,4" />
          ))}
          <clipPath id="t710-clip">
            <rect x={padX - 2} y={0} width={Math.max(0, plotW * drawP + 4)} height={H} />
          </clipPath>
          <g clipPath="url(#t710-clip)">
            <polygon points={area} fill={areaFill} />
            <polyline points={line} fill="none" stroke={waveColor} strokeWidth={waveW}
              strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 6px ${waveColor})` }} />
          </g>
        </svg>
        {/* X 轴刻度 */}
        <div style={{
          position: 'absolute', left: padX, top: padTop + plotH + 4, width: plotW,
          display: 'flex', justifyContent: 'space-between',
          fontSize: tickSize, color: tickColor,
        }}>
          {ticks.map((t, i) => <span key={`t${i}`}>{t}</span>)}
        </div>
      </div>
    </div>
  );
};

/* ---------------- t7-11 进度雷达图（多维能力评分） ---------------- */
export const T7_11: React.FC = () => {
  const frame = useCurrentFrame();
  const data = useConfigList('t7-11', 'items') as { label?: string; score?: string; at?: string }[];
  const rows = data.length > 0
    ? data
    : [
      { label: '推理', score: '0.86' },
      { label: '记忆', score: '0.72' },
      { label: '创作', score: '0.78' },
      { label: '速度', score: '0.91' },
      { label: '稳定', score: '0.83' },
    ];
  const W = useConfigKey('t7-11', 'boxW') as number;
  const H = useConfigKey('t7-11', 'boxH') as number;
  const radius = useConfigKey('t7-11', 'radius') as number;
  const bg = useConfigKey('t7-11', 'boxBg') as string;
  const borderW = useConfigKey('t7-11', 'borderW') as number;
  const borderColor = useConfigKey('t7-11', 'borderColor') as string;
  const maxR = useConfigKey('t7-11', 'maxR') as number;
  const strokeW = useConfigKey('t7-11', 'strokeW') as number;
  const strokeColor = useConfigKey('t7-11', 'strokeColor') as string;
  const fillColor = useConfigKey('t7-11', 'fillColor') as string;
  const gridColor = useConfigKey('t7-11', 'gridColor') as string;
  const rings = useConfigKey('t7-11', 'rings') as number;
  const labelSize = useConfigKey('t7-11', 'labelSize') as number;
  const labelColor = useConfigKey('t7-11', 'labelColor') as string;
  const staggerMs = useConfigKey('t7-11', 'staggerMs') as number;
  const drawMs = useConfigKey('t7-11', 'drawMs') as number;
  const orbitMs = useConfigKey('t7-11', 'orbitMs') as number;
  const scale = useConfigKey('t7-11', 'scale') as number;
  const posX = (useConfigKey('t7-11', 'posX') as number) ?? 150;
  const posY = (useConfigKey('t7-11', 'posY') as number) ?? 540;

  const drawFrames = Math.max(6, Math.round((drawMs / 1000) * 30));
  const stagger = Math.max(1, Math.round((staggerMs / 1000) * 30));
  const cycle = Math.max(10, Math.round((orbitMs / 1000) * 30));
  const cx = W / 2;
  const cy = H / 2;
  const n = Math.max(3, rows.length);
  const ringCount = Math.max(2, Math.round(rings));

  const verts = rows.map((r, i) => {
    const raw = Number(r.score);
    const score = Number.isFinite(raw) ? Math.min(1, raw > 1 ? raw / 100 : raw) : 0;
    const deg = (360 * i) / n;
    const p = itemProgress(frame, r, i, 10, stagger, drawFrames);
    return { label: r.label ?? '', score, deg, ratio: score * p, p };
  });

  const gridPolys = Array.from({ length: ringCount }, (_, k) => {
    const ratio = (k + 1) / ringCount;
    return polygonPoints(cx, cy, maxR, verts.map((v) => ({ ratio, deg: v.deg })));
  });
  const dataPoly = polygonPoints(cx, cy, maxR, verts);
  const allDone = verts.every((v) => v.p >= 0.999);

  // 光点沿雷达多边形循环绕行
  const pts = verts.map((v) => polar(cx, cy, maxR * v.ratio, v.deg));
  const segs = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return { a: p, b: q, len: Math.hypot(q[0] - p[0], q[1] - p[1]) };
  });
  const total = segs.reduce((s, g) => s + g.len, 0) || 1;
  const t = (frame % cycle) / cycle;
  let target = t * total;
  let dot: [number, number] = pts[0] ?? [cx, cy];
  for (const g of segs) {
    if (target <= g.len) {
      const k = g.len === 0 ? 0 : target / g.len;
      dot = [g.a[0] + (g.b[0] - g.a[0]) * k, g.a[1] + (g.b[1] - g.a[1]) * k];
      break;
    }
    target -= g.len;
    dot = g.b;
  }

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      <div style={{
        ...panelBox(W, H, radius, borderW, borderColor, bg, 1, 0.3, 12),
        opacity: containerOpacity(frame), position: 'relative',
      }}>
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
          {gridPolys.map((gp, i) => (
            <polygon key={`r${i}`} points={gp} fill="none" stroke={gridColor} strokeWidth={1} />
          ))}
          {verts.map((v, i) => {
            const [x, y] = polar(cx, cy, maxR, v.deg);
            return <line key={`a${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke={gridColor} strokeWidth={1} />;
          })}
          <polygon points={dataPoly} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW}
            strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 8px ${strokeColor})` }} />
          {verts.map((v, i) => {
            const [x, y] = polar(cx, cy, maxR * v.ratio, v.deg);
            return (
              <circle key={`v${i}`} cx={x} cy={y} r={4 + 2 * v.p} fill={strokeColor}
                opacity={0.35 + 0.65 * v.p} />
            );
          })}
          {allDone && (
            <circle cx={dot[0]} cy={dot[1]} r={5} fill="#ffffff"
              style={{ filter: `drop-shadow(0 0 10px ${strokeColor})` }} />
          )}
        </svg>
        {/* 维度标签（顶点外侧） */}
        {verts.map((v, i) => {
          const [x, y] = polar(cx, cy, maxR + labelSize * 0.9, v.deg);
          return (
            <div key={`t${i}`} style={{
              position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)',
              fontSize: labelSize, fontWeight: 700, color: labelColor, whiteSpace: 'nowrap',
              opacity: 0.35 + 0.65 * v.p, textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}>{v.label}</div>
          );
        })}
      </div>
    </div>
  );
};
