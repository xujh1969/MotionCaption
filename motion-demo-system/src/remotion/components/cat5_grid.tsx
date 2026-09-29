import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_STACK } from '../theme';
import { easeOutExpo, atFrames } from '../anim';
import { weightNum } from '../measure';
import { stripKeyText } from './shared';
import { useConfigKey, useConfigList } from '../config';

/* ---------------- t5-15 2行3列网格标签卡片（主标题+网格胶囊·依次点亮·数组扩展） ----------------
 * 焦点式高亮：卡片入场即成为当前激活卡（金色描边+微光），下一张入场时上一张
 * 退回默认灰态——同一时间仅 1 张保持激活，匹配口播「讲到哪、亮哪」。 */
export const T5_15: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const raw = useConfigList('t5-15', 'items') as { label?: string; at?: string }[];
  const items = raw.length > 0 ? raw : [{ label: '标签', at: '' }];
  const subText = stripKeyText(useConfigKey('t5-15', 'subTitleText') as string) || '参考图';
  const subTitleSize = useConfigKey('t5-15', 'subTitleSize') as number;
  const subTitleColor = useConfigKey('t5-15', 'subTitleColor') as string;
  const line1 = stripKeyText(useConfigKey('t5-15', 'titleLine1') as string) || '第一行标题';
  const line2 = stripKeyText(useConfigKey('t5-15', 'titleLine2') as string) || '第二行标题';
  const titleSize = useConfigKey('t5-15', 'titleSize') as number;
  const titleColor = useConfigKey('t5-15', 'titleColor') as string;
  const accentColor = useConfigKey('t5-15', 'accentColor') as string;
  const activeBg = useConfigKey('t5-15', 'activeBg') as string;
  const cardW = useConfigKey('t5-15', 'cardW') as number;
  const cardH = useConfigKey('t5-15', 'cardH') as number;
  const gapX = useConfigKey('t5-15', 'gapX') as number;
  const gapY = useConfigKey('t5-15', 'gapY') as number;
  const radius = useConfigKey('t5-15', 'radius') as number;
  const tagSize = useConfigKey('t5-15', 'tagSize') as number;
  const subTitleGap = useConfigKey('t5-15', 'subTitleGap') as number;
  const titleGridGap = useConfigKey('t5-15', 'titleGridGap') as number;
  const posX = (useConfigKey('t5-15', 'posX') as number) ?? 160;
  const posY = (useConfigKey('t5-15', 'posY') as number) ?? 100;
  const scale = useConfigKey('t5-15', 'scale') as number;

  const clampOpt = { easing: easeOutExpo, extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
  const n = items.length;
  const pulse = 0.5 + 0.5 * Math.sin((frame / 45) * Math.PI * 2);

  // 标题时序：小标题与两行主标题同时淡入（约 550ms），不分先后；
  // 只有下方网格卡片按数组顺序依次出现。
  const pSub = interpolate(frame, [0, 16], [0, 1], clampOpt);
  const pLine1 = interpolate(frame, [0, 16], [0, 1], clampOpt);
  const pLine2 = interpolate(frame, [0, 16], [0, 1], clampOpt);
  const titleShadow = '0 4px 20px rgba(0,0,0,0.45)';

  // 卡片入场帧：at（秒）优先，缺省在标题亮起后均匀接续（默认间隔 0.6s）
  const arrives = items.map((it, i) => atFrames(it, i, 38, 18));
  const gridTop = subTitleSize * 1.2 + subTitleGap + titleSize * 1.1 * 2 + titleGridGap;

  // 退场：最后 600ms 卡片逆序淡出、标题最后淡出。
  // MIN_HOLD：末卡点亮后至少停留 3s——组件库缩略图按 5s 渲染、截取第 138 帧，
  // 退场紧贴片段末尾会把缩略图截成空态。
  const outDur = 18;
  const MIN_HOLD = 90;
  const outStagger = outDur / Math.max(1, n);
  const outStart = (i: number) => Math.max(
    arrives[i] + 11 + MIN_HOLD,
    durationInFrames - outDur + (n - 1 - i) * outStagger,
  );
  const titleOutStart = Math.max(arrives[n - 1] + 11 + MIN_HOLD, durationInFrames - 12);
  const titleOutP = frame < titleOutStart ? 0 : interpolate(frame, [titleOutStart, titleOutStart + 12], [0, 1], clampOpt);

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT_STACK,
    }}>
      {/* 顶部小标题 → 两行主标题（白行先亮、金行随后），退场最后淡出 */}
      <div style={{
        fontSize: subTitleSize, fontWeight: weightNum('Regular'), color: subTitleColor, lineHeight: 1.2,
        whiteSpace: 'nowrap', opacity: pSub * (1 - titleOutP), textShadow: titleShadow,
      }}>{subText}</div>
      <div style={{
        marginTop: subTitleGap, fontSize: titleSize, fontWeight: weightNum('Bold'), color: titleColor,
        lineHeight: 1.1, whiteSpace: 'nowrap', textShadow: titleShadow,
        opacity: pLine1 * (1 - titleOutP),
      }}>{line1}</div>
      <div style={{
        fontSize: titleSize, fontWeight: weightNum('Bold'), color: accentColor,
        lineHeight: 1.1, whiteSpace: 'nowrap', textShadow: titleShadow,
        opacity: pLine2 * (1 - titleOutP),
      }}>{line2}</div>
      {/* 2×3 网格卡片：入场即成为激活卡，下一张入场时回落默认态 */}
      {items.map((it, i) => {
        const d = arrives[i];
        const label = stripKeyText(it.label ?? '') || '标签';
        // 入场：淡入 + 轻微上移（350ms）
        const pIn = interpolate(frame, [d, d + 11], [0, 1], clampOpt);
        // 焦点回落：下一张入场时本张从激活态退回默认态（300ms）
        const nextAt = i < n - 1 ? arrives[i + 1] : Number.POSITIVE_INFINITY;
        const q = frame < nextAt ? 1 : interpolate(frame, [nextAt, nextAt + 9], [1, 0], clampOpt);
        const lit = pIn * q;
        const so = outStart(i);
        const outP = frame < so ? 0 : interpolate(frame, [so, so + Math.max(2, outStagger)], [0, 1], clampOpt);
        const glowA = (0.22 + 0.13 * pulse) * lit * (1 - outP);
        const col = i % 3;
        const row = Math.floor(i / 3);
        return (
          <div key={`g${i}`} style={{
            position: 'absolute', left: col * (cardW + gapX), top: gridTop + row * (cardH + gapY),
            width: cardW, height: cardH, borderRadius: radius,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            opacity: pIn * (1 - outP),
            transform: `translateY(${((1 - pIn) * 14).toFixed(2)}px)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            {/* 激活层：暖金底 + 金色描边 + 外发光 */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: radius,
              background: activeBg,
              border: `1px solid ${accentColor}`,
              boxShadow: `0 0 ${(14 * glowA / 0.3).toFixed(1)}px rgba(255,194,71,${glowA.toFixed(3)})`,
              opacity: lit * (1 - outP),
            }} />
            <span style={{
              position: 'relative', fontSize: tagSize, fontWeight: weightNum('Bold'),
              color: '#FFFFFF', whiteSpace: 'nowrap',
              opacity: 0.6 + 0.4 * lit,
              textShadow: '0 2px 6px rgba(0,0,0,0.4)',
            }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
};
