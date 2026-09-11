# MotionCaption 组件开发规范（Agent 执行版）

> 本文件是新增/修改动效组件的**强制约定**，供 Agent 在后续会话中直接执行。
> 别名：COMPONENT_GUIDE。修改组件结构/交互的设计变更需同步更新本文档；纯 bug 修复不必。

## 0. 新增组件的标准 Prompt（需求输入模板）

给 Agent 下达新增组件任务时，按此模板描述需求（缺项由 Agent 按上下文合理假设并注明）：

```
新增组件 t<n>-<nn>（或 fx-<nn>）：<结构说明式中文名>
- 画布：1920×1080，底部/左侧/右侧安全区，锚点 posX/posY（左上角），不侵水平禁区 720–1200px
- 布局：<各元素的位置、尺寸、间距；文字宽度自适应规则>
- 配色：<各元素颜色，hex；需要语义槽的说明映射到 paletteSlots 8 槽>
- 动效：<入场/逐项/拖拽等时序；逐项组件给出 at 字段语义（秒→帧，缺省均摊）与缓动>
- 文案：items/title 等内容键给出符合组件用途的示例文案（不用占位词）
- 适用/不适用：suitableFor / avoidFor 各 1-2 条英文短句
```

Agent 收到后**必须**完成下面 11 步登记，再跑第 4 节验证链。

## 1. 十一步登记清单（漏一步即构建/测试失败）

1. **组件实现** `src/remotion/components/cat*.tsx`：
   - 导出 `T<n>_<nn>` 函数组件；所有可调项走 `useConfigKey('<id>', key)` / `useConfigList`。
   - 列表逐项入场用 `atFrames(row, i, base, step)`（at 秒→帧，缺省均摊，强制单调不减），
     过渡用 `interpolate` + `easeOutExpo`。
   - 根容器：`position:absolute; left:posX; top:posY; transformOrigin:'top left';
     transform:scale(scale/100)`；半透明色用 `withAlpha(c, a)`（`components/shared.tsx`），禁止 `${hex}80`。
   - **不做 exitFade**（播完保留终态），否则组件库缩略图（138/150 帧处取帧）会截到空白。
   - 贴边文本用 `bottom` 锚定 + `textWidth()` 钳制，禁止裸 `translateX(-50%)`（参考 t7-07/08 模式）。
2. **catalog** `src/remotion/catalog.ts`：import + `CATALOG` 追加 `{ id, name, category, component }`。
   `id` 前缀匹配既有分类；`name` 结构说明式命名（避免形容词）。
3. **config 两处** `src/remotion/config.ts`：`CONFIGS`（mkText/mkNum/mkColor/mkList/mkList 字段）与
   `DEFAULTS` 各加一段；**文案内容必须是符合组件用途的成品示例**（禁止「标题」「大标题在此可编辑」
   类占位词）；末尾三件套 `mkNum('posX'…)/mkNum('posY'…)/mkNum('scale'…)` + DEFAULTS 同键。
   `catalogParity.test.ts` 强制每个组件有 posX/posY/scale。
4. **selectionMetadata** `src/effects/definitions/shared.ts`：缺条目直接 throw；
   `suitableFor`/`avoidFor` 英文短句；数组键填 `minItems/maxItems`；`motion` 写中文动效描述
   （会进 SKILL.md）。文本内容键的 role 必须是 `content`（样式 `style`、位置 `layout`）。
5. **paletteSlots** `src/effects/paletteSlots.ts`：颜色键映射 8 槽语义（accent/accent2/emphasis/
   title/body/label/bg/border）。**多序列/渐变双端/状态色不映射**（slotFor 返回 null 保原值）。
   `agentEditableItemFields` 不能放 `at`/`hl`/color 类字段（registry 会 throw）。
6. **orchestrate** `src/llm/orchestrate.ts`：规则 9 的 at 适用组件列表 + `QUICK_NAV_ROWS` 对应形态行。
7. **registry.test** `src/effects/registry.test.ts`：冻结 ID 列表追加新 id、总数 +1、
   条目容量表追加 `['<id>', [min, max]]`。
8. **Workspace.test** `src/editor/Workspace.test.tsx`：registry 条目总数 +1。
9. **generate-skill.mjs** `scripts/generate-skill.mjs`：`atTimingProps` Set 加 `'<id>:<items键>'`；
   t<n> 家族文案（through 行、导航行、规则句）同步到新 id。
10. **skill 再生成与同步**：
    ```bash
    npm run generate:skill && npm run check:skill
    cp -r skill/SKILL.md skill/references skill/scripts ~/.workbuddy/skills/motion-caption-components/
    ```
    `check:skill` 要求 missing/stale/orphan 全空。产物在项目 `skill/` 目录。
11. **渲染一致性检查**（新增/修改组件后必跑：导出与预览的差异门禁）：
    ```bash
    npm run check:parity -- <id>                 # 只查本次改动的组件
    npm run check:parity -- --update-baseline    # 有意的视觉调整后刷新基线
    ```
    透明导出走 `renderStillOnWeb`（DOM 重绘，不是截图），与预览必然存在实现差异。
    该脚本对同一工程分别走「预览路径（Player 真实 DOM）」与「导出路径（重绘）」渲染多帧并
    逐像素 diff，把差异量化到单个组件：**差异 > 7（gate）即失败**。
    新增组件默认必须 ≤ 7；已知超标组件记录在 `scripts/render-parity-baseline.json`，
    基线内组件只允许「不恶化」，要改好再下调基线值。踩坑姿势见第 3.1 节。

## 2. 缩略图与试播（自动，无需手动截屏）

- **缩略图**：组件库条目由 `src/editor/componentThumbnail.tsx` 用隐藏 Player 渲染真实帧
  （150 帧取 138 帧特写，画布 960×540），新组件注册后**自动**获得缩略图；无独立 QA 要求。
  若缩略图异常：优先检查组件是否实现了 exitFade（禁用）、测量是否用了 host 本地坐标。
- **试播**：点击组件卡即 3 秒自播一遍（`store.startComponentPreview(componentId)`，独立叠加层
  Player，不动主时间线）。QA 交互类改动必须断言 `[data-effect-root="preview-*"]` 真实渲染。

## 3. 内容键保护（2026-09-10 定稿，强制）

- `collectInstanceSnapshot`（存默认样式）**只收 style+layout 键**，role==='content' 的
  文字/数组键永不入快照——用户在工程里改过的文案不得污染全局默认。
- `mergeUserStyleDefaults` 传 `definition` 时**永远跳过 content 键**（历史残留快照同样失效）；
  addEffect / 缩略图 / resetProps 三处调用都必须传 `{ definition }`。
- AI 编排导入传 `{ definition, roles: ['style','layout'] }`，用户旧文案不得盖掉 AI 按字幕写的内容。
- bake-style-defaults.mjs 默认跳过内容键（`--with-content` 才固化文案）。

## 3.1 导出重绘器不支持的特性（新组件必须避开）

透明导出用 `@remotion/web-renderer` 的 `renderStillOnWeb`：它**不是截图**，而是按 DOM 重新手绘到
canvas。下列特性已实测会导致「预览正常、导出走样」，新增组件时必须绕开，并靠第 11 步
`check:parity` 兜底：

| 禁用写法 | 导出表现 | 正确替代 |
| --- | --- | --- |
| 多行文本交给浏览器折行（`whiteSpace:'normal'` + 多个内联元素） | 断行位置漂移、排版错位（t1-08 / t2-01 实测，折行点落在 `{{高亮}}` 边界时最明显） | 用 `WrappedText`（`components/shared.tsx`）：`<WrappedText text size maxWidth baseWeight hlColor lineHeight style/>`，内部按 `measureText` 手动断行、每行 `nowrap`；只有单行语义的文本才用 `whiteSpace:'nowrap'` |
| 单行省略语义（`overflow:hidden` + `ellipsis`）却漏写 `whiteSpace:'nowrap'` | 长文案下意外折行、与预览行数不一致（t4-06 / t4-07 / t4-08 / t6-02 / t6-08） | 补 `whiteSpace:'nowrap'` |
| 同一个父元素下放多个 SVG 图形（多个 `path`/`circle`，或并列多个 `<svg>`） | **只渲染第一个**，其余全部消失（t7-03 三段弧只剩一段、t7-06 进度弧丢失、t7-04 第二条折线丢失） | 每个图形元素各自包一层容器（`<div>` 内只放一个 `<svg>`，`<svg>` 内只放一个图形） |
| 把 `opacity` 放在**尺寸为 0 的容器**上（无 `width/height`、子元素全 `position:absolute`） | 该透明度完全不生效，子元素以自身 alpha 绘制（t6-07 末段整组淡出失效，差异 26.1） | 给容器显式 `width/height`（内容包围盒即可），或把透明度下放到每个子元素 |
| `boxShadow` 带 `inset` | 直接被跳过（内发光整体消失，控制台有警告） | 改为外层元素辉光补偿 |
| 视觉状态依赖运行时 `measureText` 结果（如"光点扫到第几步"） | 两条链路各自测量，状态漂移（t4-01） | 用纯帧驱动（`atFrames` + 固定间隔），不把测量结果当状态 |
| `filter` 非 `drop-shadow` 的复杂组合 | 部分生效、部分丢失 | 拆成单层 `drop-shadow` 或预烘焙 |
| `backdrop-filter` / `mix-blend-mode` | 不支持 | 用半透明色 + 描边模拟 |

已验证修复记录（2026-09-10）：`t7-03` 20.5→3.4、`t7-06` 11.2→1.8、`t7-04` 7.1→3.7、`t6-07` 26.1→3.8、`t1-08` 排版错位→2.0。

#### 差异数值怎么读（判定依据 = 最大 avg，gate 7；面积% 是诊断列）

- **avg 高 + 面积高，且差异散布在文字边缘** → 重绘器绘制文字的抗锯齿与浏览器 DOM 不同造成的
  **固有精度差异**，肉眼不可见（已逐个用并排放大对照图确认），**不需要改代码**；
- **avg 高 + 面积低但集中在某片区域** → 元素丢失 / 透明度失效 / 断行错位这类**结构性缺陷，必须修**。

已知属于「文字抗锯齿固有差异」的组件（2026-09-10 用并排对照图逐个确认，无需修复）：
`t3-06`（avg 10.5 / 面积 8.2%）、`t5-06`（8.8 / 5.9%）、`t4-03`（8.1 / 6.8%）、`t3-05`（7.2 / 6.0%）、
`t4-01`（7.1 / 4.8%）、`t4-06`（7.0 / 4.7%）、`t6-01`（6.9 / 4.3%）。
对照图证据：`.superpowers/sdd/cmp-t3-05.png`、`cmp-t4-03.png`、`cmp-t6-01.png`（左预览 / 右导出）。
这些值已冻结进基线，**任何上升（>基线+2）仍会被判为回归**，所以不要因为「已解释」就随手改它们的布局。

所有已修复项：`t7-03` 20.5→3.4（多 SVG 图形）、`t7-06` 11.2→1.9（同上）、`t7-04` 7.1→3.7（同上）、
`t6-07` 26.1→3.8（0 尺寸容器 opacity）、`t1-08` 折行错位（手动折行）。

## 4. QA 与验证链（Agent 完成登记后必须全绿）

```bash
npm run typecheck          # tsc 0 错
npx vitest run             # 当前基线 380/380
npm run build              # 生产构建（先手动 rm -rf dist 规避沙箱批量删除保护）
npm run check:skill        # skill 无 missing/stale/orphan
npm run check:parity -- <新组件id>   # 导出与预览的渲染差异 ≤ 7（脚本会自行拉起 vite:8011）
```

浏览器 QA（改过任何源文件后**必须先重启 dev server**，HMR 模块分叉会让 store 探测假失败）：

```bash
cd motion-demo-system && npx vite --port 8011 --strictPort --host 127.0.0.1   # 必须显式 --host
```

- 交互 QA 脚本库 `.superpowers/sdd/*.mjs`（lib-thumb-qa 14 断言、preview-visible-qa、
  preview-from-end-qa、preview-with-video-qa、axis-labels-qa 等）。
- Chrome headless shell：`C:\Users\AYOU\AppData\Local\ms-playwright\chromium_headless_shell-1234\
  chrome-headless-shell-win64\chrome-headless-shell.exe`；等待渲染用 setTimeout（rAF 可能不触发）。
- 判断组件选中用 `[data-resize-corner]`；设置真实工程状态用 CDP `DOM.setFileInputFiles`
  塞第 4 个 file input（打开工程）。

## 5. 基础设计约定（沿用，摘要）

- 画布 1920×1080；水平禁区 720–1200px；组件透明叠加、无全局底色。
- scale 为整数百分比（渲染 /100），`transformOrigin: top left`；居中类只接 posX/posY 并注释标注。
- 动画优先用 `anim.ts` 的 `useEnter`/`useEnterOpacity`/`useGrowDown`/`useBreath`/`easeOutExpo`。
- 播完必须保留终态，不得闪回空白。
- 组件内部已有 `scale` 动画变量时，配置缩放改用 `configScale`（posX/posY 同理 `configPosX`）。

## 6. 完成前自检清单

- [ ] 十一步登记全部完成（含 skill 再生成与 cp 同步安装版）
- [ ] `package.json` 的 `version` 已按本次改动递增（patch 修复 / minor 新增组件；界面顶栏与桌面端都读它）
- [ ] 文案为成品示例、role 标注正确（content/style/layout）
- [ ] typecheck / vitest / build / check:skill 全绿
- [ ] `npm run check:parity -- <新组件id>` 通过（导出 vs 预览差异 ≤ 7，未使用第 3.1 节禁用写法）
- [ ] dev server 重启后：组件卡缩略图正常、试播 3 秒符合规格、插入时间轴后播完不闪回
- [ ] 「存为默认样式」只影响样式与位置，不改文字内容
