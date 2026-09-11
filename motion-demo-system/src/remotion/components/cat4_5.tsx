import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONT_STACK } from '../theme';
import { useEnter, useEnterOpacity, useBreath, easeOutExpo, atFrames } from '../anim';
import { useConfigKey, useConfigList } from '../config';
import { weightNum, measureText } from '../measure';
import { tint, renderKeyParts, WrappedText } from './shared';

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