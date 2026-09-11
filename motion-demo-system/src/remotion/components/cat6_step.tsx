import React from 'react';
import { useCurrentFrame } from 'remotion';
import { FONT, itemProgress, SHADOW_BLOCK } from './cardKit';
import { useConfigKey, useConfigList } from '../config';
import { mixColor } from './shared';

/**
 * t6-08 纵向堆叠序号步骤卡片（条目过多、横向放不下时切换）
 * 条目自上而下依次渐亮；序号块随进度点亮（当前项红色、已走过转为历史灰）；
 * 垂向连接线红色段随下一项入场同步向下延伸。
 */
export const T6_08: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = useConfigList('t6-08', 'items') as { num?: string; title?: string; desc?: string; at?: string }[];
  const items = raw.length > 0
    ? raw
    : [
      { num: '1', title: '理解需求', desc: '明确目标边界' },
      { num: '2', title: '设计结构', desc: '搭建信息骨架' },
      { num: '3', title: '实现功能', desc: '编码与联调' },
      { num: '4', title: '验收上线', desc: '测试并发布' },
    ];
  const entryH = useConfigKey('t6-08', 'entryH') as number;
  const gapV = useConfigKey('t6-08', 'gapV') as number;
  const boxSize = useConfigKey('t6-08', 'boxSize') as number;
  const boxRadius = useConfigKey('t6-08', 'boxRadius') as number;
  const activeBg = useConfigKey('t6-08', 'activeBg') as string;
  const inactiveBg = useConfigKey('t6-08', 'inactiveBg') as string;
  const boxFont = useConfigKey('t6-08', 'boxFont') as number;
  const boxGap = useConfigKey('t6-08', 'boxGap') as number;
  const lineW = useConfigKey('t6-08', 'lineW') as number;
  const passedColor = useConfigKey('t6-08', 'passedColor') as string;
  const pendingColor = useConfigKey('t6-08', 'pendingColor') as string;
  const titleSize = useConfigKey('t6-08', 'titleSize') as number;
  const titleColor = useConfigKey('t6-08', 'titleColor') as string;
  const descSize = useConfigKey('t6-08', 'descSize') as number;
  const descColor = useConfigKey('t6-08', 'descColor') as string;
  const textGap = useConfigKey('t6-08', 'textGap') as number;
  const glowColor = useConfigKey('t6-08', 'glowColor') as string;
  const scale = useConfigKey('t6-08', 'scale') as number;
  const posX = (useConfigKey('t6-08', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t6-08', 'posY') as number) ?? 220;

  const DIM = 0.18;
  const DUR = 13; // 420ms @30fps
  const lineLen = Math.max(0, entryH - boxSize) + gapV;

  const progress = items.map((it, i) => itemProgress(frame, it, i, 10, 42, DUR));
  // 当前焦点：最后一个已入场（进度过半）的条目
  let current = -1;
  progress.forEach((p, i) => {
    if (p > 0.6) current = i;
  });

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      {items.map((it, i) => {
        const p = progress[i];
        const isCurrent = i === current;
        const isPast = i < current;
        const boxMix = isCurrent ? p : 0;
        const o = (DIM + (1 - DIM) * p) * (isPast ? 0.62 : 1);
        // 到下一条目的连接线：随下一条目入场同步向下延伸
        const lp = i < items.length - 1 ? progress[i + 1] : 0;
        return (
          <div key={`v${i}`} style={{
            position: 'relative', display: 'flex', alignItems: 'center',
            height: entryH, marginBottom: i < items.length - 1 ? gapV : 0, opacity: o,
          }}>
            {/* 连接线：未到段 + 已走段 */}
            {i < items.length - 1 && (
              <>
                <div style={{
                  position: 'absolute', left: boxSize / 2 - lineW / 2, top: boxSize,
                  width: lineW, height: lineLen, background: pendingColor, borderRadius: lineW / 2,
                }} />
                <div style={{
                  position: 'absolute', left: boxSize / 2 - lineW / 2, top: boxSize,
                  width: lineW, height: lineLen * lp, background: passedColor, borderRadius: lineW / 2,
                  boxShadow: lp > 0 ? `0 0 ${(8 * lp).toFixed(1)}px ${passedColor}` : 'none',
                }} />
              </>
            )}
            {/* 序号块 */}
            <div style={{
              width: boxSize, height: boxSize, borderRadius: boxRadius, flex: '0 0 auto',
              background: mixColor(inactiveBg, activeBg, boxMix),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: boxFont, fontWeight: 800, color: '#ffffff', lineHeight: 1,
              boxShadow: boxMix > 0
                ? `0 0 ${(16 * boxMix).toFixed(1)}px rgba(255,60,40,${(0.35 * boxMix).toFixed(3)}), `
                  + SHADOW_BLOCK.replace('ALPHA', '0.35')
                : 'none',
            }}>{it.num ?? String(i + 1)}</div>
            {/* 文本区 */}
            <div style={{ marginLeft: boxGap, minWidth: 0 }}>
              <div style={{
                fontSize: titleSize, fontWeight: 700, color: titleColor, lineHeight: 1.1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                textShadow: isCurrent ? `0 0 ${(14 * p).toFixed(1)}px ${glowColor}` : 'none',
              }}>{it.title ?? ''}</div>
              <div style={{
                marginTop: textGap, fontSize: descSize, fontWeight: 400, color: descColor, lineHeight: 1.2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{it.desc ?? ''}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
