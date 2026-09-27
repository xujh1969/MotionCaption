import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_STACK } from '../theme';
import { easeOutExpo, atFrames } from '../anim';
import { measureText, weightNum } from '../measure';
import { stripKeyText, WrappedText } from './shared';
import { useConfigKey, useConfigList } from '../config';

/* ---------------- t5-10 五栏递进柱状时序（底部渐暗增长柱·数组扩展） ---------------- */
export const T5_10: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const raw = useConfigList('t5-10', 'items') as {
    num?: string; title?: string; desc?: string; barColor?: string; barH?: string | number; at?: string;
  }[];
  const items = raw.length > 0 ? raw
    : [{ num: '01', title: '标题', desc: '描述文字', barColor: '#805cff', barH: 0.5, at: '' }];
  const titleSize = useConfigKey('t5-10', 'titleSize') as number;
  const titleColor = useConfigKey('t5-10', 'titleColor') as string;
  const descSize = useConfigKey('t5-10', 'descSize') as number;
  const numSize = useConfigKey('t5-10', 'numSize') as number;
  const colW = useConfigKey('t5-10', 'colW') as number;
  const colGap = useConfigKey('t5-10', 'colGap') as number;
  const barMaxH = useConfigKey('t5-10', 'barMaxH') as number;
  const barOpacity = (useConfigKey('t5-10', 'barOpacity') as number) / 100;
  const dividerColor = useConfigKey('t5-10', 'dividerColor') as string;
  const posX = (useConfigKey('t5-10', 'posX') as number) ?? 60;
  const posY = (useConfigKey('t5-10', 'posY') as number) ?? 60;
  const scale = useConfigKey('t5-10', 'scale') as number;

  const clampOpt = { easing: easeOutExpo, extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
  const n = items.length;
  const pulse = 0.5 + 0.5 * Math.sin((frame / 45) * Math.PI * 2);

  // 条目入场帧：at（秒）优先，缺省均匀节奏
  const arrives = items.map((it, i) => atFrames(it, i, 8, 22));
  // 激活条目 = 最后一个标题已亮起的条目（呼吸外发光）；已完成的稳定显示
  let activeIdx = -1;
  for (let i = 0; i < n; i += 1) if (frame >= arrives[i] + 18) activeIdx = i;

  // 文案区高度按最大描述行数取齐（手动折行与 WrappedText 同源 measureText）
  const descLines = items.map((it) => Math.max(1,
    Math.ceil(measureText(stripKeyText(it.desc ?? ''), descSize, 'Regular') / Math.max(80, colW))));
  const descH = Math.max(...descLines) * descSize * 1.45;
  const titleH = titleSize * 1.2;
  const numH = numSize * 1.25;
  const textBlockH = titleH + 20 + descH + 60 + numH; // 标题→描述20、描述→序号60
  const contH = textBlockH + 30 + barMaxH;            // 序号→柱区30

  // 退场：最后 750ms 从右向左依次淡出。
  // MIN_HOLD：每栏入场完成后至少停留 3.2s 才开始退场——组件库缩略图按 5s 渲染、
  // 截取第 138 帧，退场若紧贴片段末尾会把后入场的栏目截成残影甚至完全消失。
  const outDur = 23;
  const MIN_HOLD = 96;
  const outStagger = outDur / Math.max(1, n);
  const outStart = (i: number) => Math.max(
    arrives[i] + 33 + MIN_HOLD,
    durationInFrames - outDur + (n - 1 - i) * outStagger,
  );

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT_STACK,
    }}>
      {items.map((it, i) => {
        const d = arrives[i];
        const x = i * (colW + colGap);
        const num = stripKeyText(it.num ?? '') || String(i + 1).padStart(2, '0');
        const title = stripKeyText(it.title ?? '') || '标题';
        const desc = stripKeyText(it.desc ?? '');
        const barColor = stripKeyText(it.barColor ?? '') || '#805cff';
        const ratio = Math.max(0.08, Math.min(1, Number(it.barH) || 0.5));
        // 阶段1 标题亮起 → 阶段2 描述+序号 → 阶段3 柱块与分割线
        const pTitle = interpolate(frame, [d, d + 18], [0, 1], clampOpt);
        const pText = interpolate(frame, [d + 7, d + 25], [0, 1], clampOpt);
        const pBar = interpolate(frame, [d + 9, d + 9 + 24], [0, 1], clampOpt);
        // 柱块：先从左向右拉伸（前 45% 进度铺满宽度），再自下向上生长到位
        const wp = Math.min(1, pBar / 0.45);
        const hp = Math.max(0, (pBar - 0.3) / 0.7);
        const isHot = i === activeIdx;
        const so = outStart(i);
        const outO = frame < so ? 1 : interpolate(frame, [so, so + Math.max(2, outStagger)], [1, 0], clampOpt);
        return (
          <div key={`c${i}`} style={{ position: 'absolute', left: x, top: 0, width: colW, height: contH, opacity: outO }}>
            {/* 栏间分割竖线：贯穿文字区，随本栏柱块缓缓显现 */}
            {i < n - 1 && (
              <div style={{
                position: 'absolute', right: -colGap / 2, top: 0, width: 1, height: textBlockH,
                background: dividerColor, opacity: pBar,
              }} />
            )}
            {/* 主标题：浅紫微光；激活条目呼吸外发光 */}
            <div style={{
              height: titleH, fontSize: titleSize, fontWeight: weightNum('Bold'), color: titleColor,
              lineHeight: 1.2, opacity: pTitle,
              textShadow: isHot
                ? `0 0 10px rgba(120,80,255,${(0.2 + 0.15 * pulse).toFixed(3)})`
                : '0 1px 4px rgba(120,80,255,0.3)',
            }}>{title}</div>
            {/* 描述正文（手动折行，预览/导出断点一致） */}
            <div style={{ marginTop: 20, height: descH, overflow: 'hidden', opacity: pText }}>
              <WrappedText
                text={desc} size={descSize} maxWidth={colW} baseWeight="Regular" lineHeight={1.45}
                style={{
                  position: 'static', fontFamily: FONT_STACK, fontSize: descSize, color: '#FFFFFF',
                  lineHeight: 1.45, textShadow: '0 1px 3px rgba(0,0,0,0.35)',
                }}
              />
            </div>
            {/* 左下角序号 */}
            <div style={{
              marginTop: 60, height: numH, fontSize: numSize, fontWeight: weightNum('Regular'),
              color: '#FFFFFF', lineHeight: 1.25, opacity: pText,
              textShadow: '0 1px 3px rgba(0,0,0,0.35)',
            }}>{num}</div>
            {/* 底部递进柱块：左对齐、顶部微圆角柔和边缘、无描边 */}
            <div style={{ position: 'absolute', left: 0, bottom: 0, width: colW, height: barMaxH }}>
              <div style={{
                position: 'absolute', left: 0, bottom: 0,
                width: Math.max(0, colW * wp), height: Math.max(0, barMaxH * ratio * hp),
                background: barColor, opacity: barOpacity, borderRadius: '3px 3px 0 0',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
