import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_STACK } from '../theme';
import { easeOutExpo, atFrames } from '../anim';
import { measureText, weightNum } from '../measure';
import { stripKeyText, WrappedText } from './shared';
import { useConfigKey, useConfigList } from '../config';

interface BubbleLayout { x: number; y: number; d: number; }

/**
 * 气泡圆心布局（确定性，预览/导出同一结果）：
 * 首个气泡为集群核心，其余按黄金角螺旋展开；再做若干轮松弛——
 * 互相靠近到「轻微交叠」的目标间距（直径和的 46%）即停，大泡少动、小泡多让；
 * 最后整体平移贴齐左上角并钳制不越过上/左边界。
 */
function layoutBubbles(diameters: number[]): BubbleLayout[] {
  const n = diameters.length;
  const centers: BubbleLayout[] = [];
  const core = diameters[0];
  centers.push({ x: core / 2, y: core / 2, d: core });
  for (let i = 1; i < n; i += 1) {
    const ang = -0.45 + i * 2.399963;
    const dist = (core + diameters[i]) / 2 * 0.92;
    centers.push({
      x: core / 2 + Math.cos(ang) * dist,
      y: core / 2 + Math.sin(ang) * dist,
      d: diameters[i],
    });
  }
  for (let iter = 0; iter < 80; iter += 1) {
    for (let a = 0; a < n; a += 1) {
      for (let b = a + 1; b < n; b += 1) {
        const A = centers[a];
        const B = centers[b];
        const target = (A.d + B.d) / 2 * 0.92;
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        if (dist >= target) continue;
        const push = (target - dist) / 2;
        const ux = dx / dist;
        const uy = dy / dist;
        const wa = B.d / (A.d + B.d);
        const wb = A.d / (A.d + B.d);
        A.x -= ux * push * 2 * wa;
        A.y -= uy * push * 2 * wa;
        B.x += ux * push * 2 * wb;
        B.y += uy * push * 2 * wb;
      }
    }
    for (const c of centers) {
      c.x = Math.max(c.x, c.d / 2);
      c.y = Math.max(c.y, c.d / 2);
    }
  }
  const minX = Math.min(...centers.map((c) => c.x - c.d / 2));
  const minY = Math.min(...centers.map((c) => c.y - c.d / 2));
  for (const c of centers) {
    c.x -= minX;
    c.y -= minY;
  }
  return centers;
}

/* ---------------- t5-11 气泡集群模块（大小差异化圆形气泡·数组扩展） ---------------- */
export const T5_11: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const raw = useConfigList('t5-11', 'items') as {
    title?: string; desc?: string; diameter?: string | number; bgColor?: string; at?: string;
  }[];
  const items = raw.length > 0 ? raw
    : [{ title: '标题', desc: '描述文字', diameter: 420, bgColor: 'rgba(40,40,40,0.75)', at: '' }];
  const titleSize = useConfigKey('t5-11', 'titleSize') as number;
  const descSize = useConfigKey('t5-11', 'descSize') as number;
  const descOpacity = (useConfigKey('t5-11', 'descOpacity') as number) / 100;
  const innerPad = useConfigKey('t5-11', 'innerPad') as number;
  const titleGap = useConfigKey('t5-11', 'titleGap') as number;
  const glowColor = useConfigKey('t5-11', 'glowColor') as string;
  const posX = (useConfigKey('t5-11', 'posX') as number) ?? 120;
  const posY = (useConfigKey('t5-11', 'posY') as number) ?? 80;
  const scale = useConfigKey('t5-11', 'scale') as number;

  const clampOpt = { easing: easeOutExpo, extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
  const n = items.length;
  const pulse = 0.5 + 0.5 * Math.sin((frame / 45) * Math.PI * 2);
  const diameters = items.map((it) => Math.max(180, Math.min(900, Number(it.diameter) || 420)));
  const centers = layoutBubbles(diameters);
  const boxW = Math.max(...centers.map((c) => c.x + c.d / 2));
  const boxH = Math.max(...centers.map((c) => c.y + c.d / 2));

  // 条目入场帧：at（秒）优先，缺省均匀节奏
  const arrives = items.map((it, i) => atFrames(it, i, 8, 20));
  // 激活气泡 = 最后一个完成缩放浮现的（呼吸光效 + 轻微呼吸缩放）
  let activeIdx = -1;
  for (let i = 0; i < n; i += 1) if (frame >= arrives[i] + 21) activeIdx = i;

  // 退场：最后 700ms 逆序（后入场的先退）缩小淡出。
  // MIN_HOLD：每个气泡入场完成后至少停留 3.2s 才开始退场——组件库缩略图按 5s 渲染、
  // 截取第 138 帧，退场若紧贴片段末尾会把后入场的气泡截成残影甚至完全消失（集群看不全）。
  const outDur = 21;
  const MIN_HOLD = 96;
  const outStagger = outDur / Math.max(1, n);
  const outStart = (i: number) => Math.max(
    arrives[i] + 21 + MIN_HOLD,
    durationInFrames - outDur + (n - 1 - i) * outStagger,
  );

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY, width: boxW, height: boxH,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT_STACK,
    }}>
      {items.map((it, i) => {
        const d = arrives[i];
        const c = centers[i];
        const dia = diameters[i];
        const title = stripKeyText(it.title ?? '') || '标题';
        const desc = stripKeyText(it.desc ?? '');
        const bgColor = stripKeyText(it.bgColor ?? '') || 'rgba(40,40,40,0.75)';
        // 阶段1 气泡由中心向外缩放浮现 → 阶段2 标题淡入 → 描述淡入
        const pBubble = interpolate(frame, [d, d + 21], [0, 1], clampOpt);
        const pTitle = interpolate(frame, [d + 10, d + 25], [0, 1], clampOpt);
        const pDesc = interpolate(frame, [d + 16, d + 31], [0, 1], clampOpt);
        const isHot = i === activeIdx;
        // 激活：外发光 0.25~0.4 呼吸 + 轻微呼吸缩放 1.0~1.04；已完成的弱光效
        const glowA = isHot ? 0.25 + 0.15 * pulse : 0.12;
        const breath = isHot ? 1 + 0.04 * pulse : 1;
        const so = outStart(i);
        const outP = frame < so ? 0 : interpolate(frame, [so, so + Math.max(2, outStagger)], [0, 1], clampOpt);
        const alive = pBubble * (1 - outP);
        const innerW = Math.max(80, dia - innerPad * 2);
        // 字号随气泡直径自适应（基准直径 520）
        const sizeK = Math.max(0.7, Math.min(1.3, dia / 520));
        const tSize = titleSize * sizeK;
        // 标题超宽时按比例收缩，避免溢出圆形
        const titleW = measureText(title, tSize, 'Bold');
        const tFinal = titleW > innerW ? tSize * (innerW / titleW) : tSize;
        return (
          <div key={`b${i}`} style={{
            position: 'absolute', left: c.x - dia / 2, top: c.y - dia / 2, width: dia, height: dia,
            borderRadius: '50%', background: bgColor,
            transformOrigin: 'center center',
            transform: `scale(${(alive * breath).toFixed(4)})`,
            opacity: alive,
            boxShadow: `0 0 ${(16 * pBubble).toFixed(1)}px rgba(114,92,240,${glowA.toFixed(3)})`,
          }}>
            {/* 气泡内文案：垂直居中，标题在上、描述在下 */}
            <div style={{
              width: '100%', height: '100%', padding: innerPad, boxSizing: 'border-box',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                fontSize: tFinal, fontWeight: weightNum('Bold'), color: '#FFFFFF', whiteSpace: 'nowrap',
                lineHeight: 1.2, textAlign: 'center', opacity: pTitle,
                textShadow: '0 2px 6px rgba(0,0,0,0.4)',
              }}>{title}</div>
              <div style={{ marginTop: titleGap, opacity: pDesc, width: '100%' }}>
                <WrappedText
                  text={desc} size={descSize * sizeK} maxWidth={innerW} baseWeight="Regular" lineHeight={1.4}
                  style={{
                    position: 'static', fontFamily: FONT_STACK, fontSize: descSize * sizeK,
                    color: '#FFFFFF', opacity: descOpacity, lineHeight: 1.4, textAlign: 'center',
                    textShadow: '0 2px 6px rgba(0,0,0,0.4)',
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
