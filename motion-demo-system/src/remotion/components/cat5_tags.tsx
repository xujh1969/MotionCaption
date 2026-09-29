import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_STACK } from '../theme';
import { easeOutExpo, atFrames } from '../anim';
import { measureText, weightNum } from '../measure';
import { stripKeyText } from './shared';
import { useConfigKey, useConfigList } from '../config';

/* ---------------- t5-12 关键词标签组（主标题 + 胶囊标签依次点亮·数组扩展） ---------------- */
export const T5_12: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const raw = useConfigList('t5-12', 'items') as { label?: string; at?: string }[];
  const items = raw.length > 0 ? raw : [{ label: '关键词', at: '' }];
  const line1 = stripKeyText(useConfigKey('t5-12', 'titleLine1') as string) || '第一行标题';
  const line2 = stripKeyText(useConfigKey('t5-12', 'titleLine2') as string) || '第二行标题';
  const titleSize = useConfigKey('t5-12', 'titleSize') as number;
  const titleColor = useConfigKey('t5-12', 'titleColor') as string;
  const accentColor = useConfigKey('t5-12', 'accentColor') as string;
  const activeBg = useConfigKey('t5-12', 'activeBg') as string;
  const tagH = useConfigKey('t5-12', 'tagH') as number;
  const tagPadX = useConfigKey('t5-12', 'tagPadX') as number;
  const tagSize = useConfigKey('t5-12', 'tagSize') as number;
  const tagGap = useConfigKey('t5-12', 'tagGap') as number;
  const rowGap = useConfigKey('t5-12', 'rowGap') as number;
  const maxW = useConfigKey('t5-12', 'maxWidth') as number;
  const titleTagGap = useConfigKey('t5-12', 'titleTagGap') as number;
  const posX = (useConfigKey('t5-12', 'posX') as number) ?? 200;
  const posY = (useConfigKey('t5-12', 'posY') as number) ?? 640;
  const scale = useConfigKey('t5-12', 'scale') as number;

  const clampOpt = { easing: easeOutExpo, extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
  const n = items.length;
  const pulse = 0.5 + 0.5 * Math.sin((frame / 45) * Math.PI * 2);

  // 标签点亮帧：at（秒）优先，缺省在标题亮起后均匀接续
  const arrives = items.map((it, i) => atFrames(it, i, 38, 12));
  // 主标题先于第一个标签 1s 开始错位亮起（两行先后轻微错位，共约 600ms）
  const titleStart = Math.max(0, arrives[0] - 30);
  const pLine1 = interpolate(frame, [titleStart, titleStart + 18], [0, 1], clampOpt);
  const pLine2 = interpolate(frame, [titleStart + 6, titleStart + 24], [0, 1], clampOpt);
  const titleShadow = `0 4px 18px rgba(0,0,0,0.45)`;

  // 胶囊手动排布：逐个测宽，超出 maxW 换行（预览/导出同一 measureText，断行一致）
  const widths = items.map((it) => measureText(stripKeyText(it.label ?? ''), tagSize, 'Bold') + tagPadX * 2);
  const tagPos: { x: number; y: number }[] = [];
  let cx = 0;
  let cy = 0;
  let rowW = 0;
  for (let i = 0; i < n; i += 1) {
    if (i > 0 && cx + widths[i] > maxW) {
      cy += tagH + rowGap;
      cx = 0;
      rowW = 0;
    }
    tagPos.push({ x: cx, y: cy });
    cx += widths[i] + tagGap;
    rowW = Math.max(rowW, cx - tagGap);
  }
  const boxW = Math.max(rowW, maxW > 0 ? 0 : 0);
  const boxH = titleSize * 1.15 * 2 + titleTagGap + cy + tagH;

  // 退场：最后 500ms 标签逆序熄灭、标题同步降亮度。
  // MIN_HOLD：最后一个标签点亮后至少停留 3s——组件库缩略图按 5s 渲染、截取第 138 帧，
  // 退场紧贴片段末尾会把缩略图截成「全部熄灭」的灰色状态。
  const outDur = 15;
  const MIN_HOLD = 90;
  const outStagger = outDur / Math.max(1, n);
  const outStart = (i: number) => Math.max(
    arrives[i] + 10 + MIN_HOLD,
    durationInFrames - outDur + (n - 1 - i) * outStagger,
  );
  // 标题与退场序列同步：随最后一个点亮的标签一起开始降低亮度（规格「主标题同步降低亮度」）
  const titleOutStart = outStart(n - 1);
  const titleOutP = frame < titleOutStart ? 0 : interpolate(frame, [titleOutStart, titleOutStart + outDur], [0, 1], clampOpt);

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT_STACK,
    }}>
      {/* 主标题：两行先后错位亮起（亮度 0.3 → 1），退场同步降回 */}
      <div style={{
        fontSize: titleSize, fontWeight: weightNum('Bold'), color: titleColor, lineHeight: 1.15,
        whiteSpace: 'nowrap', textShadow: titleShadow,
        opacity: (0.3 + 0.7 * pLine1) * (1 - 0.75 * titleOutP),
      }}>{line1}</div>
      <div style={{
        fontSize: titleSize, fontWeight: weightNum('Bold'), color: accentColor, lineHeight: 1.15,
        whiteSpace: 'nowrap', textShadow: titleShadow,
        opacity: (0.3 + 0.7 * pLine2) * (1 - 0.75 * titleOutP),
      }}>{line2}</div>
      {/* 胶囊标签：底层为未激活态，上层为激活态随点亮进度浮现 */}
      {items.map((it, i) => {
        const d = arrives[i];
        const label = stripKeyText(it.label ?? '') || '标签';
        // 焦点式点亮：点亮后保持，直到下一个标签点亮时快速回落（同一时刻只有一个高亮，
        // 匹配口播「说到哪个、亮哪个」）；最后一个标签保持到退场。
        const p = interpolate(frame, [d, d + 10], [0, 1], clampOpt);
        const nextAt = i < n - 1 ? arrives[i + 1] : Number.POSITIVE_INFINITY;
        const q = frame < nextAt ? 1 : interpolate(frame, [nextAt, nextAt + 6], [1, 0], clampOpt);
        const lit = p * q;
        const so = outStart(i);
        const outP = frame < so ? 0 : interpolate(frame, [so, so + Math.max(2, outStagger)], [0, 1], clampOpt);
        // 点亮期间呼吸微光 0.25~0.4（只作用于激活层）
        const glowA = (0.25 + 0.15 * pulse) * lit * (1 - outP);
        return (
          <div key={`t${i}`} style={{
            position: 'absolute', left: tagPos[i].x, top: titleSize * 1.15 * 2 + titleTagGap + tagPos[i].y,
            width: widths[i], height: tagH, borderRadius: tagH / 2,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            opacity: (0.6 + 0.4 * lit) * (1 - outP * 0.9),
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            {/* 激活层：深蓝填充 + 青色边框 + 微光，快速填色浮现 */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: tagH / 2,
              background: activeBg,
              border: `1px solid ${accentColor}`,
              opacity: lit * (1 - outP),
              boxShadow: `0 0 ${(12 * glowA / 0.35).toFixed(1)}px rgba(74,209,255,${glowA.toFixed(3)})`,
            }} />
            <span style={{
              position: 'relative', fontSize: tagSize, fontWeight: weightNum('Bold'),
              color: '#FFFFFF', whiteSpace: 'nowrap',
              opacity: 0.7 + 0.3 * lit,
              textShadow: '0 2px 6px rgba(0,0,0,0.4)',
            }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
};
