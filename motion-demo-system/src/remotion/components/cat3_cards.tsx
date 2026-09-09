import React from 'react';
import { useCurrentFrame } from 'remotion';
import { FONT, itemProgress, shell, SHADOW_STEP, SHADOW_CYAN, countValue, parseNums, parsePoints, textWidth } from './cardKit';
import { atFrames } from '../anim';
import { useConfigKey, useConfigList } from '../config';

/**
 * t3-05 / t3-06：数据类横向卡片数组（数组顺序渐亮入场）
 * t3-05 指标数据卡片：点亮瞬间数字滚动计数，底部迷你条形同步生长。
 * t3-06 对比双列卡片组：以「组」为单位依次入场，组内左右两张同步点亮，要点逐行跟进。
 */
const DIM = 0.18;

/* ---------------- t3-05 横向指标数据卡片（数字滚动 + 迷你条形生长） ---------------- */
export const T3_05: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = useConfigList('t3-05', 'items') as {
    name?: string; num?: string; unit?: string; desc?: string; trend?: string; at?: string;
  }[];
  const items = raw.length > 0
    ? raw
    : [{ name: '推理速度', num: '92', unit: 'ms', desc: '满负载稳定', trend: '40,55,70,92' }];
  const cardW = useConfigKey('t3-05', 'cardW') as number;
  const cardH = useConfigKey('t3-05', 'cardH') as number;
  const radius = useConfigKey('t3-05', 'radius') as number;
  const cardBg = useConfigKey('t3-05', 'cardBg') as string;
  const borderW = useConfigKey('t3-05', 'borderW') as number;
  const borderColor = useConfigKey('t3-05', 'borderColor') as string;
  const padX = useConfigKey('t3-05', 'padX') as number;
  const padY = useConfigKey('t3-05', 'padY') as number;
  const nameSize = useConfigKey('t3-05', 'nameSize') as number;
  const nameColor = useConfigKey('t3-05', 'nameColor') as string;
  const numSize = useConfigKey('t3-05', 'numSize') as number;
  const numColor = useConfigKey('t3-05', 'numColor') as string;
  const unitSize = useConfigKey('t3-05', 'unitSize') as number;
  const unitColor = useConfigKey('t3-05', 'unitColor') as string;
  const descSize = useConfigKey('t3-05', 'descSize') as number;
  const descColor = useConfigKey('t3-05', 'descColor') as string;
  const chartH = useConfigKey('t3-05', 'chartH') as number;
  const barGap = useConfigKey('t3-05', 'barGap') as number;
  const countMs = useConfigKey('t3-05', 'countMs') as number;
  const gap = useConfigKey('t3-05', 'gap') as number;
  const scale = useConfigKey('t3-05', 'scale') as number;
  const posX = (useConfigKey('t3-05', 'posX') as number) ?? 120;
  const posY = (useConfigKey('t3-05', 'posY') as number) ?? 600;

  const DUR = 15; // 500ms @30fps
  const countFrames = Math.max(6, Math.round((countMs / 1000) * 30));
  const innerW = Math.max(40, cardW - padX * 2 - borderW * 2);
  /** 卡片高度自适应：固定 cardH 只作下限；默认字号偏大时按内容撑高，避免挤压重叠 */
  const cardHNeeded = Math.max(cardH, Math.ceil(
    padY * 2 + nameSize * 1.2 + 6 + numSize + 4 + descSize * 1.2 + 10 + chartH + 6,
  ));

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap }}>
        {items.map((it, i) => {
          const p = itemProgress(frame, it, i, 10, 36, DUR);
          const o = DIM + (1 - DIM) * p;
          const numText = String(it.num ?? '');
          const target = Number(numText);
          const decimals = numText.includes('.') ? 1 : 0;
          const shown = Number.isFinite(target)
            ? countValue(frame, target, atFrames(it, i, 10, 36), countFrames, decimals)
            : 0;
          const trend = parseNums(it.trend);
          const maxT = Math.max(1, ...trend);
          const n = Math.max(1, trend.length);
          const barW = (innerW - (n - 1) * barGap) / n;
          return (
            <div key={`m${i}`} style={{
              ...shell(cardW, cardHNeeded, radius, borderW, borderColor, cardBg, p, 0.32, 16, SHADOW_STEP),
              opacity: o, padding: `${padY}px ${padX}px`,
              flexDirection: 'column', alignItems: 'stretch', justifyContent: 'space-between',
            }}>
              <div style={{
                fontSize: nameSize, fontWeight: 400, color: nameColor, lineHeight: 1.2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{it.name ?? ''}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 6 }}>
                <span style={{
                  fontSize: numSize, fontWeight: 800, color: numColor, lineHeight: 1,
                }}>{shown}</span>
                <span style={{
                  marginLeft: 8, fontSize: unitSize, fontWeight: 700, color: unitColor, lineHeight: 1,
                }}>{it.unit ?? ''}</span>
              </div>
              <div style={{
                marginTop: 4, fontSize: descSize, fontWeight: 400, color: descColor, lineHeight: 1.2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{it.desc ?? ''}</div>
              <div style={{
                marginTop: 10, height: chartH, display: 'flex', alignItems: 'flex-end', gap: barGap,
              }}>
                {trend.map((v, k) => {
                  const growP = Math.max(0, Math.min(1, (p - 0.15) / 0.85));
                  const h = Math.max(2, (v / maxT) * chartH * growP);
                  return (
                    <div key={`t${k}`} style={{
                      width: barW, height: h, borderRadius: 3,
                      background: borderColor, opacity: 0.35 + 0.5 * growP,
                    }} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- t3-06 横向对比双列卡片组（两组对照，组内同步点亮） ---------------- */
export const T3_06: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = useConfigList('t3-06', 'groups') as {
    titleA?: string; borderA?: string; pointsA?: string;
    titleB?: string; borderB?: string; pointsB?: string; at?: string;
  }[];
  const groups = raw.length > 0
    ? raw
    : [{
      titleA: '传统方案', borderA: '#f24e78', pointsA: '部署复杂|成本较高|扩展有限',
      titleB: '新方案', borderB: '#46e0d0', pointsB: '开箱即用|成本更低|弹性扩展',
    }];
  const cardW = useConfigKey('t3-06', 'cardW') as number;
  const cardH = useConfigKey('t3-06', 'cardH') as number;
  const radius = useConfigKey('t3-06', 'radius') as number;
  const cardBg = useConfigKey('t3-06', 'cardBg') as string;
  const borderW = useConfigKey('t3-06', 'borderW') as number;
  const padX = useConfigKey('t3-06', 'padX') as number;
  const innerGap = useConfigKey('t3-06', 'innerGap') as number;
  const groupGap = useConfigKey('t3-06', 'groupGap') as number;
  const titleSize = useConfigKey('t3-06', 'titleSize') as number;
  const titleColor = useConfigKey('t3-06', 'titleColor') as string;
  const itemSize = useConfigKey('t3-06', 'itemSize') as number;
  const itemColor = useConfigKey('t3-06', 'itemColor') as string;
  const markSize = useConfigKey('t3-06', 'markSize') as number;
  const markA = useConfigKey('t3-06', 'markA') as string;
  const markB = useConfigKey('t3-06', 'markB') as string;
  const markGap = useConfigKey('t3-06', 'markGap') as number;
  const staggerMs = useConfigKey('t3-06', 'staggerMs') as number;
  const scale = useConfigKey('t3-06', 'scale') as number;
  const posX = (useConfigKey('t3-06', 'posX') as number) ?? 100;
  const posY = (useConfigKey('t3-06', 'posY') as number) ?? 600;

  const DUR = 15; // 500ms @30fps
  const stagger = Math.max(1, Math.round((staggerMs / 1000) * 30));

  /**
   * 单卡自适应排版：
   * - 宽度：按最长要点/标题撑开（上限 CARD_W_MAX），装不下就换行，不再截断省略；
   * - 高度：按标题与每个要点的实际行数累加，cardH 只是下限。
   */
  const CARD_W_MAX = 560;
  const LINE_H = 1.32;
  const layoutOf = (title: string, points: string[]) => {
    const markW = markSize + markGap;
    const titleW = textWidth(title, titleSize, 'Bold');
    const pointW = points.reduce((m, t) => Math.max(m, textWidth(t, itemSize)), 0);
    const w = Math.min(
      CARD_W_MAX,
      Math.max(cardW, Math.ceil(Math.max(titleW, markW + pointW) + padX * 2 + 6)),
    );
    const avail = Math.max(40, w - padX * 2 - markW);
    const titleLines = Math.max(1, Math.ceil(titleW / avail));
    const lines = points.map((t) => Math.max(1, Math.ceil(textWidth(t, itemSize) / avail)));
    const contentH = titleLines * titleSize * 1.2 + 16
      + lines.reduce((sum, n) => sum + n * itemSize * LINE_H, 0)
      + Math.max(0, points.length - 1) * 8;
    return { w, h: Math.max(cardH, Math.ceil(18 + contentH + 18)), lines };
  };

  /** 要点标记：填数字时按条目自动递增（1、2、3…），否则原样作为符号（✗/✓ 等） */
  const markAt = (mark: string, k: number) => {
    const m = String(mark ?? '').trim();
    return /^\d+$/.test(m) ? String(Number(m) + k) : m;
  };

  const side = (
    title: string, color: string, points: string[], mark: string, p: number,
    w: number, h: number, lines: number[],
  ) => (
    <div style={{
      ...shell(w, h, radius, borderW, color, cardBg, p, 0.3, 14, SHADOW_CYAN),
      opacity: DIM + (1 - DIM) * p, padding: `18px ${padX}px`,
      flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start',
    }}>
      <div style={{
        fontSize: titleSize, fontWeight: 700, color: titleColor, lineHeight: 1.15,
        wordBreak: 'break-word', maxWidth: '100%',
      }}>{title}</div>
      {points.map((t, k) => {
        const ip = Math.max(0, Math.min(1, p * 1.6 - (k * stagger) / DUR));
        return (
          <div key={`p${k}`} style={{
            marginTop: k === 0 ? 16 : 8, display: 'flex', alignItems: 'flex-start',
            width: '100%', opacity: 0.35 + 0.65 * ip,
          }}>
            <span style={{
              fontSize: markSize, fontWeight: 700, color, lineHeight: 1.25,
              minWidth: markSize, flex: '0 0 auto', textAlign: 'center',
            }}>{markAt(mark, k)}</span>
            <span style={{
              marginLeft: markGap, fontSize: itemSize, fontWeight: 400, color: itemColor,
              lineHeight: LINE_H, flex: '1 1 auto', wordBreak: 'break-word',
            }}>{t}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: groupGap }}>
        {groups.map((g, i) => {
          const p = itemProgress(frame, g, i, 10, 48, DUR);
          const pointsA = parsePoints(g.pointsA);
          const pointsB = parsePoints(g.pointsB);
          // 左右各自量体裁衣，再取同一高度：长文字换行后不会挤在一行或被截断
          const la = layoutOf(g.titleA ?? '', pointsA);
          const lb = layoutOf(g.titleB ?? '', pointsB);
          const h = Math.max(la.h, lb.h);
          return (
            <div key={`g${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: innerGap }}>
              {side(g.titleA ?? '', g.borderA || '#f24e78', pointsA, markA, p, la.w, h, la.lines)}
              {side(g.titleB ?? '', g.borderB || '#46e0d0', pointsB, markB, p, lb.w, h, lb.lines)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
