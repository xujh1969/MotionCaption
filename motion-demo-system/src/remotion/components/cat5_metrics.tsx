import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_STACK } from '../theme';
import { easeOutExpo, atFrames } from '../anim';
import { weightNum } from '../measure';
import { stripKeyText } from './shared';
import { useConfigKey, useConfigList } from '../config';

/** 解析指标值："28,858" → 目标 28858（千分位）；"98.6%" → 98.6 + 后缀 "%"；无法解析返回 null（原样显示）。 */
function parseMetric(value: string): { prefix: string; target: number; decimals: number; suffix: string } | null {
  const m = /^(.*?)([\d,]+(?:\.\d+)?)(.*)$/.exec(value);
  if (!m) return null;
  const target = Number(m[2].replace(/,/g, ''));
  if (!Number.isFinite(target)) return null;
  return { prefix: m[1], target, decimals: (m[2].split('.')[1] ?? '').length, suffix: m[3] };
}

/* ---------------- t5-14 指标结果面板（标题 + 纵向指标卡片·数组依次入场） ---------------- */
export const T5_14: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const raw = useConfigList('t5-14', 'items') as {
    value?: string; label?: string; borderColor?: string; at?: string;
  }[];
  const items = raw.length > 0 ? raw : [{ value: '0', label: '指标', borderColor: '#4ad1ff', at: '' }];
  const subText = stripKeyText(useConfigKey('t5-14', 'subTitleText') as string) || '最终指标';
  const subTitleSize = useConfigKey('t5-14', 'subTitleSize') as number;
  const subTitleColor = useConfigKey('t5-14', 'subTitleColor') as string;
  const line1 = stripKeyText(useConfigKey('t5-14', 'titleLine1') as string) || '第一行标题';
  const line2 = stripKeyText(useConfigKey('t5-14', 'titleLine2') as string) || '第二行标题';
  const titleSize = useConfigKey('t5-14', 'titleSize') as number;
  const titleColor = useConfigKey('t5-14', 'titleColor') as string;
  const accentColor = useConfigKey('t5-14', 'accentColor') as string;
  const cardW = useConfigKey('t5-14', 'cardW') as number;
  const cardGap = useConfigKey('t5-14', 'cardGap') as number;
  const titleCardGap = useConfigKey('t5-14', 'titleCardGap') as number;
  const subTitleGap = useConfigKey('t5-14', 'subTitleGap') as number;
  const radius = useConfigKey('t5-14', 'radius') as number;
  const padX = useConfigKey('t5-14', 'padX') as number;
  const padY = useConfigKey('t5-14', 'padY') as number;
  const numSize = useConfigKey('t5-14', 'numSize') as number;
  const labelSize = useConfigKey('t5-14', 'labelSize') as number;
  const numLabelGap = useConfigKey('t5-14', 'numLabelGap') as number;
  const posX = (useConfigKey('t5-14', 'posX') as number) ?? 140;
  const posY = (useConfigKey('t5-14', 'posY') as number) ?? 120;
  const scale = useConfigKey('t5-14', 'scale') as number;

  const clampOpt = { easing: easeOutExpo, extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
  const n = items.length;
  const pulse = 0.5 + 0.5 * Math.sin((frame / 45) * Math.PI * 2);

  // 标题时序：小标题先淡入（0→15），200ms 后两行主标题先后淡入（各约 550ms）
  const pSub = interpolate(frame, [0, 15], [0, 1], clampOpt);
  const pLine1 = interpolate(frame, [6, 22], [0, 1], clampOpt);
  const pLine2 = interpolate(frame, [12, 28], [0, 1], clampOpt);

  // 卡片入场帧：at（秒）优先，缺省在标题亮起后均匀接续（默认间隔 0.6s）
  const arrives = items.map((it, i) => atFrames(it, i, 38, 18));
  const cardH = padY * 2 + numSize * 1.1 + numLabelGap + labelSize * 1.2;
  const titleBlockH = subTitleSize * 1.2 + subTitleGap + titleSize * 1.1 * 2;

  // 退场：最后 600ms 卡片自下而上逆序淡出上浮，标题最后淡出。
  // MIN_HOLD：末卡入场后至少停留 3s——组件库缩略图按 5s 渲染、截取第 138 帧，
  // 退场紧贴片段末尾会把缩略图截成空态。
  const outDur = 18;
  const MIN_HOLD = 90;
  const outStagger = outDur / Math.max(1, n);
  const outStart = (i: number) => Math.max(
    arrives[i] + 12 + MIN_HOLD,
    durationInFrames - outDur + (n - 1 - i) * outStagger,
  );
  const titleOutStart = Math.max(titleBlockH > 0 ? arrives[n - 1] + 12 + MIN_HOLD : 0, durationInFrames - 12);
  const titleOutP = frame < titleOutStart ? 0 : interpolate(frame, [titleOutStart, titleOutStart + 12], [0, 1], clampOpt);

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT_STACK,
    }}>
      {/* 顶部小标题 → 两行主标题（白行先亮、绿行紧随），退场最后淡出 */}
      <div style={{
        fontSize: subTitleSize, fontWeight: weightNum('Regular'), color: subTitleColor, lineHeight: 1.2,
        whiteSpace: 'nowrap', opacity: pSub * (1 - titleOutP),
        textShadow: '0 4px 20px rgba(0,0,0,0.45)',
      }}>{subText}</div>
      <div style={{
        marginTop: subTitleGap, fontSize: titleSize, fontWeight: weightNum('Bold'), color: titleColor,
        lineHeight: 1.1, whiteSpace: 'nowrap',
        textShadow: '0 4px 20px rgba(0,0,0,0.45)',
        opacity: pLine1 * (1 - titleOutP),
      }}>{line1}</div>
      <div style={{
        fontSize: titleSize, fontWeight: weightNum('Bold'), color: accentColor,
        lineHeight: 1.1, whiteSpace: 'nowrap',
        textShadow: '0 4px 20px rgba(0,0,0,0.45)',
        opacity: pLine2 * (1 - titleOutP),
      }}>{line2}</div>
      {/* 纵向指标卡片 */}
      {items.map((it, i) => {
        const d = arrives[i];
        const value = stripKeyText(it.value ?? '') || '0';
        const label = stripKeyText(it.label ?? '') || '指标';
        const borderColor = stripKeyText(it.borderColor ?? '') || '#4ad1ff';
        // 入场：上浮 + 淡入（400ms），已加载保持高亮静态
        const pIn = interpolate(frame, [d, d + 12], [0, 1], clampOpt);
        const so = outStart(i);
        const outP = frame < so ? 0 : interpolate(frame, [so, so + Math.max(2, outStagger)], [0, 1], clampOpt);
        // 呼吸微光：全部加载后微弱呼吸；最后一张（收尾强调）光效更明显
        const isLast = i === n - 1;
        const glowA = (isLast ? 0.26 + 0.14 * pulse : 0.18 + 0.08 * pulse) * pIn * (1 - outP);
        // 数字计数：与卡片入场同步，从 0 平滑滚动到目标值
        const metric = parseMetric(value);
        const countText = metric
          ? metric.prefix
            + (metric.target * pIn).toLocaleString('en-US', {
              minimumFractionDigits: metric.decimals, maximumFractionDigits: metric.decimals,
            })
            + metric.suffix
          : value;
        return (
          <div key={`m${i}`} style={{
            position: 'absolute', left: 0, top: titleBlockH + titleCardGap + i * (cardH + cardGap),
            width: cardW, height: cardH, borderRadius: radius,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            opacity: pIn * (1 - outP),
            transform: `translateY(${((1 - pIn) * 18).toFixed(2)}px)`,
            overflow: 'hidden',
          }}>
            {/* 高亮层：入场后常驻——淡绿底 + 顶部描边高亮 + 边框微光 */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: radius,
              background: 'rgba(30,140,90,0.12)',
              borderTop: `2px solid ${borderColor}`,
              boxShadow: `0 0 ${(12 * glowA / 0.2).toFixed(1)}px ${borderColor}33`,
              opacity: pIn * (1 - outP),
            }} />
            {/* 数字（计数动画）+ 指标名 */}
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              justifyContent: 'center', paddingLeft: padX, paddingRight: padX, boxSizing: 'border-box',
            }}>
              <span style={{
                fontSize: numSize, fontWeight: weightNum('Bold'), color: '#FFFFFF',
                lineHeight: 1.1, whiteSpace: 'nowrap',
                textShadow: '0 4px 20px rgba(0,0,0,0.45)',
              }}>{countText}</span>
              <span style={{
                marginTop: numLabelGap, fontSize: labelSize, fontWeight: weightNum('Regular'),
                color: 'rgba(255,255,255,0.6)', lineHeight: 1.2, whiteSpace: 'nowrap',
              }}>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
