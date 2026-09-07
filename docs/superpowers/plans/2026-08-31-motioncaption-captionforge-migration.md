# MotionCaption → CaptionForge Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在用户完成并冻结 MotionCaption 精品组件库 v1 后，以 MotionCaption 为代码基础，迁入 CaptionForge 的字幕、工程、场景、多轨时间轴、鼠标编辑、Agent 草稿交换和透明视频导出能力，最终形成仍名为 CaptionForge 的个人本地工具。

**Architecture:** React/Remotion 组件是唯一画面实现；`ProjectComposition` 同时服务 Player 预览和可替换的导出后端。外部 Agent 只读取 Skill 并生成带字幕来源的只读草稿 JSON，程序完成确定性校验、时间换算和用户确认，不在应用内调用模型。

**Tech Stack:** React 18、TypeScript 5.6、Vite 5、Remotion 4.0.518、Vitest、Zod、Zustand、Tauri 1、Rust、FFmpeg、可选 `@remotion/web-renderer`。

## Global Constraints

- 本计划只在用户明确宣布“精品组件库 v1 已准备完成”后开始执行。
- 用户自行创建并确认 MotionCaption ZIP 备份；执行代理不得覆盖或删除该备份。
- 旧 `C:\Users\AYOU\Desktop\CaptionForge` 在最终端到端验收通过前保持可运行、只作为迁移来源。
- 最终产品以 MotionCaption 代码为基础，产品名称仍为 CaptionForge；当前组件浏览器保留为“组件实验室”。
- 每个公开组件只维护一份 React/Remotion 实现，不迁入 CaptionForge 的 DOM/Canvas 双渲染器。
- 同一场景允许多个组件同时出现；只校验非法数据、排他冲突和实际视觉碰撞，不把时间重叠本身视为错误。
- Agent 默认只能填写内容、字幕来源和可选位置预设；字号、颜色、间距、阴影和动画使用精品默认值。
- Agent 草稿必须先严格校验并以只读状态预览，用户确认后才生成正式时间轴实例。
- 所有 Remotion 与 `@remotion/*` 包固定为同一精确版本；迁移基线为 `4.0.518`，不得使用 `^`。
- v1 画布基线为 1920×1080、30fps；工程协议仍显式保存宽、高和 fps。
- Web Renderer 先做三类组件的视觉与 Alpha 验证；失败时只替换 `RenderBackend`，不改组件和工程协议。
- 不迁移 CaptionForge 的 `src/llm`、API Key、供应商设置、旧 effect registry 或 102 个组件的数量目标。
- 每个任务只触及任务列出的文件；发现无关问题只记录，不顺手重构。

---

## 0. Start Gate：用户准备完成后才执行

开始迁移前，执行者必须逐项确认：

- [ ] 用户已明确说出“精品组件库 v1 已准备完成，可以开始迁移”。
- [ ] 用户确认 ZIP 备份存在并能打开；只记录确认结果，不自动解压覆盖工程。
- [ ] `npm run build` 在 `C:\Users\AYOU\Desktop\MotionCaption\motion-demo-system` 通过。
- [ ] `npx tsc --noEmit` 通过。
- [ ] 当前 `CATALOG`、`CONFIGS` 和最终 `DEFAULTS` 已包含用户准备发布的全部精品组件。
- [ ] 最新视觉默认值已经写入 `config.ts`，而不是只存在于 localStorage 或 `motion-config-*.json`。
- [ ] 记录 Remotion 实际安装版本；所有 Remotion 包版本一致。

如果任一项不满足，停止迁移并向用户报告具体缺口。不要替用户判断组件是否“已经够好”。

## 1. Planned File Map

迁移开始后，以 `C:\Users\AYOU\Desktop\MotionCaption\motion-demo-system` 为应用根目录。

### 保留并逐步调整

- `src/remotion/components/*.tsx`：精品组件实现；不为迁移统一拆文件。
- `src/remotion/anim.ts`：确定性帧动画。
- `src/remotion/config.ts`：在定义迁移完成前作为旧配置来源。
- `src/remotion/catalog.ts`：在定义迁移完成前作为旧目录来源。
- `src/app/PropertyPanel.tsx`：逐步改为统一组件定义驱动。
- `src/app/App.tsx`：最终成为应用外壳，在编辑器与组件实验室之间切换。

### 新建的核心边界

- `src/effects/types.ts`：`EffectDefinition`、内容/样式参数元数据和布局元数据。
- `src/effects/registry.ts`：唯一组件注册表和定义查询。
- `src/effects/legacyAdapter.ts`：迁移期把现有 CATALOG/CONFIGS/DEFAULTS 适配成定义。
- `src/effects/definitions/*.ts`：按现有类别逐批接管组件定义。
- `src/project/types.ts`：Agent 输入、Agent 草稿、正式工程和实例类型。
- `src/project/schema.ts`：Zod 严格 Schema 与版本判定。
- `src/project/compileDraft.ts`：字幕来源到帧、轨道和正式实例的确定性编译。
- `src/project/validateDraft.ts`：错误与警告报告。
- `src/composition/ProjectComposition.tsx`：唯一工程画面树。
- `src/composition/EffectInstanceFrame.tsx`：实例配置、位置和组件包装。
- `src/export/RenderBackend.ts`：导出后端接口。
- `src/export/webRendererBackend.ts`：透明 WebM 浏览器渲染。
- `src/export/exportValidation.ts`：支持性与 Alpha/视觉验证入口。
- `src/store/editorStore.ts`：正式工程、草稿、选择、时间轴和播放状态。
- `src/subtitle/parse.ts`：从 CaptionForge 迁入并保留测试的字幕解析。
- `src/agent/exportInput.ts`：导出 `captionforge.agent-input`。
- `src/agent/importDraft.ts`：导入并验证 `captionforge.agent-draft`。
- `src/editor/EditorApp.tsx`：完整编辑器组合。
- `src/editor/VideoStage.tsx`：视频、Player、选择框、拖拽缩放。
- `src/editor/Timeline.tsx`：场景和实例多轨时间轴。
- `src/editor/DraftReview.tsx`：错误、警告、来源和应用/放弃。
- `src/effect-lab/EffectLab.tsx`：当前组件演示系统的保留形态。
- `scripts/generate-skill.mjs`：从组件定义生成 Skill 索引和 references。
- `scripts/validate-agent-draft.mjs`：外部 Agent 可运行的草稿校验入口。
- `skill/SKILL.md`：轻量选择索引。
- `skill/references/components/*.md`：单组件详细参数说明。
- `skill/references/project-schema.md`：Agent 草稿协议。

### 桌面端后置创建

- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/main.rs`
- `src/tauri/bridge.ts`

只迁入 CaptionForge 的视频选择、同名字幕探测、保存对话框和 FFmpeg 能力；不迁入凭据存储命令。

---

### Task 1: Capture the Frozen Component Baseline and Add Test Gates

**Files:**
- Create: `.gitignore`
- Create: `docs/migration/component-library-v1.md`
- Create: `src/effects/catalogParity.test.ts`
- Modify: `package.json`
- Modify: `src/remotion/config.ts`

**Interfaces:**
- Consumes: 用户冻结后的 `CATALOG`、`CONFIGS`、`DEFAULTS`。
- Produces: 可复现组件数量、ID 清单、构建门禁和后续迁移的视觉基线说明。

- [ ] **Step 1: 记录冻结快照**

在 `docs/migration/component-library-v1.md` 写入实际组件总数、每个 ID/名称/类别、最终配置 JSON 文件名、画布 1920×1080、30fps，以及用户确认日期。组件总数必须从当时的 `CATALOG` 读取，不沿用本计划撰写时的 46。

- [ ] **Step 2: 固定依赖和测试命令**

把 `remotion`、`@remotion/player` 以及后续增加的 `@remotion/web-renderer` 固定为完全相同版本。加入：

```json
{
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "verify": "npm run test && npm run typecheck && npm run build"
  }
}
```

- [ ] **Step 3: 暴露迁移所需默认值读取，不改变组件外观**

将 `DEFAULTS` 改为命名导出，保持对象内容不变：

```ts
export const DEFAULTS: Record<string, ConfigState> = {
  // 保留冻结时的全部真实默认值
};
```

- [ ] **Step 4: 编写目录一致性失败测试**

测试必须断言：CATALOG ID 唯一；每个 CATALOG ID 都有 CONFIGS 和 DEFAULTS；CONFIGS 与 DEFAULTS 没有孤儿 ID；每个组件包含 `posX`、`posY`，并按现有居中组件例外规则处理 `scale`。

- [ ] **Step 5: 运行失败测试并修复冻结数据中的真实不一致**

Run: `npm run test -- src/effects/catalogParity.test.ts`

Expected: 初次测试如果发现不一致，列出精确组件 ID；只修数据不一致，不改视觉设计。

- [ ] **Step 6: 完成基线验证**

Run: `npm run verify`

Expected: 测试、类型检查和生产构建全部退出码 0，Player 中抽查组件外观与冻结前一致。

- [ ] **Step 7: 建立迁移提交点**

ZIP 备份确认后，如果目录仍没有 Git，先在 `C:\Users\AYOU\Desktop\MotionCaption` 初始化仓库并提交基线。提交信息：

```text
chore: capture frozen motion component baseline
```

---

### Task 2: Introduce EffectDefinition Without Rewriting Components

**Files:**
- Create: `src/effects/types.ts`
- Create: `src/effects/legacyAdapter.ts`
- Create: `src/effects/registry.ts`
- Create: `src/effects/registry.test.ts`
- Modify: `src/remotion/catalog.ts`
- Modify: `src/app/PropertyPanel.tsx`

**Interfaces:**
- Consumes: `ComponentDef`、`PropDef`、`defaultConfig(id)`。
- Produces: `effectRegistry.get(id)`、`effectRegistry.list()`、`EffectDefinition`。

- [ ] **Step 1: 定义稳定组件协议**

```ts
export type PropRole = 'content' | 'style' | 'layout';
export type SemanticRole = 'title' | 'body' | 'label' | 'metric' | 'items';
export type PlacementPreset =
  | 'auto'
  | 'left-top'
  | 'left-center'
  | 'left-bottom'
  | 'right-top'
  | 'right-center'
  | 'right-bottom'
  | 'full-width';

export interface EffectDefinition {
  id: string;
  version: number;
  name: string;
  category: string;
  component: React.FC;
  selection: {
    summary: string;
    suitableFor: string[];
    avoidFor: string[];
    semanticFamilies: string[];
    minItems?: number;
    maxItems?: number;
  };
  props: Record<string, {
    type: 'text' | 'number' | 'color' | 'list';
    label: string;
    default: unknown;
    required: boolean;
    role: PropRole;
    agentEditable: boolean;
    semanticRole?: SemanticRole;
    min?: number;
    max?: number;
  }>;
  layout: {
    roles: string[];
    preferredZones: PlacementPreset[];
    footprint: {width: number; height: number};
    exclusive: boolean;
  };
}
```

- [ ] **Step 2: 用适配器生成第一版定义**

`legacyAdapter.ts` 从现有目录和配置构造定义；所有字段默认 `agentEditable: false`，避免在人工分类前放开样式。适配器必须保留原默认值，不修改组件代码。

- [ ] **Step 3: 建立严格注册表**

注册表初始化时拒绝重复 ID、缺失组件、缺失默认值和不合法 footprint。不得静默覆盖。

- [ ] **Step 4: 编写失败测试**

覆盖重复 ID、孤儿配置、未知定义、默认配置一致性，以及 `effectRegistry.list().length === CATALOG.length`。

- [ ] **Step 5: 属性面板改读定义**

保持现有 UI 和控件行为，只把字段来源从 `CONFIGS[componentId]` 切到注册表派生数据。列表编辑仍须支持冻结组件当前格式；工程协议在 Task 4 才统一为真正数组。

- [ ] **Step 6: 分类别把选择元数据移入正式定义**

按 `fx → t1 → t2 → … → t7` 迁移。每一批都由用户确认适用场景、禁用场景、内容容量和默认占位；不由执行代理猜测审美用途。

- [ ] **Step 7: 验证并提交**

Run: `npm run verify`

Expected: 所有组件数量、默认外观和属性面板行为不变。

Commit: `refactor: unify motion effect definitions`

---

### Task 3: Define Scene, Agent Draft, and Runtime Project Schemas

**Files:**
- Create: `src/project/types.ts`
- Create: `src/project/schema.ts`
- Create: `src/project/schema.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `AgentInputSchema`、`AgentDraftSchema`、`MotionProjectSchema`、对应 TypeScript 类型。
- Later consumers: 草稿校验、编译器、编辑器 store、Skill 生成器。

- [ ] **Step 1: 安装并固定 Zod**

使用与 lockfile 一致的 npm 安装方式，保存精确版本，不增加第二套 Schema 库。

- [ ] **Step 2: 定义三种文件 kind**

```ts
export const FILE_KINDS = {
  agentInput: 'captionforge.agent-input',
  agentDraft: 'captionforge.agent-draft',
  project: 'captionforge.project',
} as const;
```

- [ ] **Step 3: 定义 Agent 场景草稿**

```ts
export interface AgentDraft {
  kind: 'captionforge.agent-draft';
  schemaVersion: 1;
  componentLibraryVersion: 1;
  scenes: Array<{
    sceneId: string;
    sourceCueIds: string[];
    components: Array<{
      componentId: string;
      componentVersion: number;
      role: string;
      content: Record<string, unknown>;
      placementPreset?: PlacementPreset;
    }>;
  }>;
}
```

- [ ] **Step 4: 定义正式工程实例**

```ts
export interface MotionEffectInstance {
  instanceId: string;
  sceneId?: string;
  componentId: string;
  componentVersion: number;
  sourceCueIds: string[];
  startFrame: number;
  durationInFrames: number;
  track: number;
  zIndex: number;
  props: Record<string, unknown>;
  transform: {x: number; y: number; scale: number; rotation: number};
}
```

- [ ] **Step 5: Schema 使用 strict object**

所有顶层、scene、component、cue 和实例对象拒绝未知字段。列表在文件协议中必须是真正数组；不得接受二次 JSON 字符串作为对外格式。

- [ ] **Step 6: 编写版本与边界测试**

覆盖：合法双组件 scene；未知字段；错误 kind；未知 schemaVersion；空 cue 引用；字符串化列表；非法 transform；负帧数。

- [ ] **Step 7: 验证并提交**

Run: `npm run test -- src/project/schema.test.ts && npm run typecheck`

Commit: `feat: define captionforge project schemas`

---

### Task 4: Build the Single ProjectComposition and Multi-Instance Runtime

**Files:**
- Create: `src/composition/ProjectComposition.tsx`
- Create: `src/composition/EffectInstanceFrame.tsx`
- Create: `src/composition/instanceConfig.ts`
- Create: `src/composition/instanceConfig.test.ts`
- Create: `src/project/fixtures/two-component-scene.ts`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `MotionProject`、`effectRegistry`、现有 `ConfigProvider`。
- Produces: `ProjectComposition({project, editorMode})`。

- [ ] **Step 1: 创建标题 + 半环形占比夹具**

夹具包含同一时间出现的两个实例、不同 track 和不同位置；它是多组件场景的永久回归样例。

- [ ] **Step 2: 编写实例配置失败测试**

`toInstanceConfig(effect)` 必须合并精品默认值、内容 props 和 transform，并将标准 `scale: 1` 转成现有组件使用的百分比 `100`。Agent 内容不得覆盖未声明为 agentEditable 的样式字段。

- [ ] **Step 3: 实现实例包装层**

包装层根据 `componentId` 取组件，在独立 `ConfigProvider` 中渲染，因此同一组件可同时出现多次且参数不同。

- [ ] **Step 4: 实现唯一工程 Composition**

每个正式实例通过 `<Sequence layout="none">` 按 `startFrame` 和 `durationInFrames` 渲染。DOM 顺序按 `zIndex` 再按 track 稳定排序。

- [ ] **Step 5: 在现有应用增加内部工程预览入口**

不删除组件实验室。用开发期开关加载双组件夹具，验证标题和半环形同时播放、分别读取参数、结束帧均保持正确。

- [ ] **Step 6: 验证并提交**

Run: `npm run verify`

Expected: 单组件实验室仍正常；双组件夹具在 Player 同时可见。

Commit: `feat: render multi-instance motion projects`

---

### Task 5: Run the Render Backend Bake-Off Before Building the Editor

**Files:**
- Create: `src/export/RenderBackend.ts`
- Create: `src/export/webRendererBackend.ts`
- Create: `src/export/exportValidation.ts`
- Create: `src/export/exportValidation.test.ts`
- Create: `docs/migration/render-backend-decision.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: `ProjectComposition`、`MotionProject`。
- Produces: 被记录并批准的 `RenderBackend` 决策。

- [ ] **Step 1: 定义可替换后端**

```ts
export interface RenderBackend {
  checkSupport(): Promise<{supported: boolean; reasons: string[]}>;
  render(
    project: MotionProject,
    options: {format: 'webm-alpha'; width: number; height: number; fps: number},
    onProgress: (value: number) => void,
  ): Promise<Blob>;
}
```

- [ ] **Step 2: 接入 Web Renderer**

使用 `container: 'webm'`、`videoCodec: 'vp9'`、`transparent: true`。启动前调用支持性检查；不支持时返回原因，不偷偷回退为不透明视频。

- [ ] **Step 3: 选择三类真实组件**

从冻结组件库选择：纯文字、最复杂发光/阴影卡片、图表或多条目。具体 ID 写入决策文档并由用户确认，不使用虚构组件。

- [ ] **Step 4: 对比四个代表帧**

每个组件记录入场、入场中间、稳定、结束前帧；对比 Player 与导出帧的字体、渐变、阴影、边框、透明度、位置和缩放。

- [ ] **Step 5: 验证透明通道**

导出透明 WebM 后分别置于白、黑、彩色背景上回放。Alpha 丢失、黑底污染或明显边缘色差任一出现即判为失败。

- [ ] **Step 6: 写入后端决策**

Web Renderer 只有在三类组件均无可感知视觉降级时才成为主后端。否则记录失败证据，并把 Node/Remotion sidecar 设为后续后端；工程和编辑器任务不改接口。

- [ ] **Step 7: 验证并提交**

Run: `npm run verify`

Commit: `feat: validate remotion export backend`

---

### Task 6: Migrate Subtitle Parsing and Deterministic Draft Compilation

**Files:**
- Create: `src/subtitle/parse.ts`
- Create: `src/subtitle/parse.test.ts`
- Create: `src/agent/exportInput.ts`
- Create: `src/agent/exportInput.test.ts`
- Create: `src/project/validateDraft.ts`
- Create: `src/project/validateDraft.test.ts`
- Create: `src/project/compileDraft.ts`
- Create: `src/project/compileDraft.test.ts`

**Interfaces:**
- Consumes: CaptionForge `src/subtitle/parse.ts` 的稳定行为、项目 Schema、effectRegistry。
- Produces: `exportAgentInput()`、`validateAgentDraft()`、`compileAgentDraft()`。

- [ ] **Step 1: 先迁测试，再迁字幕解析**

保留 SRT 时间格式、空文本过滤、稳定 cue ID 和中文文本行为。ASS 若旧实现只按 SRT 解析，不在本任务扩大格式能力。

- [ ] **Step 2: 导出标准 Agent 输入包**

输出 kind、schemaVersion、视频宽高/fps/时长和带稳定 ID 的 cues。不得包含本地视频绝对路径。

- [ ] **Step 3: 实现硬错误校验**

覆盖未知组件、版本不兼容、未知内容字段、类型错误、必填缺失、不存在 cue、数值/单位无来源、列表容量超限和排他组件冲突。

- [ ] **Step 4: 实现软警告**

覆盖推荐长度、实际 footprint 碰撞、同场景主体过多、字幕未使用和重复视觉角色。时间重叠本身不得产生警告。

- [ ] **Step 5: 确定性编译**

场景开始取首个引用 cue 的开始，结束取最后引用 cue 的结束；程序换算帧、注入默认值、分配首个空闲 track、生成正式 instanceId。相同输入必须得到除 instanceId 外相同输出。

- [ ] **Step 6: 草稿不得修改正式工程测试**

验证校验失败、用户放弃和只读预览都不改变正式 `effects`。

- [ ] **Step 7: 验证并提交**

Run: `npm run test -- src/subtitle src/agent src/project && npm run typecheck`

Commit: `feat: compile sourced agent drafts`

---

### Task 7: Add Editor State, Video Loading, and Project Persistence

**Files:**
- Create: `src/store/editorStore.ts`
- Create: `src/store/editorStore.test.ts`
- Create: `src/project/serialize.ts`
- Create: `src/project/serialize.test.ts`
- Create: `src/editor/EditorApp.tsx`
- Create: `src/effect-lab/EffectLab.tsx`
- Modify: `src/app/App.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `MotionProject`、编译后的草稿、ProjectComposition。
- Produces: 正式工程状态、只读草稿状态、选择和播放状态。

- [ ] **Step 1: 安装 Zustand 并定义最小 store**

只包含视频元数据、字幕、正式工程、草稿、selectedInstanceId、currentFrame、isPlaying 和必要 actions；不迁移 LLM 配置。

- [ ] **Step 2: 编写状态隔离测试**

覆盖：导入草稿不改正式工程；应用草稿才替换/追加正式实例；放弃草稿清空预览；删除所选实例清除选择。

- [ ] **Step 3: 工程保存与打开**

保存 `captionforge.project`，打开时先 Schema 校验；未知版本显示错误且保持当前工程不变。

- [ ] **Step 4: 保留组件实验室**

把当前组件演示 UI 移到 `EffectLab.tsx`，不重写其视觉；`App.tsx` 提供编辑器和实验室入口。

- [ ] **Step 5: 验证并提交**

Run: `npm run verify`

Commit: `feat: add captionforge editor state`

---

### Task 8: Migrate Mouse Placement and Multi-Track Timeline

**Files:**
- Create: `src/editor/VideoStage.tsx`
- Create: `src/editor/SelectionBox.tsx`
- Create: `src/editor/Timeline.tsx`
- Create: `src/editor/DraftReview.tsx`
- Create: `src/editor/coordinates.ts`
- Create: `src/editor/coordinates.test.ts`
- Modify: `src/editor/EditorApp.tsx`

**Interfaces:**
- Consumes: editorStore、ProjectComposition、effectRegistry footprint。
- Produces: 鼠标拖拽缩放、多轨编辑和只读草稿确认界面。

- [ ] **Step 1: 先迁坐标数学测试**

从 CaptionForge `VideoPreview.tsx` 提取思想而非整文件复制。测试屏幕坐标到 1920×1080 工程坐标、边界夹取、四角等比缩放和 Player 缩放变化。

- [ ] **Step 2: 选择框与视觉组件解耦**

选择框位于编辑器覆盖层；`editorMode=false` 时不渲染。组件内部不得引入鼠标状态。

- [ ] **Step 3: 多组件场景点击行为**

标题与半环形同时存在时可分别选中、移动和缩放；修改一个实例不得改变另一个实例 props。

- [ ] **Step 4: 迁移多轨时间轴能力**

正式实例和只读草稿采用不同外观。实例块支持选择、移动起止边界和轨道；同场景成员允许共享初始区间但保持独立实例。

- [ ] **Step 5: 草稿审查面板**

逐组件显示名称、场景、时间、字幕原文、内容、错误和警告；只有零硬错误时启用“应用草稿”。

- [ ] **Step 6: 浏览器端交互验收**

使用双组件夹具验证：同时显示、分别点击、拖拽、缩放、改文字、改时长、调整 zIndex、应用/放弃草稿。

- [ ] **Step 7: 验证并提交**

Run: `npm run verify`

Commit: `feat: add visual timeline editing`

---

### Task 9: Generate the External Agent Skill from Effect Definitions

**Files:**
- Create: `scripts/generate-skill.mjs`
- Create: `scripts/generate-skill.test.ts`
- Create: `scripts/validate-agent-draft.mjs`
- Create: `skill/SKILL.md`
- Create: `skill/references/project-schema.md`
- Create: `skill/references/composition-guidelines.md`
- Create: generated `skill/references/components/*.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: effectRegistry、AgentDraftSchema。
- Produces: 可安装 Skill 和与应用相同规则的外部校验命令。

- [ ] **Step 1: 一级索引只保留选择信息**

每个条目包含 ID、结构说明、适用场景、不适用场景、容量和 reference 路径；不把所有参数塞入 `SKILL.md`。

- [ ] **Step 2: 单组件 reference 自动生成**

只输出 `agentEditable: true` 的内容参数、类型、必填、容量、特殊语法和合法 JSON 示例。样式参数不向 Agent 暴露为可填字段。

- [ ] **Step 3: 写组合规则**

说明 `Scene → components[]`、标题 + 数据等角色组合、位置预设、排他组件和字幕来源要求；不穷举组件两两组合表。

- [ ] **Step 4: 外部校验脚本复用同一 Schema**

命令格式固定为：

```powershell
node scripts/validate-agent-draft.mjs path\to\draft.json path\to\agent-input.json
```

退出码 0 表示结构和来源通过；退出码 1 打印精确 JSON path 错误。

- [ ] **Step 5: 防漂移测试**

验证每个公开组件恰好有一个 reference；生成两次内容相同；reference 参数和注册表一致；SKILL 路径全部存在。

- [ ] **Step 6: 验证并提交**

Run: `npm run generate:skill && npm run test -- scripts/generate-skill.test.ts && npm run verify`

Commit: `feat: generate captionforge motion skill`

---

### Task 10: Add Tauri and Transparent MOV Export

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/main.rs`
- Create: `src/tauri/bridge.ts`
- Create: `src/export/exportMov.ts`
- Create: `src/export/exportMov.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: 已批准 RenderBackend 产生的透明输出。
- Produces: 本地透明 ProRes 4444 MOV。

- [ ] **Step 1: 迁入最小 Tauri 1 外壳**

保留 Windows 本地个人使用目标。资源只声明需要的 FFmpeg；不复制 CaptionForge 的 keyring 依赖和 credential commands。

- [ ] **Step 2: 迁入文件与字幕能力**

只实现视频选择、保存路径和同名 `.srt`/`.ass` 探测。所有用户路径通过参数传递，不拼接 shell 命令。

- [ ] **Step 3: 增加透明 WebM → ProRes 命令**

Rust 使用 `Command::new(ffmpeg)` 分参数调用：输入透明 WebM，输出 `prores_ks`、profile `4444`、pixel format `yuva444p10le`。失败返回 stderr 尾部，成功返回输出路径。

- [ ] **Step 4: 导出过程可取消且不污染工程**

导出状态独立于正式工程。失败或取消后删除本次临时文件，不删除用户已存在的输出文件。

- [ ] **Step 5: 桌面验收**

导出 10 秒双组件场景 MOV，在黑、白和彩色背景上验证 Alpha，并导入用户目标剪辑软件验证播放。

- [ ] **Step 6: 如果 Web Renderer 决策失败**

按 Task 5 的证据实现 Node/Remotion sidecar 版本 `RenderBackend`。只允许替换 `src/export/*Backend.ts` 和 Tauri sidecar 配置；ProjectComposition、工程协议和组件不得分叉。

- [ ] **Step 7: 验证并提交**

Run: `npm run verify && npm run tauri build`

Expected: Web 构建、Rust 构建、桌面包和透明 MOV 验收全部通过。

Commit: `feat: export transparent captionforge movies`

---

### Task 11: End-to-End Acceptance and Cutover

**Files:**
- Create: `docs/migration/end-to-end-acceptance.md`
- Modify: user-facing product title/config only after acceptance passes

**Interfaces:**
- Consumes: 全部前序任务。
- Produces: 可归档旧 CaptionForge 的明确证据。

- [ ] **Step 1: 使用真实视频和字幕导出 Agent 输入包**

确认 cue ID、时间、视频元数据正确且不泄露本地绝对路径。

- [ ] **Step 2: 在外部 Agent 中调用生成的 Skill**

Agent 必须只读取一级索引和所选组件 references，生成至少一个双组件场景。

- [ ] **Step 3: 外部和应用内双重校验草稿**

验证同一非法草稿在两处给出一致硬错误；合法草稿进入只读预览且不改正式时间轴。

- [ ] **Step 4: 应用并手工编辑**

分别拖动、缩放、改内容、改时长和调整层级；保存工程、关闭并重新打开，结果一致。

- [ ] **Step 5: 导出透明 MOV**

验证 Player 与成片视觉一致、Alpha 正确、中文字体正确、多组件层级正确，并能导入目标剪辑软件。

- [ ] **Step 6: 跑全部自动门禁**

Run: `npm run verify && npm run tauri build`

Expected: 全部退出码 0；验收文档中没有未解释失败项。

- [ ] **Step 7: 用户最终确认**

只有用户确认新版本覆盖所需工作流后，才把产品标题统一为 CaptionForge，并将旧项目标记为归档。不得自动删除旧目录或 ZIP 备份。

Commit: `chore: complete captionforge migration`

---

## Explicitly Excluded from This Migration

- 应用内 LLM/Agent、供应商设置和 API Key 管理。
- 视频画面理解、音频理解和自动人物避让。
- 云渲染、账户、同步、协作或插件市场。
- 把 CaptionForge 全部 102 个旧效果机械迁入。
- 为同一个精品组件维护 Remotion 与 Canvas 两个渲染实现。
- 在 v1 中加入复杂组合锁定、多人协作或自动布局优化器。

## Self-Review Result

- Spec coverage: 已覆盖精品组件冻结、单一渲染树、Scene 多组件、Agent 草稿、程序校验、鼠标编辑、时间轴、Skill、透明导出和旧项目归档门槛。
- Scope decomposition: 计划按独立可验收任务拆分；每个任务应在执行时使用单独 reviewer gate。
- Type consistency: `EffectDefinition`、`AgentDraft`、`MotionEffectInstance`、`ProjectComposition` 和 `RenderBackend` 的消费者与产出关系一致。
- Safety: 不删除旧项目，不覆盖用户备份，不在草稿校验失败时修改正式工程。

## Execution Handoff

当前状态是“等待用户完成精品组件库 v1”，不是执行状态。

用户准备好后，从 Start Gate 开始；先重新读取当时的组件目录与配置，再按 Task 1 建立冻结快照。不得根据本计划撰写时的组件数量或文件行号直接开工。
