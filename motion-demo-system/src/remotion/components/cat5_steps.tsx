import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_STACK } from '../theme';
import { easeOutExpo, atFrames } from '../anim';
import { weightNum } from '../measure';
import { stripKeyText } from './shared';
import { useConfigKey, useConfigList } from '../config';

/* ---------------- t5-13 纵向步骤卡片（标题 + 选项依次高亮·数组扩展） ----------------
 * 三态：未开始（默认灰）→ 激活（深蓝底 + 青边框 + 指示点）→ 已完成（弱蓝底保留较低亮度）。
 * 依次点亮：下一张激活时上一张回落为已完成态（stayOnCompleted），最后一张保持激活。
 */
export const T5_13: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const raw = useConfigList('t5-13', 'items') as { num?: string; title?: string; at?: string }[];
  const items = raw.length > 0 ? raw : [{ num: '00', title: '步骤标题', at: '' }];
  const line1 = stripKeyText(useConfigKey('t5-13', 'titleLine1') as string) || '第一行标题';
  const line2 = stripKeyText(useConfigKey('t5-13', 'titleLine2') as string) || '第二行标题';
  const titleSize = useConfigKey('t5-13', 'titleSize') as number;
  const titleColor = useConfigKey('t5-13', 'titleColor') as string;
  const accentColor = useConfigKey('t5-13', 'accentColor') as string;
  const activeBg = useConfigKey('t5-13', 'activeBg') as string;
  const cardW = useConfigKey('t5-13', 'cardW') as number;
  const cardH = useConfigKey('t5-13', 'cardH') as number;
  const cardGap = useConfigKey('t5-13', 'cardGap') as number;
  const radius = useConfigKey('t5-13', 'radius') as number;
  const numSize = useConfigKey('t5-13', 'numSize') as number;
  const cardTitleSize = useConfigKey('t5-13', 'cardTitleSize') as number;
  const numTitleGap = useConfigKey('t5-13', 'numTitleGap') as number;
  const padLeft = useConfigKey('t5-13', 'padLeft') as number;
  const titleCardGap = useConfigKey('t5-13', 'titleCardGap') as number;
  const posX = (useConfigKey('t5-13', 'posX') as number) ?? 160;
  const posY = (useConfigKey('t5-13', 'posY') as number) ?? 560;
  const scale = useConfigKey('t5-13', 'scale') as number;

  const clampOpt = { easing: easeOutExpo, extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
  const n = items.length;
  const pulse = 0.5 + 0.5 * Math.sin((frame / 45) * Math.PI * 2);

  // 卡片点亮帧：at（秒）优先，缺省在标题亮起后均匀接续（默认间隔 0.7s）
  const arrives = items.map((it, i) => atFrames(it, i, 34, 21));
  // 主标题先于首张卡片约 0.9s 错位淡入（两行各约 500ms，白行先亮）
  const titleStart = Math.max(0, arrives[0] - 26);
  const pLine1 = interpolate(frame, [titleStart, titleStart + 15], [0, 1], clampOpt);
  const pLine2 = interpolate(frame, [titleStart + 5, titleStart + 20], [0, 1], clampOpt);
  const titleShadow = '0 4px 20px rgba(0,0,0,0.5)';

  // 退场：最后 600ms 卡片从上到下依次熄灭，标题同步淡出。
  // MIN_HOLD：末张点亮后至少停留 3s——组件库缩略图按 5s 渲染、截取第 138 帧，
  // 退场紧贴片段末尾会把缩略图截成熄灭后的空态。
  const outDur = 18;
  const MIN_HOLD = 90;
  const outStagger = outDur / Math.max(1, n);
  const outStart = (i: number) => Math.max(
    arrives[i] + 9 + MIN_HOLD,
    durationInFrames - outDur + i * outStagger,
  );
  const titleOutStart = outStart(0);
  const titleOutP = frame < titleOutStart ? 0 : interpolate(frame, [titleOutStart, titleOutStart + outDur], [0, 1], clampOpt);

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT_STACK,
    }}>
      {/* 主标题：两行错位淡入（亮度 0.4 → 1，白行先亮），退场同步淡出 */}
      <div style={{
        fontSize: titleSize, fontWeight: weightNum('Bold'), color: titleColor, lineHeight: 1.15,
        whiteSpace: 'nowrap', textShadow: titleShadow,
        opacity: (0.4 + 0.6 * pLine1) * (1 - titleOutP),
      }}>{line1}</div>
      <div style={{
        fontSize: titleSize, fontWeight: weightNum('Bold'), color: accentColor, lineHeight: 1.15,
        whiteSpace: 'nowrap', textShadow: titleShadow,
        opacity: (0.4 + 0.6 * pLine2) * (1 - titleOutP),
      }}>{line2}</div>
      {/* 纵向步骤卡片 */}
      {items.map((it, i) => {
        const d = arrives[i];
        const num = stripKeyText(it.num ?? '') || String(i).padStart(2, '0');
        const title = stripKeyText(it.title ?? '') || '步骤标题';
        // pIn：激活浮现（300ms）；doneIn：下一张点亮时本张回落为已完成态
        const pIn = interpolate(frame, [d, d + 9], [0, 1], clampOpt);
        const nextAt = i < n - 1 ? arrives[i + 1] : Number.POSITIVE_INFINITY;
        const doneIn = frame < nextAt ? 0 : interpolate(frame, [nextAt, nextAt + 9], [0, 1], clampOpt);
        const activeO = pIn * (1 - doneIn);
        const so = outStart(i);
        const outP = frame < so ? 0 : interpolate(frame, [so, so + Math.max(2, outStagger)], [0, 1], clampOpt);
        const y = titleSize * 1.15 * 2 + titleCardGap + i * (cardH + cardGap);
        return (
          <div key={`c${i}`} style={{
            position: 'absolute', left: 0, top: y, width: cardW, height: cardH,
            borderRadius: radius, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            opacity: 1 - outP, overflow: 'hidden',
          }}>
            {/* 默认态内容 */}
            {renderContentAt(num, title, 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.55)', numSize, cardTitleSize, numTitleGap, padLeft, false)}
            {/* 已完成覆盖层：弱蓝底保留较低亮度（stayOnCompleted） */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: radius,
              background: 'rgba(30,70,160,0.14)', border: '1px solid rgba(74,209,255,0.28)',
              opacity: doneIn * (1 - outP),
            }}>
              {renderContentAt(num, title, 'rgba(74,209,255,0.6)', 'rgba(255,255,255,0.8)', numSize, cardTitleSize, numTitleGap, padLeft, false)}
            </div>
            {/* 激活覆盖层：深蓝底 + 青边框 + 外发光 + 左侧指示点 */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: radius,
              background: activeBg, border: `1px solid ${accentColor}`,
              boxShadow: `0 0 ${(14 * (0.75 + 0.25 * pulse) * activeO).toFixed(1)}px rgba(74,209,255,${(0.25 * activeO).toFixed(3)})`,
              opacity: activeO * (1 - outP),
            }}>
              <div style={{
                position: 'absolute', left: 12, top: cardH / 2 - 3, width: 6, height: 6,
                borderRadius: '50%', background: accentColor,
                boxShadow: `0 0 8px ${accentColor}`,
              }} />
              {renderContentAt(num, title, accentColor, '#FFFFFF', numSize, cardTitleSize, numTitleGap, padLeft, true)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** 卡片内容行：序号 + 标题（垂直居中、左内边距），供三种状态层复用。 */
function renderContentAt(
  num: string, title: string, numColor: string, titleColor: string,
  numSize: number, cardTitleSize: number, numTitleGap: number, padLeft: number, numGlow: boolean,
): React.ReactNode {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
      paddingLeft: padLeft, gap: numTitleGap, boxSizing: 'border-box',
    }}>
      <span style={{
        fontSize: numSize, fontWeight: weightNum('Bold'), color: numColor, lineHeight: 1,
        textShadow: numGlow ? '0 0 8px rgba(74,209,255,0.35)' : 'none',
      }}>{num}</span>
      <span style={{
        fontSize: cardTitleSize, fontWeight: weightNum('Bold'), color: titleColor,
        whiteSpace: 'nowrap', lineHeight: 1,
      }}>{title}</span>
    </div>
  );
}
