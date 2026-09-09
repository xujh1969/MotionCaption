import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { easeOutExpo } from '../anim';
import {
  FONT, itemProgress, shell, SHADOW_T4_03, SHADOW_CYAN, SHADOW_STEP,
  breathPulse, countValue,
} from './cardKit';
import { useConfigKey, useConfigList } from '../config';
import { withAlpha } from './shared';

/**
 * t4-03 ~ t4-09：横向卡片组（数组顺序渐亮入场）

/* ---------------- t4-03 横向串联流程卡片（箭头连接，逐项渐亮） ---------------- */
export const T4_03: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = useConfigList('t4-03', 'items') as { label?: string; borderColor?: string; at?: string }[];
  const items = raw.length > 0 ? raw : [{ label: '步骤一', borderColor: '#ff6688' }];
  const kickerText = useConfigKey('t4-03', 'kickerText') as string;
  const kickerSize = useConfigKey('t4-03', 'kickerSize') as number;
  const kickerColor = useConfigKey('t4-03', 'kickerColor') as string;
  const titleText = useConfigKey('t4-03', 'titleText') as string;
  const titleSize = useConfigKey('t4-03', 'titleSize') as number;
  const titleColor = useConfigKey('t4-03', 'titleColor') as string;
  const cardW = useConfigKey('t4-03', 'cardW') as number;
  const cardH = useConfigKey('t4-03', 'cardH') as number;
  const radius = useConfigKey('t4-03', 'radius') as number;
  const cardBg = useConfigKey('t4-03', 'cardBg') as string;
  const borderW = useConfigKey('t4-03', 'borderW') as number;
  const textSize = useConfigKey('t4-03', 'textSize') as number;
  const textColor = useConfigKey('t4-03', 'textColor') as string;
  const gap = useConfigKey('t4-03', 'gap') as number;
  const titleY = useConfigKey('t4-03', 'titleY') as number;
  const rowY = useConfigKey('t4-03', 'rowY') as number;
  const scale = useConfigKey('t4-03', 'scale') as number;
  const posX = (useConfigKey('t4-03', 'posX') as number) ?? 140;
  const posY = (useConfigKey('t4-03', 'posY') as number) ?? 120;

  const DIM = 0.15;
  const DUR = 15; // 500ms @30fps
  const rowW = items.length * cardW + Math.max(0, items.length - 1) * gap;

  // 顶部小标题 + 主标题提前完整显示
  const head = interpolate(frame, [0, 15], [0, 1], {
    easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY, width: rowW,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      {/* 顶部小标题：水平居中对齐整套卡片组 */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: rowW, textAlign: 'center',
        fontSize: kickerSize, fontWeight: 700, color: kickerColor, letterSpacing: 4,
        opacity: head, whiteSpace: 'nowrap', textShadow: '0 3px 12px rgba(0,0,0,0.45)',
      }}>{kickerText}</div>
      {/* 主标题 */}
      <div style={{
        position: 'absolute', left: 0, top: titleY, width: rowW, textAlign: 'center',
        fontSize: titleSize, fontWeight: 800, color: titleColor,
        opacity: head, whiteSpace: 'nowrap', lineHeight: 1,
        textShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}>{titleText}</div>
      {/* 卡片行 + 连接箭头 */}
      <div style={{ position: 'absolute', left: 0, top: rowY, display: 'flex', alignItems: 'center' }}>
        {items.map((it, i) => {
          const color = it.borderColor || '#46e0d0';
          const p = itemProgress(frame, it, i, 10, 36, DUR);
          const o = DIM + (1 - DIM) * p;
          // 第 i 项与第 i-1 项之间的箭头：跟随左侧卡片颜色，与右侧卡片同步点亮
          const prev = i > 0 ? items[i - 1] : null;
          const ap = i > 0 ? itemProgress(frame, items[i], i, 10, 36, DUR) : 0;
          const aColor = prev?.borderColor || color;
          const ao = DIM + (1 - DIM) * ap;
          return (
            <React.Fragment key={`f${i}`}>
              {i > 0 && (
                <div style={{ width: gap, height: 12, display: 'flex', alignItems: 'center', opacity: ao }}>
                  <div style={{ width: Math.max(4, gap - 20), height: 4, background: aColor, borderRadius: 2 }} />
                  <div style={{
                    width: 0, height: 0,
                    borderTop: '6px solid transparent', borderBottom: '6px solid transparent',
                    borderLeft: `20px solid ${aColor}`,
                  }} />
                </div>
              )}
              <div style={{
                ...shell(cardW, cardH, radius, borderW, color, cardBg, p, 0.4, 18, SHADOW_T4_03),
                opacity: o, paddingLeft: 28,
              }}>
                <span style={{ fontSize: textSize * 0.8, fontWeight: 700, color, lineHeight: 1 }}>{'✓'}</span>
                <span style={{
                  marginLeft: 16, fontSize: textSize, fontWeight: 700, color: textColor,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{it.label ?? ''}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- t4-04 横向相加串联卡片（+ 号连接，逐项渐亮） ---------------- */
export const T4_04: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = useConfigList('t4-04', 'items') as { label?: string; at?: string }[];
  const items = raw.length > 0 ? raw : [{ label: '要素一' }];
  const cardW = useConfigKey('t4-04', 'cardW') as number;
  const cardH = useConfigKey('t4-04', 'cardH') as number;
  const radius = useConfigKey('t4-04', 'radius') as number;
  const cardBg = useConfigKey('t4-04', 'cardBg') as string;
  const borderW = useConfigKey('t4-04', 'borderW') as number;
  const borderColor = useConfigKey('t4-04', 'borderColor') as string;
  const textSize = useConfigKey('t4-04', 'textSize') as number;
  const textColor = useConfigKey('t4-04', 'textColor') as string;
  const gap = useConfigKey('t4-04', 'gap') as number;
  const plusSize = useConfigKey('t4-04', 'plusSize') as number;
  const plusColor = useConfigKey('t4-04', 'plusColor') as string;
  const plusW = useConfigKey('t4-04', 'plusW') as number;
  const scale = useConfigKey('t4-04', 'scale') as number;
  const posX = (useConfigKey('t4-04', 'posX') as number) ?? 100;
  const posY = (useConfigKey('t4-04', 'posY') as number) ?? 640;

  const DIM = 0.18;
  const DUR = 14; // 480ms @30fps

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {items.map((it, i) => {
          const p = itemProgress(frame, it, i, 10, 36, DUR);
          const o = DIM + (1 - DIM) * p;
          // 加号与右侧卡片同步点亮
          const ap = i > 0 ? itemProgress(frame, items[i], i, 10, 36, DUR) : 0;
          const ao = DIM + (1 - DIM) * ap;
          return (
            <React.Fragment key={`a${i}`}>
              {i > 0 && (
                <div style={{
                  width: plusW, marginLeft: gap, marginRight: gap, textAlign: 'center',
                  fontSize: plusSize, fontWeight: 700, color: plusColor, opacity: ao, lineHeight: 1,
                  textShadow: '0 3px 12px rgba(0,0,0,0.45)',
                }}>{'+'}</div>
              )}
              <div style={{
                ...shell(cardW, cardH, radius, borderW, borderColor, cardBg, p, 0.35, 16, SHADOW_CYAN),
                opacity: o, paddingLeft: 30,
              }}>
                <span style={{ fontSize: textSize * 0.8, fontWeight: 700, color: borderColor, lineHeight: 1 }}>{'✓'}</span>
                <span style={{
                  marginLeft: 20, fontSize: textSize, fontWeight: 700, color: textColor,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{it.label ?? ''}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- t4-05 横向并列勾选卡片（无连接符，逐项渐亮） ---------------- */
export const T4_05: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = useConfigList('t4-05', 'items') as { label?: string; at?: string }[];
  const items = raw.length > 0 ? raw : [{ label: '要点一' }];
  const cardW = useConfigKey('t4-05', 'cardW') as number;
  const cardH = useConfigKey('t4-05', 'cardH') as number;
  const radius = useConfigKey('t4-05', 'radius') as number;
  const cardBg = useConfigKey('t4-05', 'cardBg') as string;
  const borderW = useConfigKey('t4-05', 'borderW') as number;
  const borderColor = useConfigKey('t4-05', 'borderColor') as string;
  const textSize = useConfigKey('t4-05', 'textSize') as number;
  const textColor = useConfigKey('t4-05', 'textColor') as string;
  const gap = useConfigKey('t4-05', 'gap') as number;
  const scale = useConfigKey('t4-05', 'scale') as number;
  const posX = (useConfigKey('t4-05', 'posX') as number) ?? 120;
  const posY = (useConfigKey('t4-05', 'posY') as number) ?? 630;

  const DIM = 0.18;
  const DUR = 14; // 480ms @30fps

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap }}>
        {items.map((it, i) => {
          const p = itemProgress(frame, it, i, 10, 36, DUR);
          const o = DIM + (1 - DIM) * p;
          return (
            <div key={`p${i}`} style={{
              ...shell(cardW, cardH, radius, borderW, borderColor, cardBg, p, 0.35, 16, SHADOW_CYAN),
              opacity: o, paddingLeft: 28,
            }}>
              <span style={{ fontSize: textSize * 0.8, fontWeight: 700, color: borderColor, lineHeight: 1 }}>{'✓'}</span>
              <span style={{
                marginLeft: 18, fontSize: textSize, fontWeight: 700, color: textColor,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{it.label ?? ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- t4-06 横向序号步骤卡片（序号+主标题+副标题） ---------------- */
export const T4_06: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = useConfigList('t4-06', 'items') as {
    indexText?: string; label?: string; subLabel?: string; borderColor?: string; at?: string;
  }[];
  const items = raw.length > 0 ? raw : [{ indexText: '01', label: '步骤标题', subLabel: '步骤说明', borderColor: '#46e0d0' }];
  const cardW = useConfigKey('t4-06', 'cardW') as number;
  const cardH = useConfigKey('t4-06', 'cardH') as number;
  const radius = useConfigKey('t4-06', 'radius') as number;
  const cardBg = useConfigKey('t4-06', 'cardBg') as string;
  const borderW = useConfigKey('t4-06', 'borderW') as number;
  const padLeft = useConfigKey('t4-06', 'padLeft') as number;
  const gapNum = useConfigKey('t4-06', 'gapNum') as number;
  const gapSub = useConfigKey('t4-06', 'gapSub') as number;
  const numSize = useConfigKey('t4-06', 'numSize') as number;
  const titleSize = useConfigKey('t4-06', 'titleSize') as number;
  const titleColor = useConfigKey('t4-06', 'titleColor') as string;
  const subSize = useConfigKey('t4-06', 'subSize') as number;
  const subColor = useConfigKey('t4-06', 'subColor') as string;
  const gap = useConfigKey('t4-06', 'gap') as number;
  const scale = useConfigKey('t4-06', 'scale') as number;
  const posX = (useConfigKey('t4-06', 'posX') as number) ?? 100;
  const posY = (useConfigKey('t4-06', 'posY') as number) ?? 600;

  const DIM = 0.18;
  const DUR = 15; // 500ms @30fps

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap }}>
        {items.map((it, i) => {
          const color = it.borderColor || '#46e0d0';
          const p = itemProgress(frame, it, i, 10, 36, DUR);
          const o = DIM + (1 - DIM) * p;
          const num = it.indexText ?? String(i + 1).padStart(2, '0');
          return (
            <div key={`s${i}`} style={{
              ...shell(cardW, cardH, radius, borderW, color, cardBg, p, 0.32, 18, SHADOW_STEP),
              opacity: o, paddingLeft: padLeft, paddingRight: 18,
              flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center',
            }}>
              <div style={{ fontSize: numSize, fontWeight: 700, color, lineHeight: 1.1 }}>{num}</div>
              <div style={{
                marginTop: gapNum, fontSize: titleSize, fontWeight: 700, color: titleColor,
                lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
              }}>{it.label ?? ''}</div>
              <div style={{
                marginTop: gapSub, fontSize: subSize, fontWeight: 400, color: subColor,
                lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
              }}>{it.subLabel ?? ''}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- t4-07 横向递进箭头串联步骤卡片（序号+标题+描述，箭头同步点亮） ---------------- */
export const T4_07: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = useConfigList('t4-07', 'items') as {
    index?: string; title?: string; desc?: string; borderColor?: string; at?: string;
  }[];
  const items = raw.length > 0
    ? raw
    : [{ index: '01', title: '拆解目标', desc: '明确关键结果', borderColor: '#46e0d0' }];
  const cardW = useConfigKey('t4-07', 'cardW') as number;
  const cardH = useConfigKey('t4-07', 'cardH') as number;
  const radius = useConfigKey('t4-07', 'radius') as number;
  const cardBg = useConfigKey('t4-07', 'cardBg') as string;
  const borderW = useConfigKey('t4-07', 'borderW') as number;
  const padLeft = useConfigKey('t4-07', 'padLeft') as number;
  const gapNum = useConfigKey('t4-07', 'gapNum') as number;
  const gapDesc = useConfigKey('t4-07', 'gapDesc') as number;
  const numSize = useConfigKey('t4-07', 'numSize') as number;
  const titleSize = useConfigKey('t4-07', 'titleSize') as number;
  const titleColor = useConfigKey('t4-07', 'titleColor') as string;
  const descSize = useConfigKey('t4-07', 'descSize') as number;
  const descColor = useConfigKey('t4-07', 'descColor') as string;
  const gap = useConfigKey('t4-07', 'gap') as number;
  const arrowH = useConfigKey('t4-07', 'arrowH') as number;
  const arrowW = useConfigKey('t4-07', 'arrowW') as number;
  const scale = useConfigKey('t4-07', 'scale') as number;
  const posX = (useConfigKey('t4-07', 'posX') as number) ?? 120;
  const posY = (useConfigKey('t4-07', 'posY') as number) ?? 600;

  const DIM = 0.18;
  const DUR = 15; // 500ms @30fps
  const head = Math.max(10, Math.round(arrowH * 1.6));

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {items.map((it, i) => {
          const color = it.borderColor || '#46e0d0';
          const p = itemProgress(frame, it, i, 10, 36, DUR);
          const o = DIM + (1 - DIM) * p;
          // 箭头：跟随左侧卡片颜色，与右侧卡片同步点亮
          const ap = i > 0 ? p : 0;
          const ao = DIM + (1 - DIM) * ap;
          const aColor = (i > 0 ? items[i - 1]?.borderColor : color) || color;
          return (
            <React.Fragment key={`w${i}`}>
              {i > 0 && (
                <div style={{
                  width: gap, height: arrowH, display: 'flex', alignItems: 'center', opacity: ao,
                  filter: ap > 0 ? `drop-shadow(0 0 ${(8 * ap).toFixed(1)}px ${withAlpha(aColor, 0.45 * ap)})` : 'none',
                }}>
                  <div style={{
                    width: Math.max(4, gap - head), height: arrowW, background: aColor, borderRadius: arrowW / 2,
                  }} />
                  <div style={{
                    width: 0, height: 0,
                    borderTop: `${arrowH / 2}px solid transparent`,
                    borderBottom: `${arrowH / 2}px solid transparent`,
                    borderLeft: `${head}px solid ${aColor}`,
                  }} />
                </div>
              )}
              <div style={{
                ...shell(cardW, cardH, radius, borderW, color, cardBg, p, 0.32, 18, SHADOW_STEP),
                opacity: o, paddingLeft: padLeft, paddingRight: 16,
                flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center',
              }}>
                <div style={{ fontSize: numSize, fontWeight: 700, color, lineHeight: 1.05 }}>{it.index ?? ''}</div>
                <div style={{
                  marginTop: gapNum, fontSize: titleSize, fontWeight: 700, color: titleColor,
                  lineHeight: 1.1, whiteSpace: 'nowrap', maxWidth: '100%',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{it.title ?? ''}</div>
                <div style={{
                  marginTop: gapDesc, fontSize: descSize, fontWeight: 400, color: descColor,
                  lineHeight: 1.15, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{it.desc ?? ''}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- t4-08 横向图标标题卡片（图标自带呼吸光，仅点亮后生效） ---------------- */
export const T4_08: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = useConfigList('t4-08', 'items') as { icon?: string; title?: string; desc?: string; at?: string }[];
  const items = raw.length > 0
    ? raw
    : [{ icon: '⚙', title: '引擎', desc: '稳定可靠内核' }];
  const cardW = useConfigKey('t4-08', 'cardW') as number;
  const cardH = useConfigKey('t4-08', 'cardH') as number;
  const radius = useConfigKey('t4-08', 'radius') as number;
  const cardBg = useConfigKey('t4-08', 'cardBg') as string;
  const borderW = useConfigKey('t4-08', 'borderW') as number;
  const borderColor = useConfigKey('t4-08', 'borderColor') as string;
  const iconSize = useConfigKey('t4-08', 'iconSize') as number;
  const iconGap = useConfigKey('t4-08', 'iconGap') as number;
  const titleSize = useConfigKey('t4-08', 'titleSize') as number;
  const titleColor = useConfigKey('t4-08', 'titleColor') as string;
  const descSize = useConfigKey('t4-08', 'descSize') as number;
  const descColor = useConfigKey('t4-08', 'descColor') as string;
  const gap = useConfigKey('t4-08', 'gap') as number;
  const breathCycle = useConfigKey('t4-08', 'breathCycle') as number;
  const scale = useConfigKey('t4-08', 'scale') as number;
  const posX = (useConfigKey('t4-08', 'posX') as number) ?? 120;
  const posY = (useConfigKey('t4-08', 'posY') as number) ?? 620;

  const DIM = 0.18;
  const DUR = 14; // 480ms @30fps
  const pulse = breathPulse(frame, Math.max(6, Math.round((breathCycle / 1000) * 30)));

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap }}>
        {items.map((it, i) => {
          const p = itemProgress(frame, it, i, 10, 36, DUR);
          const o = DIM + (1 - DIM) * p;
          const glow = 12 * p * (0.45 + 0.55 * pulse);
          return (
            <div key={`i${i}`} style={{
              ...shell(cardW, cardH, radius, borderW, borderColor, cardBg, p, 0.32, 14, SHADOW_CYAN),
              opacity: o, paddingLeft: 28, paddingRight: 20,
            }}>
              <span style={{
                fontSize: iconSize, lineHeight: 1,
                textShadow: glow > 0.2 ? `0 0 ${glow.toFixed(1)}px ${withAlpha(borderColor, 0.85 * p)}` : 'none',
              }}>{it.icon ?? ''}</span>
              <div style={{ marginLeft: iconGap, minWidth: 0 }}>
                <div style={{
                  fontSize: titleSize, fontWeight: 700, color: titleColor, lineHeight: 1.1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{it.title ?? ''}</div>
                <div style={{
                  marginTop: 10, fontSize: descSize, fontWeight: 400, color: descColor, lineHeight: 1.2,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{it.desc ?? ''}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- t4-09 横向标签徽章卡片（短句关键词，快速渐亮） ---------------- */
export const T4_09: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = useConfigList('t4-09', 'items') as { label?: string; at?: string }[];
  const items = raw.length > 0 ? raw : [{ label: '实时渲染' }];
  const cardW = useConfigKey('t4-09', 'cardW') as number;
  const cardH = useConfigKey('t4-09', 'cardH') as number;
  const radius = useConfigKey('t4-09', 'radius') as number;
  const cardBg = useConfigKey('t4-09', 'cardBg') as string;
  const borderW = useConfigKey('t4-09', 'borderW') as number;
  const borderColor = useConfigKey('t4-09', 'borderColor') as string;
  const textSize = useConfigKey('t4-09', 'textSize') as number;
  const textColor = useConfigKey('t4-09', 'textColor') as string;
  const dotR = useConfigKey('t4-09', 'dotR') as number;
  const dotGap = useConfigKey('t4-09', 'dotGap') as number;
  const gap = useConfigKey('t4-09', 'gap') as number;
  const scale = useConfigKey('t4-09', 'scale') as number;
  const posX = (useConfigKey('t4-09', 'posX') as number) ?? 120;
  const posY = (useConfigKey('t4-09', 'posY') as number) ?? 640;

  const DIM = 0.18;
  const DUR = 11; // 380ms @30fps

  /** 按标签字符估算文本宽度：全角≈字号、半角≈0.6 字号（粗体略加余量） */
  const textWidth = (label: string) => {
    let w = 0;
    for (const ch of label) w += ch.charCodeAt(0) > 0x2e80 ? textSize * 1.02 : textSize * 0.6;
    return Math.ceil(w);
  };
  /** 胶囊宽度自适应：固定 cardW 只作最小宽度，长标签自动加宽不截断 */
  const badgeWidth = (label: string) => Math.max(
    cardW,
    Math.ceil(dotR * 2 + dotGap + textWidth(label) + 26 * 2 + borderW * 2 + 8),
  );

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap }}>
        {items.map((it, i) => {
          const p = itemProgress(frame, it, i, 10, 24, DUR);
          const o = DIM + (1 - DIM) * p;
          return (
            <div key={`b${i}`} style={{
              ...shell(badgeWidth(it.label ?? ''), cardH, radius, borderW, borderColor, cardBg, p, 0.3, 12, SHADOW_CYAN),
              opacity: o, paddingLeft: 26, paddingRight: 26,
            }}>
              <span style={{
                width: dotR * 2, height: dotR * 2, borderRadius: '50%', background: borderColor,
                flex: '0 0 auto',
              }} />
              <span style={{
                marginLeft: dotGap, fontSize: textSize, fontWeight: 700, color: textColor,
                whiteSpace: 'nowrap',
              }}>{it.label ?? ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
