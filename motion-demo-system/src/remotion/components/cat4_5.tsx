import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONT_STACK } from '../theme';
import { useEnter, useEnterOpacity, useBreath, easeOutExpo, atFrames } from '../anim';
import { useConfigKey, useConfigList } from '../config';
import { weightNum, measureText } from '../measure';
import { tint, mixColor, ringSegmentPaths, renderKeyParts, WrappedText, withAlpha, stripKeyText } from './shared';

const base: React.CSSProperties = { position: 'absolute', fontFamily: FONT_STACK, whiteSpace: 'nowrap' };

interface TextProps {
  x: number; y: number; size: number; weight?: 'Heavy' | 'Bold' | 'Regular';
  color: string; text: string; opacity?: number; translateY?: number; letterSpacing?: number;
  maxWidth?: number; wrap?: boolean; lineHeight?: number;
  /** 重点文字颜色：文本含 {{重点}} 标记时用该色绘制重点片段。 */
  hl?: string;
}
export const T: React.FC<TextProps> = ({ x, y, size, weight = 'Heavy', color, text, opacity = 1, translateY = 0, letterSpacing = 0, maxWidth, wrap = false, lineHeight, hl }) => {
  const shared: React.CSSProperties = {
    ...base, left: x, top: y, fontSize: size, fontWeight: weightNum(weight), color,
    opacity, transform: `translateY(${translateY}px)`, letterSpacing,
    textShadow: '0 3px 12px rgba(0,0,0,0.45)',
  };
  // 多行正文改为手动折行：浏览器原生折行在导出重绘器里断点会漂移。
  if (wrap && maxWidth) {
    return (
      <WrappedText
        text={text} size={size} maxWidth={maxWidth} baseWeight={weight} hlColor={hl}
        lineHeight={lineHeight ?? 1.35} style={shared}
      />
    );
  }
  return <div style={{ ...shared, whiteSpace: 'nowrap', maxWidth, lineHeight }}>{renderKeyParts(text, hl)}</div>;
};

/* ---------------- t4-01 模块内四步横向流程 ---------------- */
export const T4_01: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const steps = useConfigList('t4-01', 'steps') as { n: string; t: string; d: string }[];
  const titleSize = useConfigKey('t4-01', 'titleSize') as number;
  const stepTitle = useConfigKey('t4-01', 'subSize') as number;
  const descSize = useConfigKey('t4-01', 'descSize') as number;
  const accent = useConfigKey('t4-01', 'accentColor') as string;
  const titleColor = useConfigKey('t4-01', 'titleColor') as string;
  const titleText = useConfigKey('t4-01', 'titleText') as string;
  const hl = useConfigKey('t4-01', 'hlColor') as string;
  const list = steps.length > 0 ? steps : [{ n: '01', t: '步骤', d: '-' }];
  const posX = (useConfigKey('t4-01', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t4-01', 'posY') as number) ?? 240;
  const configScale = (useConfigKey('t4-01', 'scale') as number) ?? 100;
  const colW = (useConfigKey('t4-01', 'colW') as number) ?? 220;   // 列宽下限（配置）
  const gap = (useConfigKey('t4-01', 'colGap') as number) ?? 64;   // 步骤间距（配置）
  const numSize = 30, lineH = 3;
  // 每列宽度：配置下限与实测标题宽度取大者——标题不折行，长标题自动加宽该列
  const colWidths = list.map((s) => Math.max(colW, Math.ceil(measureText(`${s.t ?? ''}`, stepTitle, 'Bold'))));
  const colX = list.map((_, i) => colWidths.slice(0, i).reduce((a, b) => a + b, 0) + i * gap);
  const rowTop = titleSize + 52;
  const lineY = rowTop + numSize + 22;             // 横线在序号文字下方
  const colTitleY = numSize + 22 + lineH + 6;     // 相对步骤块顶部：标题紧贴横线正下方
  const colDescY = colTitleY + stepTitle + 14;     // 正文在标题下方
  const line0 = 0;                                 // 主线左端与首个序号文字对齐
  const lineW = colX[list.length - 1] + colWidths[list.length - 1]; // 右端与最后一个步骤块右边界对齐
  // 发光亮点沿主线从左到右循环移动
  const period = 90, p = (frame % period) / period;
  const dotX = line0 + p * lineW;
  // 步骤点亮：优先按 row.at（秒）定时出现；无 at 时回退与光点位置同步（光点到达后约 8 帧渐亮）
  const hasAt = list.some((s) => Number.isFinite(Number((s as { at?: unknown }).at)));
  const lit = (i: number) => {
    if (hasAt) {
      const d = frame - atFrames(list[i], i, 0, 0);
      if (d < 0) return 0.3;
      return 0.3 + 0.7 * Math.min(1, d / 8);
    }
    const frac = colX[i] / lineW; // 步骤 i 在主线上的位置比例
    const d = p - frac;
    if (d < 0) return 0.3;                       // 光点未到：保持半透明
    return 0.3 + 0.7 * Math.min(1, d * (period / 8));
  };
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${configScale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={COLORS.textPrimary} text={titleText}
        opacity={title.opacity} translateY={title.translateY} hl={hl} />
      {/* 贯穿各序号的下方主线 */}
      <div style={{
        position: 'absolute', left: line0, top: lineY, width: lineW, height: lineH,
        background: tint(accent, 0.33), borderRadius: 2, opacity: 0.8,
      }} />
      {/* 线上从左到右循环移动的发光亮点 */}
      <div style={{
        position: 'absolute', left: dotX, top: lineY + lineH / 2, width: 9, height: 9,
        borderRadius: '50%', transform: 'translate(-4.5px, -4.5px)',
        background: accent, boxShadow: `0 0 10px ${accent}, 0 0 22px ${tint(accent, 0.53)}`,
      }} />
      {list.map((s, i) => {
        const o = lit(i);
        return (
          <div key={i} style={{ position: 'absolute', left: colX[i], top: rowTop, width: colWidths[i] }}>
            {/* 序号文字：纯文字，无外圈，跟强调色 */}
            <div style={{
              fontSize: numSize, fontWeight: 800, color: accent, letterSpacing: 2,
              opacity: o, textShadow: `0 0 10px ${tint(accent, 0.27)}`,
            }}>{s.n || String(i + 1).padStart(2, '0')}</div>
            {/* 步骤标题（横线下方，不折行；列宽已按实测加宽；行高显式 1.2 保证行框可预测） */}
            <T x={0} y={colTitleY} size={stepTitle} weight="Bold" color={titleColor} text={s.t}
              opacity={o} lineHeight={1.2} />
            {/* 步骤正文（横线下方，列宽内折行） */}
            <T x={0} y={colDescY} size={descSize} weight="Regular" color={COLORS.textSecondary}
              text={s.d} opacity={o * 0.95} wrap maxWidth={colWidths[i]} />
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t5-01 圆点标记竖向清单 ---------------- */
export const T5_01: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const items = useConfigList('t5-01', 'items');
  const titleSize = useConfigKey('t5-01', 'titleSize') as number;
  const rowTitle = useConfigKey('t5-01', 'subSize') as number;
  const descSize = useConfigKey('t5-01', 'descSize') as number;
  const descColor = useConfigKey('t5-01', 'descColor') as string;
  const accent = useConfigKey('t5-01', 'accentColor') as string;
  const titleColor = useConfigKey('t5-01', 'titleColor') as string;
  const titleText = useConfigKey('t5-01', 'titleText') as string;
  const hl = useConfigKey('t5-01', 'hlColor') as string;
  const posX = (useConfigKey('t5-01', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t5-01', 'posY') as number) ?? 220;
  const configScale = (useConfigKey('t5-01', 'scale') as number) ?? 100;
  const itemGap = 48;    // 条目间空隙
  const descW = 530;     // 说明文字折行宽度
  const descLH = 1.5;    // 说明行高
  // 弹性排列：按每条实际高度累加定位，条目间距随显示内容自动伸展
  const titleRowH = Math.max(16, rowTitle);
  const itemHeights = items.map((it) => {
    const dw = measureText(`${it.d ?? ''}`, descSize, 'Regular');
    const lines = Math.max(1, Math.ceil(dw / descW));
    return titleRowH + 10 + lines * descSize * descLH;
  });
  const itemTops = items.map((_, i) => {
    const prev = i === 0 ? 0 : itemHeights.slice(0, i).reduce((a, b) => a + b, 0);
    return titleSize + 56 + prev + i * itemGap;
  });
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${configScale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={COLORS.textPrimary} text={titleText}
        opacity={title.opacity} translateY={title.translateY} hl={hl} />
      {items.map((it, i) => {
        const o = useEnterOpacity(frame, atFrames(it, i, 18, 16));
        const markerB = useBreath(frame, 1 + i * 0.2, 1, 0.08);
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: itemTops[i], opacity: o, width: 590 }}>
            {/* 圆点与标题同层 flex 布局，alignItems:center 保证中线对齐 */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                flex: 'none', width: 16, height: 16, marginRight: 10, borderRadius: '50%',
                background: accent, transform: `scale(${markerB})`, transformOrigin: 'center center',
                boxShadow: `0 0 8px ${tint(accent, 0.5)}`,
              }} />
              <div style={{ fontFamily: FONT_STACK, fontSize: rowTitle, fontWeight: weightNum('Bold'),
                color: titleColor, whiteSpace: 'nowrap', lineHeight: 1, textShadow: '0 3px 12px rgba(0,0,0,0.45)' }}>{it.t}</div>
            </div>
            <WrappedText
              text={String(it.d ?? '')} size={descSize} maxWidth={530} baseWeight="Regular" lineHeight={1.5}
              style={{ marginLeft: 26, marginTop: 10, fontSize: descSize, fontWeight: weightNum('Regular'),
                color: descColor, textShadow: '0 3px 12px rgba(0,0,0,0.45)' }}
            />
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t5-02 三色状态标签条目清单 ---------------- */
export const T5_02: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const items = useConfigList('t5-02', 'items');
  const titleSize = useConfigKey('t5-02', 'titleSize') as number;
  const rowTitle = useConfigKey('t5-02', 'subSize') as number;
  const tColor = useConfigKey('t5-02', 'tColor') as string;
  const tagSize = useConfigKey('t5-02', 'tagSize') as number;
  const descSize = useConfigKey('t5-02', 'descSize') as number;
  const descColor = useConfigKey('t5-02', 'descColor') as string;
  const titleText = useConfigKey('t5-02', 'titleText') as string;
  const hl = useConfigKey('t5-02', 'hlColor') as string;
  const fallback = useConfigKey('t5-02', 'accentColor') as string;
  const posX = (useConfigKey('t5-02', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t5-02', 'posY') as number) ?? 240;
  const configScale = (useConfigKey('t5-02', 'scale') as number) ?? 100;
  // 标题固定起点：不管左侧标签宽度如何，条目标题都左对齐
  const titleX = 190;
  const lineH = Math.max(tagSize + 6, rowTitle);   // 标签盒高=字号+padding(4)+边框(2)
  const tagTop = (lineH - (tagSize + 6)) / 2;
  const titleTop = (lineH - rowTitle) / 2;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${configScale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={COLORS.textPrimary} text={titleText}
        opacity={title.opacity} translateY={title.translateY} hl={hl} />
      {items.map((it, i) => {
        const o = useEnterOpacity(frame, atFrames(it, i, 18, 16));
        const cB = useBreath(frame, 1 + i * 0.2, 1, 0.1);
        const color = (it.color as string) || fallback;
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: titleSize + 56 + i * 112, opacity: o, width: 600 }}>
            {/* 标签与标题同层，absolute 固定起点，中线对齐且标题不受标签宽度影响 */}
            <span style={{
              position: 'absolute', left: 0, top: tagTop, padding: '2px 10px', borderRadius: 6,
              background: tint(color, 0.13), border: `1px solid ${color}`,
              opacity: 0.85 * cB, fontSize: tagSize, fontWeight: 700, color, letterSpacing: 1,
              lineHeight: 1, whiteSpace: 'nowrap',
            }}>{it.tag}</span>
            <div style={{ position: 'absolute', left: titleX, top: titleTop, fontFamily: FONT_STACK,
              fontSize: rowTitle, fontWeight: weightNum('Bold'), color: tColor, lineHeight: 1,
              whiteSpace: 'nowrap', textShadow: '0 3px 12px rgba(0,0,0,0.45)' }}>{it.t}</div>
            <WrappedText
              text={String(it.d ?? '')} size={descSize} maxWidth={410} baseWeight="Regular" lineHeight={1.5}
              style={{ position: 'absolute', left: titleX, top: lineH + 12, fontSize: descSize,
                fontWeight: weightNum('Regular'), color: descColor, textShadow: '0 3px 12px rgba(0,0,0,0.45)' }}
            />
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t5-03 数字序号竖向列表 ---------------- */
export const T5_03: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const items = useConfigList('t5-03', 'items');
  const titleSize = useConfigKey('t5-03', 'titleSize') as number;
  const rowTitle = useConfigKey('t5-03', 'subSize') as number;
  const numSize = useConfigKey('t5-03', 'numSize') as number;
  const descSize = useConfigKey('t5-03', 'descSize') as number;
  const descColor = useConfigKey('t5-03', 'descColor') as string;
  const accent = useConfigKey('t5-03', 'accentColor') as string;
  const titleColor = useConfigKey('t5-03', 'titleColor') as string;
  const titleText = useConfigKey('t5-03', 'titleText') as string;
  const hl = useConfigKey('t5-03', 'hlColor') as string;
  const posX = (useConfigKey('t5-03', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t5-03', 'posY') as number) ?? 200;
  const configScale = (useConfigKey('t5-03', 'scale') as number) ?? 100;
  const itemGap = 48;   // 条目间空隙
  const descW = 700;    // 说明文字折行宽度（接近组件宽度）
  const descLH = 1.4;   // 说明行高
  const titleGap = 56;  // 大标题与首个条目的间距
  // 弹性排列：按每条实际高度累加定位，条目间距随显示内容自动伸展
  const itemHeights = items.map((it) => {
    const dw = measureText(`${it.d ?? ''}`, descSize, 'Regular');
    const lines = Math.max(1, Math.ceil(dw / descW));
    return Math.max(numSize, rowTitle + 10 + lines * descSize * descLH);
  });
  const itemTops = items.map((_, i) => {
    const prev = i === 0 ? 0 : itemHeights.slice(0, i).reduce((a, b) => a + b, 0);
    return titleSize + titleGap + prev + i * itemGap;
  });
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transformOrigin: 'top left', transform: `scale(${configScale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={COLORS.textPrimary} text={titleText}
        opacity={title.opacity} translateY={title.translateY} hl={hl} />
      {items.map((it, i) => {
        const d = atFrames(it, i, 18, 14);
        const numO = useEnterOpacity(frame, d);
        const tO = useEnterOpacity(frame, d + 12);
        const dO = useEnterOpacity(frame, d + 22);
        const numB = useBreath(frame, 1 + i * 0.2, 1, 0.08);
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: itemTops[i] }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: 42, opacity: numO }}>
              <span style={{ fontSize: numSize, fontWeight: 700, color: accent, opacity: 0.9 * numB }}>{it.n}</span>
            </div>
            <div style={{ position: 'absolute', left: 54, top: 0, opacity: tO, width: 700 }}>
              <div style={{ fontSize: rowTitle, fontWeight: 700, color: titleColor, whiteSpace: 'nowrap', lineHeight: 1 }}>{it.t}</div>
              <WrappedText
                text={String(it.d ?? '')} size={descSize} maxWidth={descW} baseWeight="Regular" lineHeight={1.4}
                style={{ fontSize: descSize, fontWeight: 400, color: descColor, marginTop: 10, opacity: dO }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t5-05 侧边竖向堆叠标签卡片组 ---------------- */
export const T5_05: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = useConfigList('t5-05', 'cards') as { small: string; main: string; color: string }[];
  const list = cards.length > 0 ? cards : [{ small: '小标题', main: '大标题', color: '#ffaa44' }];
  const smallSize = useConfigKey('t5-05', 'smallSize') as number;
  const smallColor = useConfigKey('t5-05', 'smallColor') as string;
  const mainSize = useConfigKey('t5-05', 'mainSize') as number;
  const mainColor = useConfigKey('t5-05', 'mainColor') as string;
  const cardBg = useConfigKey('t5-05', 'cardBg') as string;
  const cardW = useConfigKey('t5-05', 'cardW') as number;
  const gap = useConfigKey('t5-05', 'gap') as number;
  const scale = useConfigKey('t5-05', 'scale') as number;
  const posX = (useConfigKey('t5-05', 'posX') as number) ?? 60;
  const posY = (useConfigKey('t5-05', 'posY') as number) ?? 80;

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY, transform: `scale(${scale / 100})`, transformOrigin: 'top left',
      display: 'flex', flexDirection: 'column', gap,
    }}>
      {list.map((c, i) => {
        // 卡片依次入场：前一张完整显示(520ms)后触发下一张；row.at 优先（秒→帧）
        const d = atFrames(c, i, 0, 16);                     // 每张入场起始帧
        const cardP = interpolate(frame, [d, d + 16], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        // 小标题在卡片淡入完成后淡入（320ms≈10帧）
        const smallO = interpolate(frame, [d + 17, d + 27], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        // 大标题在小标题显示后淡入 + 从下方上移（380ms≈11帧）
        const mainO = interpolate(frame, [d + 28, d + 39], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const mainY = interpolate(frame, [d + 28, d + 39], [6, 0], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            position: 'relative', width: cardW, boxSizing: 'border-box', borderRadius: 14,
            background: cardBg, padding: '28px 32px', overflow: 'hidden',
            opacity: cardP, transform: `translateX(${-24 * (1 - cardP)}px)`,
          }}>
            {/* 左侧彩色装饰竖边条（独立配色） */}
            <div style={{
              position: 'absolute', left: 0, top: 0, width: 12, height: '100%',
              borderRadius: '14px 0 0 14px', background: c.color, opacity: 0.96 * cardP,
            }} />
            {/* 上方小标题 */}
            <div style={{
              fontSize: smallSize, fontWeight: 400, color: smallColor, opacity: 0.9 * smallO,
              textShadow: '0 2px 6px rgba(0,0,0,0.35)', lineHeight: 1, whiteSpace: 'nowrap',
            }}>{c.small}</div>
            {/* 下方重点大标题 */}
            <div style={{
              fontSize: mainSize, fontWeight: 700, color: mainColor, marginTop: 12,
              opacity: mainO, transform: `translateY(${mainY}px)`,
              textShadow: '0 3px 8px rgba(0,0,0,0.45)', lineHeight: 1, whiteSpace: 'nowrap',
            }}>{c.main}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t5-04 双列Key-Value信息清单 ---------------- */
export const T5_04: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useEnter(frame, 0, 30, 20);
  const rows = useConfigList('t5-04', 'items');
  const titleSize = useConfigKey('t5-04', 'titleSize') as number;
  const fieldSize = useConfigKey('t5-04', 'subSize') as number;
  const accent = useConfigKey('t5-04', 'accentColor') as string;
  const valColor = useConfigKey('t5-04', 'subColor') as string;
  const titleText = useConfigKey('t5-04', 'titleText') as string;
  const hl = useConfigKey('t5-04', 'hlColor') as string;
  const posX = (useConfigKey('t5-04', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t5-04', 'posY') as number) ?? 240;
  const configScale = (useConfigKey('t5-04', 'scale') as number) ?? 100;
  const keyW = 170;    // Key 列固定宽度
  const valMaxW = 1200; // Value 显示区域宽度（400 → 800 → 1200）
  const rowGap = Math.round(fieldSize * 0.8); // 条目间空隙约 0.8 倍字段字号（原固定 48 相对默认 25px 字号过大）
  const valLH = 1.35;  // Value 行高
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, width: keyW + valMaxW, transformOrigin: 'top left', transform: `scale(${configScale / 100})` }}>
      <T x={0} y={0} size={titleSize} weight="Heavy" color={COLORS.textPrimary} text={titleText}
        opacity={title.opacity} translateY={title.translateY} hl={hl} />
      {/* 瀑布排列：常规流逐行堆叠，由浏览器按实际内容计算高度，上面文字换行不会挤占下面条目 */}
      {rows.map((r, i) => {
        const d = atFrames(r, i, 18, 10);
        const kO = useEnterOpacity(frame, d);
        const vO = useEnterOpacity(frame, d + 10);
        return (
          <div key={i} style={{ marginTop: i === 0 ? titleSize + 56 : rowGap }}>
            <span style={{ display: 'inline-block', width: keyW, verticalAlign: 'top', lineHeight: valLH, fontSize: fieldSize, fontWeight: 700, color: accent, opacity: kO }}>{r.k}</span>
            <WrappedText
              text={String(r.v ?? '')} size={fieldSize} maxWidth={valMaxW} baseWeight="Regular" lineHeight={valLH}
              style={{ display: 'inline-block', verticalAlign: 'top', fontSize: fieldSize, fontWeight: 400, color: valColor, opacity: vO }}
            />
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t5-06 多信息条目列表（标签在上/标题在下，横向排列 + 呼吸横线） ---------------- */
export const T5_06: React.FC = () => {
  const frame = useCurrentFrame();
  const items = useConfigList('t5-06', 'items') as { label: string; title: string; color?: string }[];
  const list = items.length > 0 ? items : [{ label: '01 / 标签', title: '条目标题', color: '#FF5580' }];
  const titleText = useConfigKey('t5-06', 'titleText') as string;
  const hl = useConfigKey('t5-06', 'hlColor') as string;
  const titleSize = useConfigKey('t5-06', 'titleSize') as number;
  const titleColor = useConfigKey('t5-06', 'titleColor') as string;
  const labelSize = useConfigKey('t5-06', 'labelSize') as number;
  const labelColor = useConfigKey('t5-06', 'labelColor') as string;
  const itemSize = useConfigKey('t5-06', 'itemSize') as number;
  const itemColor = useConfigKey('t5-06', 'itemColor') as string;
  const lineW = useConfigKey('t5-06', 'lineW') as number;
  const lineH = useConfigKey('t5-06', 'lineH') as number;
  const lineColor2 = useConfigKey('t5-06', 'lineColor2') as string;
  const colW = useConfigKey('t5-06', 'colW') as number;
  const labelGap = useConfigKey('t5-06', 'labelGap') as number;
  const lineGap = useConfigKey('t5-06', 'lineGap') as number;
  const itemGap = useConfigKey('t5-06', 'itemGap') as number;
  const scale = useConfigKey('t5-06', 'scale') as number;
  const posX = (useConfigKey('t5-06', 'posX') as number) ?? 130;
  const posY = (useConfigKey('t5-06', 'posY') as number) ?? 200;

  // 主标题最先入场（550ms，淡入 + 下移），带低强度RGB偏移色差描边
  const titleO = interpolate(frame, [0, 17], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 17], [-10, 0], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const SH_TITLE = `-5px 0 0 rgba(255,45,85,0.45), 5px 0 0 rgba(60,180,255,0.4), 0 4px 10px rgba(0,0,0,0.5)`;
  const SH = '0 3px 9px rgba(0,0,0,0.45)';

  // 条目行相对标题上沿的纵向偏移
  const rowTop = titleSize + 64;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transform: `scale(${scale / 100})`, transformOrigin: 'top left' }}>
      <div style={{ fontSize: titleSize, fontWeight: 700, color: titleColor,
        opacity: titleO, transform: `translateY(${titleY}px)`, textShadow: SH_TITLE, whiteSpace: 'nowrap', lineHeight: 1 }}>
        {renderKeyParts(titleText, hl)}
      </div>
      <div style={{ position: 'absolute', left: 0, top: rowTop, display: 'flex', gap: itemGap, alignItems: 'flex-start' }}>
        {list.map((n, i) => {
          // 每条依次入场：淡入 + 从下方上浮；row.at 优先（秒→帧）
          const delay = atFrames(n, i, 14, 12);
          const o = interpolate(frame, [delay, delay + 14], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const up = interpolate(frame, [delay, delay + 14], [16, 0], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          // 横线呼吸伸缩：宽度围绕基础值 ±15% 伸缩（先缩后放），周期约1s，条目间错开相位
          const breath = 0.8 + 0.15 * Math.sin((frame + i * 12) / 30 * Math.PI * 2);
          const c = n.color || labelColor;
          return (
            <div key={`s${i}`} style={{ width: colW, opacity: o, transform: `translateY(${up}px)` }}>
              {/* 上一行：红色标签 */}
              <div style={{ fontSize: labelSize, fontWeight: 600, color: c, textShadow: SH, whiteSpace: 'nowrap' }}>{n.label ?? ''}</div>
              {/* 下一行：条目标题（允许换行） */}
              <WrappedText
                text={String(n.title ?? '')} size={itemSize} maxWidth={colW} baseWeight="Bold" lineHeight={1.3}
                style={{ marginTop: labelGap, fontSize: itemSize, fontWeight: 700, color: itemColor, textShadow: SH }}
              />
              {/* 标题下方装饰横线（呼吸伸缩：宽度随正弦先缩后放 + 玫红→淡紫渐变） */}
              <div style={{ marginTop: lineGap, width: lineW * breath, height: lineH, borderRadius: lineH / 2,
                background: `linear-gradient(90deg, ${c}, ${lineColor2})`,
                opacity: 0.9 + 0.1 * (breath - 0.65) / 0.35, transformOrigin: 'left' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- t4-02 渐变节点阶段演进时间轴 ---------------- */
export const T4_02: React.FC = () => {
  const frame = useCurrentFrame();
  const titleText = useConfigKey('t4-02', 'titleText') as string;
  const hl = useConfigKey('t4-02', 'hlColor') as string;
  const titleSize = useConfigKey('t4-02', 'titleSize') as number;
  const titleColor = useConfigKey('t4-02', 'titleColor') as string;
  const frameColor = useConfigKey('t4-02', 'frameColor') as string;
  const lineC1 = useConfigKey('t4-02', 'lineC1') as string;
  const lineC2 = useConfigKey('t4-02', 'lineC2') as string;
  const lineC3 = useConfigKey('t4-02', 'lineC3') as string;
  const ringColor = useConfigKey('t4-02', 'ringColor') as string;
  const ringR = useConfigKey('t4-02', 'ringR') as number;
  const cnSize = useConfigKey('t4-02', 'cnSize') as number;
  const cnColor = useConfigKey('t4-02', 'cnColor') as string;
  const enSize = useConfigKey('t4-02', 'enSize') as number;
  const enColor = useConfigKey('t4-02', 'enColor') as string;
  const scale = useConfigKey('t4-02', 'scale') as number;
  const posX = (useConfigKey('t4-02', 'posX') as number) ?? 70;
  const posY = (useConfigKey('t4-02', 'posY') as number) ?? 320;
  const nodes = useConfigList('t4-02', 'nodes') as { cn: string; en: string; color: string; at?: string }[];
  const list = nodes.length > 0 ? nodes : [{ cn: '阶段', en: 'STAGE', color: '#36d8f0' }];

  // 设计稿坐标（1920×1080 整屏，缩放系数 scale 映射到左侧安全区）
  const FRAME_X = 40, FRAME_Y = 100, FRAME_W = 1840, FRAME_H = 840;
  const TITLE_X = 80, TITLE_Y = 160;
  const LINE_X1 = 70, LINE_X2 = 1850, LINE_Y = 440;   // 主时间轴线
  const NODE_L = 240, NODE_R = 1560;                    // 节点横向分布范围
  const innerR = ringR - 8;                             // 内圆半径 = 外环半径 - 描边8
  const lineW = LINE_X2 - LINE_X1;
  // 节点横坐标：在 NODE_L~NODE_R 间均匀分布（默认4节点即 240/680/1120/1560）
  const nX = (i: number) => NODE_L + (i / Math.max(1, list.length - 1)) * (NODE_R - NODE_L);

  // 边框淡入（0.45）
  const frameO = interpolate(frame, [0, 16], [0, 0.45], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 标题淡入 + 上移（0.9）
  const titleO = interpolate(frame, [6, 20], [0, 0.9], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [6, 20], [8, 0], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 主时间轴从左向右生长（1100ms）
  const lineP = interpolate(frame, [10, 43], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const gradient = `linear-gradient(90deg, ${lineC1}, ${lineC2}, ${lineC3})`;
  const SH = '0 2px 7px rgba(0,0,0,0.4)';

  // 标签垂直位置：中文在节点正下方 offsetY=100，英文在中文下方 offsetY=180
  const cnTop = LINE_Y + 100;
  const enTop = LINE_Y + 180;
  return (
    <div style={{ position: 'absolute', left: posX, top: posY, transform: `scale(${scale / 100})`, transformOrigin: 'top left' }}>
      {/* 外层装饰圆角边框（仅描边） */}
      <div style={{
        position: 'absolute', left: FRAME_X, top: FRAME_Y, width: FRAME_W, height: FRAME_H,
        borderRadius: 24, border: '3px solid ' + frameColor, opacity: frameO, boxSizing: 'border-box',
      }} />
      {/* 左上角英文标题 */}
      <div style={{
        position: 'absolute', left: TITLE_X, top: TITLE_Y, fontSize: titleSize, fontWeight: 400,
        color: titleColor, opacity: titleO, transform: `translateY(${titleY}px)`,
        textShadow: '0 0 12px rgba(180,200,224,0.25)', letterSpacing: 2, whiteSpace: 'nowrap',
      }}>{renderKeyParts(titleText, hl)}</div>
      {/* 主时间轴线（固定渐变，从左侧向右侧截断生长） */}
      <div style={{ position: 'absolute', left: LINE_X1, top: LINE_Y - 4, width: lineW * lineP, height: 8, overflow: 'hidden' }}>
        <div style={{ width: lineW, height: 8, background: gradient, opacity: 0.92, borderRadius: 4 }} />
      </div>
      {list.map((n, i) => {
        // 节点出现时机：条目 at（秒）优先；缺省回退原几何节奏
        // （原 delay = 10 + 33*reach + 3，均匀分布时 reach = i/(n-1)，即 13 + 33*i/(n-1)）
        const delay = atFrames(n, i, 13, 33 / Math.max(1, list.length - 1));
        const ns = interpolate(frame, [delay, delay + 14], [0, 1], { easing: Easing.out(Easing.back(1.6)), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const no = interpolate(frame, [delay, delay + 10], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        // 标签在节点弹出后淡入 + 上移（450ms）
        const lO = interpolate(frame, [delay + 6, delay + 19], [0, 1], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const lY = interpolate(frame, [delay + 6, delay + 19], [10, 0], { easing: easeOutExpo, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        // 节点外圈径向发光呼吸：透明度 0.35↔0.55，周期 1300ms(39帧)，错开相位
        const glowO = 0.35 + 0.20 * (0.5 + 0.5 * Math.sin(((frame - i * 8) / 39) * Math.PI * 2));
        return (
          <div key={`s${i}`} style={{ position: 'absolute', left: 0, top: 0 }}>
            {/* 径向发光光晕 */}
            <div style={{
              position: 'absolute', left: nX(i) - ringR, top: LINE_Y - ringR, width: ringR * 2, height: ringR * 2,
              borderRadius: '50%', boxShadow: `0 0 22px 12px ${n.color}`, opacity: glowO * no,
            }} />
            {/* 外层深色圆环 */}
            <div style={{
              position: 'absolute', left: nX(i) - ringR, top: LINE_Y - ringR, width: ringR * 2, height: ringR * 2,
              borderRadius: '50%', border: '6px solid ' + ringColor, background: 'transparent',
              boxSizing: 'border-box', opacity: no, transform: `scale(${ns})`,
            }} />
            {/* 内部填充圆（节点色） */}
            <div style={{
              position: 'absolute', left: nX(i) - innerR, top: LINE_Y - innerR, width: innerR * 2, height: innerR * 2,
              borderRadius: '50%', background: n.color, opacity: no, transform: `scale(${ns})`,
            }} />
            {/* 中文标签 */}
            <div style={{
              position: 'absolute', left: nX(i), top: cnTop, transform: `translate(-50%, ${lY}px)`,
              fontSize: cnSize, fontWeight: 700, color: cnColor, opacity: lO, whiteSpace: 'nowrap',
              textShadow: SH, lineHeight: 1,
            }}>{n.cn}</div>
            {/* 英文标签 */}
            <div style={{
              position: 'absolute', left: nX(i), top: enTop, transform: `translate(-50%, ${lY}px)`,
              fontSize: enSize, fontWeight: 400, color: enColor, opacity: lO * 0.82, whiteSpace: 'nowrap',
              letterSpacing: 3, lineHeight: 1,
            }}>{n.en}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t5-07 纵向图标要点列表（线框图标描边绘制·数组扩展） ---------------- */

/** 内置线框图标（72×72 viewBox，单 path 多子路径，支持描边绘制动画） */
const T5_07_ICONS: Record<string, string> = {
  layerStack: 'M36 10 L62 22 L36 34 L10 22 Z M10 30 L36 42 L62 30 M10 40 L36 52 L62 40',
  bubbleChat: 'M14 14 H58 A6 6 0 0 1 64 20 V42 A6 6 0 0 1 58 48 H30 L18 60 V48 H14 A6 6 0 0 1 8 42 V20 A6 6 0 0 1 14 14 Z',
  foldMap: 'M12 14 L28 8 L44 14 L60 8 V54 L44 60 L28 54 L12 60 Z M28 8 V54 M44 14 V60',
};

export const T5_07: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = useConfigList('t5-07', 'items') as { icon?: string; title?: string; desc?: string; at?: string }[];
  const items = raw.length > 0 ? raw : [{ icon: 'layerStack', title: '本地高速推理', desc: '模型本地运行，降低云端依赖与调用成本。' }];
  const iconSize = useConfigKey('t5-07', 'iconSize') as number;
  const iconStroke = useConfigKey('t5-07', 'iconStroke') as number;
  const iconColor = useConfigKey('t5-07', 'iconColor') as string;
  const titleSize = useConfigKey('t5-07', 'titleSize') as number;
  const titleColor = useConfigKey('t5-07', 'titleColor') as string;
  const descSize = useConfigKey('t5-07', 'descSize') as number;
  const descColor = useConfigKey('t5-07', 'descColor') as string;
  const gapIcon = useConfigKey('t5-07', 'gapIcon') as number;
  const gapTitle = useConfigKey('t5-07', 'gapTitle') as number;
  const vGap = useConfigKey('t5-07', 'vGap') as number;
  const descWidth = useConfigKey('t5-07', 'descWidth') as number;
  const drawMs = useConfigKey('t5-07', 'drawMs') as number;
  const scale = useConfigKey('t5-07', 'scale') as number;
  const posX = (useConfigKey('t5-07', 'posX') as number) ?? 100;
  const posY = (useConfigKey('t5-07', 'posY') as number) ?? 140;

  const drawFrames = Math.max(8, Math.round((drawMs / 1000) * 30));
  const clampOpt = { easing: easeOutExpo, extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
  // 条目块高（标题 + 间距 + 描述实际行数），纵向按实际高度累积排布
  const blockHs = items.map((it) => {
    const descLines = Math.max(1, Math.ceil(measureText(stripKeyText(it.desc ?? ''), descSize, 'Regular') / Math.max(80, descWidth)));
    return titleSize * 1.15 + gapTitle + descLines * descSize * 1.4;
  });
  const yTop = (i: number) => blockHs.slice(0, i).reduce((a, b) => a + b, 0) + i * vGap;

  // 各条目入场帧（at 秒优先，缺省均摊）；当前条目 = 最后一个完成图标绘制的条目
  const arrives = items.map((it, i) => atFrames(it, i, 8, 14));
  let activeIdx = -1;
  for (let i = 0; i < items.length; i += 1) if (frame >= arrives[i] + drawFrames) activeIdx = i;
  const pulse = 0.5 + 0.5 * Math.sin((frame / 45) * Math.PI * 2);

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT_STACK,
    }}>
      {items.map((it, i) => {
        const d = arrives[i];
        const blockH = blockHs[i];
        const iconPath = T5_07_ICONS[stripKeyText(it.icon ?? '')] ?? T5_07_ICONS.layerStack;
        // 图标描边绘制（stroke-dashoffset），同步微光点亮
        const pIcon = interpolate(frame, [d, d + drawFrames], [0, 1], clampOpt);
        const iconO = Math.min(1, pIcon * 3);
        const glowA = frame < d + drawFrames || i === activeIdx ? 0.45 : 0.28 + 0.17 * pulse;
        const glowPx = frame < d + drawFrames || i === activeIdx ? 14 : 8;
        // 标题：图标绘制完成后自上方轻落淡入（0.2 → 1）；描述随后淡入至 0.72
        const pTitle = interpolate(frame, [d + drawFrames, d + drawFrames + 10], [0, 1], clampOpt);
        const pDesc = interpolate(frame, [d + drawFrames + 6, d + drawFrames + 18], [0, 1], clampOpt);
        return (
          <div key={`v${i}`} style={{
            position: 'absolute', left: 0, top: yTop(i),
            width: iconSize + gapIcon + descWidth, height: blockH,
            display: 'flex', alignItems: 'flex-start',
          }}>
            <div style={{
              position: 'relative', width: iconSize, height: iconSize, flex: '0 0 auto',
              opacity: iconO, filter: `drop-shadow(0 0 ${glowPx}px ${withAlpha(iconColor, glowA)})`,
            }}>
              <svg width={iconSize} height={iconSize} viewBox="0 0 72 72"
                style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
                <path d={iconPath} fill="none" stroke={iconColor} strokeWidth={iconStroke}
                  strokeLinecap="round" strokeLinejoin="round"
                  pathLength={100} strokeDasharray="100" strokeDashoffset={100 - 100 * pIcon} />
              </svg>
            </div>
            <div style={{ marginLeft: gapIcon, width: descWidth }}>
              <div style={{
                fontSize: titleSize, fontWeight: 700, color: titleColor, lineHeight: 1.15,
                whiteSpace: 'nowrap', textShadow: '0 2px 6px rgba(0,0,0,0.4)',
                opacity: 0.2 + 0.8 * pTitle,
                transform: `translateY(${((1 - pTitle) * -12).toFixed(2)}px)`,
              }}>{stripKeyText(it.title ?? '')}</div>
              <div style={{ marginTop: gapTitle, opacity: pDesc * 0.72 }}>
                <WrappedText
                  text={it.desc ?? ''} size={descSize} maxWidth={descWidth} baseWeight="Regular" lineHeight={1.4}
                  style={{ fontSize: descSize, color: descColor }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t5-08 2×2网格编号横线标题（渐变横线生长·数组扩展） ---------------- */
export const T5_08: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = useConfigList('t5-08', 'items') as { num?: string; title?: string; desc?: string; at?: string }[];
  const items = raw.length > 0 ? raw : [{ num: '01', title: '模块标题', desc: '模块说明文案。' }];
  const numSize = useConfigKey('t5-08', 'numSize') as number;
  const numColor = useConfigKey('t5-08', 'numColor') as string;
  const titleSize = useConfigKey('t5-08', 'titleSize') as number;
  const titleColor = useConfigKey('t5-08', 'titleColor') as string;
  const descSize = useConfigKey('t5-08', 'descSize') as number;
  const descColor = useConfigKey('t5-08', 'descColor') as string;
  const numTitleGap = useConfigKey('t5-08', 'numTitleGap') as number;
  const titleLineGap = useConfigKey('t5-08', 'titleLineGap') as number;
  const lineDescGap = useConfigKey('t5-08', 'lineDescGap') as number;
  const itemWidth = useConfigKey('t5-08', 'itemWidth') as number;
  const lineH = useConfigKey('t5-08', 'lineH') as number;
  const lineCapW = useConfigKey('t5-08', 'lineCapW') as number;
  const lineCapH = useConfigKey('t5-08', 'lineCapH') as number;
  const lineColorA = useConfigKey('t5-08', 'lineColorA') as string;
  const lineColorB = useConfigKey('t5-08', 'lineColorB') as string;
  const hGap = useConfigKey('t5-08', 'hGap') as number;
  const vGap = useConfigKey('t5-08', 'vGap') as number;
  const growMs = useConfigKey('t5-08', 'growMs') as number;
  const scale = useConfigKey('t5-08', 'scale') as number;
  const posX = (useConfigKey('t5-08', 'posX') as number) ?? 120;
  const posY = (useConfigKey('t5-08', 'posY') as number) ?? 100;

  const cols = 2; // 固定 2 列网格，超出自动换行
  const lineFrames = Math.max(8, Math.round((growMs / 1000) * 30));
  const clampOpt = { easing: easeOutExpo, extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
  const headH = Math.max(numSize, titleSize) * 1.15;
  // 条目块高：编号标题行 + 间距 + 横线 + 间距 + 描述实际行数
  const blockHs = items.map((it) => {
    const descLines = Math.max(1, Math.ceil(measureText(stripKeyText(it.desc ?? ''), descSize, 'Regular') / Math.max(80, itemWidth)));
    return headH + titleLineGap + Math.max(lineH, lineCapH) + lineDescGap + descLines * descSize * 1.4;
  });
  // 每行取最高块，纵向按行累积（两列对齐不重叠）
  const rowMax: number[] = [];
  for (let i = 0; i < items.length; i += cols) rowMax.push(Math.max(...blockHs.slice(i, i + cols)));
  const rowY = (row: number) => rowMax.slice(0, row).reduce((a, b) => a + b, 0) + row * vGap;

  // 各条目入场帧（at 秒优先，缺省均摊）；当前条目 = 最后一个完成横线生长的条目
  const arrives = items.map((it, i) => atFrames(it, i, 8, 14));
  let activeIdx = -1;
  for (let i = 0; i < items.length; i += 1) if (frame >= arrives[i] + 6 + lineFrames) activeIdx = i;
  const pulse = 0.5 + 0.5 * Math.sin((frame / 45) * Math.PI * 2);

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT_STACK,
    }}>
      {items.map((it, i) => {
        const d = arrives[i];
        const x = (i % cols) * (itemWidth + hGap);
        const y = rowY(Math.floor(i / cols));
        const blockH = blockHs[i];
        const numText = stripKeyText(it.num ?? '') || String(i + 1).padStart(2, '0');
        // 阶段 1：编号淡入 + 轻微上移；阶段 2：标题淡入 + 横线自左向右生长；阶段 3：描述淡入
        const pNum = interpolate(frame, [d, d + 12], [0, 1], clampOpt);
        const pTitle = interpolate(frame, [d + 6, d + 18], [0, 1], clampOpt);
        const pLine = interpolate(frame, [d + 6, d + 6 + lineFrames], [0, 1], clampOpt);
        const pDesc = interpolate(frame, [d + 6 + lineFrames, d + 18 + lineFrames], [0, 1], clampOpt);
        const isHot = frame < d + 6 + lineFrames || i === activeIdx;
        const glowA = isHot ? 0.4 : 0.25 + 0.15 * pulse;
        const glowPx = isHot ? 10 : 6;
        return (
          <div key={`q${i}`} style={{ position: 'absolute', left: x, top: y, width: itemWidth, height: blockH }}>
            {/* 编号 + 小标题（基线对齐） */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: numTitleGap }}>
              <span style={{
                fontSize: numSize, fontWeight: 700, color: numColor, lineHeight: 1,
                textShadow: `0 0 6px ${withAlpha(numColor, 0.3)}`, opacity: pNum,
                transform: `translateY(${((1 - pNum) * 12).toFixed(2)}px)`,
              }}>{numText}</span>
              <span style={{
                fontSize: titleSize, fontWeight: 700, color: titleColor, lineHeight: 1.15,
                whiteSpace: 'nowrap', textShadow: '0 2px 6px rgba(0,0,0,0.4)', opacity: pTitle,
              }}>{stripKeyText(it.title ?? '')}</span>
            </div>
            {/* 渐变横线：左端粗实块 + 细线自左向右生长（外层裁剪防渐变重排，参照 t4-02） */}
            <div style={{ position: 'absolute', left: 0, top: headH + titleLineGap, width: itemWidth, height: Math.max(lineH, lineCapH) }}>
              <div style={{
                position: 'absolute', left: 0, top: (Math.max(lineH, lineCapH) - lineH) / 2,
                width: itemWidth * pLine, height: lineH, overflow: 'hidden',
              }}>
                <div style={{
                  width: itemWidth, height: '100%', opacity: 0.8,
                  background: `linear-gradient(90deg, ${lineColorA}, ${lineColorB})`,
                }} />
              </div>
              <div style={{
                position: 'absolute', left: 0, top: (Math.max(lineH, lineCapH) - lineCapH) / 2,
                width: Math.min(lineCapW, itemWidth * pLine), height: lineCapH, borderRadius: 2,
                background: lineColorA, opacity: 0.9,
                boxShadow: `0 0 ${glowPx}px ${withAlpha(lineColorA, glowA)}`,
              }} />
            </div>
            {/* 描述正文 */}
            <div style={{
              position: 'absolute', left: 0, top: headH + titleLineGap + Math.max(lineH, lineCapH) + lineDescGap,
              width: itemWidth, opacity: pDesc * 0.7,
            }}>
              <WrappedText
                text={it.desc ?? ''} size={descSize} maxWidth={itemWidth} baseWeight="Regular" lineHeight={1.4}
                style={{ fontSize: descSize, color: descColor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- t5-09 三栏科技背景卡片（顶部粒子地形·数组扩展） ---------------- */
export const T5_09: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = useConfigList('t5-09', 'items') as { title?: string; desc?: string; preset?: string; at?: string }[];
  const items = raw.length > 0 ? raw : [{ title: '算力底座', desc: '大规模并行计算集群支撑。', preset: 'waveTerrain' }];
  const cardW = useConfigKey('t5-09', 'cardW') as number;
  const particleH = useConfigKey('t5-09', 'particleH') as number;
  const cardGap = useConfigKey('t5-09', 'cardGap') as number;
  const cardRadius = useConfigKey('t5-09', 'cardRadius') as number;
  const strokeW = useConfigKey('t5-09', 'strokeW') as number;
  const colorA = useConfigKey('t5-09', 'colorA') as string;
  const colorB = useConfigKey('t5-09', 'colorB') as string;
  const bottomBg = useConfigKey('t5-09', 'bottomBg') as string;
  const titleSize = useConfigKey('t5-09', 'titleSize') as number;
  const titleColor = useConfigKey('t5-09', 'titleColor') as string;
  const descSize = useConfigKey('t5-09', 'descSize') as number;
  const descColor = useConfigKey('t5-09', 'descColor') as string;
  const padV = useConfigKey('t5-09', 'padV') as number;
  const padH = useConfigKey('t5-09', 'padH') as number;
  const gapTitle = useConfigKey('t5-09', 'gapTitle') as number;
  const drawMs = useConfigKey('t5-09', 'drawMs') as number;
  const particleMs = useConfigKey('t5-09', 'particleMs') as number;
  const scale = useConfigKey('t5-09', 'scale') as number;
  const posX = (useConfigKey('t5-09', 'posX') as number) ?? 100;
  const posY = (useConfigKey('t5-09', 'posY') as number) ?? 80;

  const drawFrames = Math.max(8, Math.round((drawMs / 1000) * 30));
  const spawnFrames = Math.max(8, Math.round((particleMs / 1000) * 30));
  const clampOpt = { easing: easeOutExpo, extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
  // 文字区高度按最大描述行数取齐，三栏等高
  const textHs = items.map((it) => {
    const descLines = Math.max(1, Math.ceil(measureText(stripKeyText(it.desc ?? ''), descSize, 'Regular') / Math.max(80, cardW - padH * 2)));
    return titleSize * 1.15 + gapTitle + descLines * descSize * 1.4 + padV * 2;
  });
  const textMaxH = Math.max(...textHs);
  const cardH = particleH + textMaxH;
  // 确定性伪随机（纯种子函数，预览/导出两条链路一致）
  const rnd = (k: number, s: number) => Math.abs(Math.sin((k + 1) * (s * 12.9898 + 78.233)) * 43758.5453) % 1;

  // 各卡片入场帧（at 秒优先，缺省均摊）；当前卡片 = 最后一个完成展开的卡片
  const arrives = items.map((it, i) => atFrames(it, i, 8, 14));
  let activeIdx = -1;
  for (let i = 0; i < items.length; i += 1) if (frame >= arrives[i] + drawFrames) activeIdx = i;
  const pulse = 0.5 + 0.5 * Math.sin((frame / 45) * Math.PI * 2);

  return (
    <div style={{
      position: 'absolute', left: posX, top: posY,
      transformOrigin: 'top left', transform: `scale(${scale / 100})`, fontFamily: FONT_STACK,
    }}>
      {items.map((it, i) => {
        const d = arrives[i];
        const x = i * (cardW + cardGap);
        const preset = stripKeyText(it.preset ?? '') || 'waveTerrain';
        // 阶段 1：容器淡入 + 上浮（渐变描边随容器出现）；阶段 2：粒子地形依次浮现；
        // 阶段 3：标题淡入 → 描述淡入
        const cardO = interpolate(frame, [d, d + 14], [0, 1], clampOpt);
        const rise = interpolate(frame, [d, d + 14], [14, 0], clampOpt);
        const pSpawn = interpolate(frame, [d + 8, d + 8 + spawnFrames], [0, 1], clampOpt);
        const pTitle = interpolate(frame, [d + 8 + spawnFrames * 0.5, d + 18 + spawnFrames * 0.5], [0, 1], clampOpt);
        const pDesc = interpolate(frame, [d + 8 + spawnFrames, d + 20 + spawnFrames], [0, 1], clampOpt);
        const isHot = frame < d + drawFrames + spawnFrames || i === activeIdx;
        const glowA = isHot ? 0.42 : 0.25 + 0.17 * pulse;
        const glowPx = isHot ? 12 : 6;
        const innerR = Math.max(1, cardRadius - strokeW);
        return (
          <div key={`c${i}`} style={{
            position: 'absolute', left: x, top: rise, width: cardW, height: cardH, opacity: cardO,
          }}>
            {/* 渐变描边外框（渐变背景 + 内层挖空 strokeW） */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: cardRadius, padding: strokeW,
              background: `linear-gradient(135deg, ${colorA}, ${colorB})`,
              boxShadow: `0 0 ${glowPx}px ${withAlpha(colorA, glowA)}`,
            }}>
              <div style={{ width: '100%', height: '100%', borderRadius: innerR, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* 上半：粒子地形（发光波浪曲线 + 垂落光柱 + 闪烁粒子 + 底部光晕） */}
                <div style={{ position: 'relative', height: particleH, overflow: 'hidden', background: 'rgba(8,12,28,0.6)' }}>
                  {/* 底部光晕带 */}
                  <div style={{
                    position: 'absolute', left: 0, bottom: 0, width: '100%', height: particleH * 0.4,
                    background: `linear-gradient(180deg, ${withAlpha(colorA, 0)}, ${withAlpha(colorA, 0.16)})`,
                  }} />
                  {/* 波浪曲线：主（青、粗）+ 副（紫、细），相位不同、随帧流动 */}
                  {[
                    { base: 0.62, amp: 0.15, freq: 6.3, speed: 1.3, ph: i * 2.1, sharp: preset === 'peakTerrain', color: colorA, w: 2.5, o: 0.9 },
                    { base: 0.44, amp: preset === 'bubbleTerrain' ? 0.08 : 0.12, freq: 8.8, speed: -0.9, ph: i * 1.4 + 2, sharp: false, color: colorB, w: 1.5, o: 0.6 },
                  ].map((wv, wi) => {
                    const N = 24;
                    let d = '';
                    for (let k = 0; k <= N; k += 1) {
                      const fx = k / N;
                      let wv1 = Math.sin(fx * wv.freq + wv.ph + (frame / 30) * wv.speed)
                        + 0.5 * Math.sin(fx * wv.freq * 2.3 - (frame / 30) * wv.speed * 0.7 + wv.ph * 2);
                      if (wv.sharp) wv1 = Math.sign(wv1) * Math.pow(Math.abs(wv1), 0.65);
                      const y = particleH * wv.base - wv1 * particleH * wv.amp;
                      d += `${k === 0 ? 'M' : 'L'} ${(fx * cardW).toFixed(1)} ${y.toFixed(1)} `;
                    }
                    const spawnW = Math.max(0, Math.min(1, pSpawn * 2 - wi));
                    return (
                      <svg key={`w${wi}`} width={cardW} height={particleH}
                        style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: spawnW }}>
                        <path d={d} fill="none" stroke={wv.color} strokeWidth={wv.w} opacity={wv.o}
                          style={{ filter: `drop-shadow(0 0 6px ${withAlpha(wv.color, 0.6)})` }} />
                      </svg>
                    );
                  })}
                  {/* 沿主波浪分布的粒子点列（粒子波浪质感，随曲线起伏） */}
                  {Array.from({ length: 18 }, (_, k) => {
                    const fx = k / 17;
                    let wv1 = Math.sin(fx * 6.3 + i * 2.1 + (frame / 30) * 1.3)
                      + 0.5 * Math.sin(fx * 6.3 * 2.3 - (frame / 30) * 0.91 + i * 4.2);
                    if (preset === 'peakTerrain') wv1 = Math.sign(wv1) * Math.pow(Math.abs(wv1), 0.65);
                    const py = particleH * 0.62 - wv1 * particleH * 0.15 + (rnd(k, 7) - 0.5) * 10;
                    const spawnP = Math.max(0, Math.min(1, pSpawn * 18 - k));
                    return (
                      <div key={`wp${k}`} style={{
                        position: 'absolute', left: fx * cardW, top: py, width: 2.5, height: 2.5, borderRadius: '50%',
                        background: mixColor(colorA, colorB, fx), opacity: 0.75 * spawnP,
                        boxShadow: `0 0 4px ${withAlpha(colorA, 0.5)}`,
                      }} />
                    );
                  })}
                  {/* 垂落光柱：顶端亮点 + 向下渐隐的细柱（bubble 预设更少） */}
                  {Array.from({ length: preset === 'bubbleTerrain' ? 7 : 12 }, (_, k) => {
                    const bx = 14 + ((k + 0.5) / 12) * (cardW - 28) + (rnd(k, 3) - 0.5) * 18;
                    const len = particleH * (0.3 + rnd(k, 4) * 0.42);
                    const topY = particleH * (0.06 + rnd(k, 5) * 0.18) + Math.sin(frame * 0.02 + k) * 3;
                    const spawn = Math.max(0, Math.min(1, pSpawn * 12 - k));
                    return (
                      <React.Fragment key={`lb${k}`}>
                        <div style={{
                          position: 'absolute', left: bx, top: topY, width: 2, height: len, opacity: 0.8 * spawn,
                          background: `linear-gradient(180deg, ${withAlpha(colorA, 0.85)}, ${withAlpha(colorA, 0)})`,
                        }} />
                        <div style={{
                          position: 'absolute', left: bx - 1.5, top: topY - 1.5, width: 3, height: 3, borderRadius: '50%',
                          background: colorA, boxShadow: `0 0 6px ${withAlpha(colorA, 0.7)}`, opacity: spawn,
                        }} />
                      </React.Fragment>
                    );
                  })}
                  {/* 闪烁粒子点（带光晕，缓慢漂移） */}
                  {Array.from({ length: 18 }, (_, k) => {
                    const dx = 8 + rnd(k, 1) * (cardW - 16);
                    const dy = particleH * 0.08 + rnd(k, 2) * (particleH * 0.6)
                      + Math.sin(frame * 0.03 + k * 2.1) * 4;
                    const sz = 2 + rnd(k, 6) * 2.5;
                    const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(frame * 0.16 + k * 1.7));
                    const spawnD = Math.max(0, Math.min(1, pSpawn * 18 - k));
                    return (
                      <div key={`d${k}`} style={{
                        position: 'absolute', left: dx, top: dy, width: sz, height: sz, borderRadius: '50%',
                        background: mixColor(colorA, colorB, dx / cardW),
                        boxShadow: `0 0 5px ${withAlpha(colorA, 0.55)}`, opacity: tw * spawnD,
                      }} />
                    );
                  })}
                </div>
                {/* 下半：黑底文字区 */}
                <div style={{ position: 'relative', flex: 1, background: bottomBg, padding: `${padV}px ${padH}px` }}>
                  <div style={{
                    fontSize: titleSize, fontWeight: 700, color: titleColor, lineHeight: 1.15,
                    whiteSpace: 'nowrap', textShadow: '0 2px 8px rgba(0,0,0,0.5)', opacity: pTitle,
                  }}>{stripKeyText(it.title ?? '')}</div>
                  <div style={{ marginTop: gapTitle, opacity: pDesc * 0.7 }}>
                    <WrappedText
                      text={it.desc ?? ''} size={descSize} maxWidth={cardW - padH * 2} baseWeight="Regular" lineHeight={1.4}
                      style={{ fontSize: descSize, color: descColor }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};