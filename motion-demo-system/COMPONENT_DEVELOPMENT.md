# MotionCaption 组件开发规范

> 本文件是 MotionCaption 新增/修改动效组件的强制约定。所有后续组件开发必须遵循，
> 确保新组件与存量组件在「放置、缩放、配置、注册」上行为一致。别名：COMPONENT_GUIDE。

## 1. 文件与注册结构

新增一个组件需改动 3 处，缺一不可：

1. **组件实现**：放在对应分组的组件文件（`src/remotion/components/`）：
   - `cat1_text.tsx`（t1 纯文字+细线条）
   - `cat2_card.tsx`（t2 卡片）
   - `cat3_data.tsx`（t3 数据数值）
   - `cat4_5.tsx`（t4 流程轨道 / t5 列表条目）
   - `cat6_timeline.tsx`（t6 时间线/流向/轨道）
   - `cat7_chart.tsx`（t7 迷你图表）
   - `catS_fx.tsx`（fx 特效）
2. **配置**：`src/remotion/config.ts`，在 `CONFIGS` 与该组件的 `DEFAULTS` 中各追加一段。
3. **注册**：`src/remotion/catalog.ts`，追加条目 `{ id, name, category, component }` 到对应分类。

组件 `id` 格式：`t<n>-<nn>` 或 `fx-<nn>`，全局唯一。`name` 使用「结构说明式」中文名，
如「标题+竖向柱状图」（避免形容词/对比等易重复的命名）。

## 2. 放置三件套（每个组件必有）

所有组件的**最外层根容器**必须接入放置三件套，否则一律视为不合规：

```tsx
const posX = (useConfigKey('<id>', 'posX') as number) ?? <设计X>;   // 设计稿左上角 X
const posY = (useConfigKey('<id>', 'posY') as number) ?? <设计Y>;   // 设计稿左上角 Y
const scale = (useConfigKey('<id>', 'scale') as number) ?? 100;    // 整体缩放(百分比)
```

根容器样式：
```tsx
<div style={{
  position: 'absolute', left: posX, top: posY,
  transform: `scale(${scale / 100})`, transformOrigin: 'top left',
  /* 保留该组件原本的其余根容器样式 */
}}>
```

规则：
- `scale` 一律**百分比**，默认 `100`；组件与配置里都存整数百分比，渲染时 `/100`。
- `transformOrigin` 固定 `'top left'`，否则缩放前后左上角会错位。
- 若根容器已有入场 `transform`（如 `translateY(...)`），必须**合并**：`\`translateY(...) scale(${scale / 100})\``，不要覆盖。
- 若根容器是居中类（`translate(-50%, -50%)` 等），**只接 posX/posY，不接 scale**，并在代码注释标注「居中类」。
- 子元素一律保持相对根容器的绝对定位，不做任何改动（它们会随根容器整体平移/缩放）。

## 3. config.ts 追加规则

`CONFIGS`（属性面板定义）中，每组件的最后一个属性之后追加三行（已有 scale 的组件只补前两行）：

```ts
mkNum('posX', '左位置X', <设计X>, 0, 1920, 1, 'px'),
mkNum('posY', '顶部位置Y', <设计Y>, 0, 1080, 1, 'px'),
mkNum('scale', '整体缩放', 100, 20, 200, 1, '%'),
```

`DEFAULTS`（当前默认值）末尾追加：

```ts
posX: <设计X>, posY: <设计Y>, scale: 100,
```

约定：
- 三件套固定放在每组的**末尾**，保证属性面板顺序一致。
- `posX`/`posY` 取「画布基准 1920×1080」上的设计坐标（左上角）。
- 已有 `scale` 的组件：`CONFIGS` 与 `DEFAULTS` 均**只追加 posX/posY**，不重复加 scale。
- 配置项命名统一 React 风格驼峰（`posX`/`posY`/`titleSize`/`cardW` 等）。

## 4. 变量命名避让

组件内部若已有动画变量 `scale`（如 `useEnterScale` 的返回值），新增配置缩放变量
**不能用 `scale`**，改用 `configScale` / `posScale`，避免遮蔽冲突。
同理 `posX`/`posY` 若已占用则加前缀（`configPosX`）。

## 5. 画布与安全区

- 画布基准 **1920×1080**。
- **水平禁区 720–1200px**（中部人物核心区），组件默认靠左或靠右安全区，禁止横跨禁区。
- 为避免侵入中部，宽度较大的组件用 `scale`（默认值 <100%）等比缩小，仍保持 `transformOrigin: top left`。
- 组件无全局背景底色，透明叠加，只绘制内容本身。

## 6. 配置驱动与可编辑

- 所有应由用户调整的样式项（字号/颜色/间距/尺寸/文案）必须通过 `useConfigKey`/`useConfigList`
  读取，默认值写入 `DEFAULTS`，保证属性面板可编辑。
- 文本类属性用 `mkText`，字号/颜色通过 `sizeKey`/`colorKey` 做成二级属性（一级 T 图标收起），
  避免属性面板过长。
- 序号等相对定位的字号如需独立于具名字号，需单独键（不随后者联动）。
- 字号输入框需先聚焦才能用滚轮改值；全局快捷键（Ctrl+F 等）须全局触发。

## 7. 动画与默认节奏

- 入场优先用 `anim.ts` 提供的 `useEnter` / `useEnterOpacity` / `useGrowDown` / `useBreath`、
  `easeOutExpo` 等，保证风格统一。
- 组件播放结束后必须保留在界面上（结尾帧前暂停 + 归零强制回跳的「双保险」），不得闪回空白。
- 行间/标题与内容/组分块间保持合理间距。

## 8. 默认配置与外部 JSON

- 用户会通过 `motion-config-YYYY-MM-DD.json` 覆盖并固化某组件的最终设计值。
  新组件默认值应先与最新 JSON 对齐，再作为 `DEFAULTS` 写入 config.ts。

## 9. 完成前自检清单

- [ ] 三件套已接入（posX/posY/scale），默认下视觉与设计稿一致
- [ ] `CONFIGS` + `DEFAULTS` 均已追加，已有 scale 只补 posX/posY
- [ ] catalog.ts 已注册，`name` 为结构式命名且无重名
- [ ] 命名无遮蔽（用到 `configScale`/`posScale` 处正确）
- [ ] 居中类根容器已标注、不加 scale
- [ ] `npx tsc --noEmit` 通过
- [ ] 浏览器抽样验证：位置/缩放即时生效、不侵安全区、播完不闪回
```