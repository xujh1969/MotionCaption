# MotionCaption

字幕驱动的 AI 动效编排工坊：以口播字幕为时间轴，AI 按语义挑选并编排 62 个动效组件，
在参考视频上叠加成品级字幕特效，支持透明背景导出。

## 核心能力

- **组件库（62 个）**：t1 文字 / t2 卡片 / t3 数据 / t4+t5 流程与列表 / t6 时间线 / t7 图表 / fx 字幕特效。
  每个组件自动生成缩略图与 3 秒试播；样式、内容、位置全部可在属性面板调整。
- **AI 编排**：导入字幕（SRT）后由 OpenAI 兼容模型编排组件（桌面端 API Key 存 OS 凭据库，不经 webview）。
  当前工具栏暂不提供入口，能力保留在内部（`src/llm/`）供后续启用；日常编排请用外部 Agent + 组件 Skill。
- **默认样式体系**：单组件「存为默认样式」（仅样式与位置/缩放，**不改文字内容**）、同步同类组件、
  8 槽语义调色板、导出默认样式 JSON 交给 AI 固化进代码。
- **透明导出（桌面端）**：webview 逐帧渲染带 alpha 的 PNG → Rust 调内置 ffmpeg 合成
  ProRes 4444 MOV（`-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le -alpha_bits 8`）。
  浏览器内核不支持透明编码（WebCodecs `alpha:'keep'` 一律 NotSupportedError），因此该功能
  仅桌面端可用。产物可直接拖入剪映 / Premiere / AE 当叠加素材。
- **组件 Skill 同步**：注册表与生成 Skill 的差异对比、一键导出（`skill/SKILL.md` + `references/`），
  供外部 Agent 按规范生成组件编排 JSON。

## 目录结构

```
src/
  remotion/       组件实现(cat*)、catalog、config(CONFIGS+DEFAULTS)
  effects/        注册表、definitions(selectionMetadata)、paletteSlots、stylePrefs
  editor/         编辑器 UI(Toolbar/ComponentLibrary/InspectorPanel/Timeline/VideoStage…)
  composition/    ProjectComposition（预览与导出共用）
  export/         渲染后端与透明导出(transparentExport.ts)
  project/        schema/compileDraft/serialize
  llm/            AI 编排与 provider（内部能力，工具栏暂无入口）
  tauri/          原生桥(bridge.ts)
src-tauri/        Rust 壳：AI 安全通道、Skill 同步、透明导出命令(ffmpeg)
skill/            生成的组件 Skill（同步到 WorkBuddy 安装版）
scripts/          generate-skill / check-skill / bake-style-defaults 等
```

## 开发与验证

```bash
npm run dev            # vite :8011（QA 脚本依赖此端口）
npm test               # vitest（当前基线 380/380）
npm run typecheck      # tsc --noEmit
npm run build          # 生产构建
npm run generate:skill # 重新生成组件 Skill（登记新组件后必跑）
npm run check:skill    # 校验 Skill 无 missing/stale/orphan
npm run check:parity   # 导出 vs 预览的渲染一致性（新增组件后必跑，可跟组件 id）
npm run tauri:dev      # 桌面端开发
npm run tauri:build    # 桌面端打包（窗口默认最大化启动）
```

桌面端打包资源包含 `node_modules/ffmpeg-static/ffmpeg.exe`（透明导出依赖）。

## 版本号

应用版本号**单一来源**：`package.json` 的 `version`（当前 `1.0.0`）。

- 界面：顶栏品牌名右侧显示 `v1.0.0` —— `vite.config.ts` 用 `define` 把 `package.json` 的版本
  注入为 `__APP_VERSION__`（类型声明在 `src/vite-env.d.ts`）。
- 桌面端：`src-tauri/tauri.conf.json` 的 `"version": "../package.json"`，安装包/应用版本继承同一文件。

**约定：每次改动完成并通过验证后，递增 `package.json` 的 `version`**（不要改 `tauri.conf.json` 的版本）。

| 改动性质 | 递增方式 | 示例 |
| --- | --- | --- |
| 修复 / 微调 | patch | `1.0.0` → `1.0.1` |
| 新增功能、新增组件 | minor | `1.0.1` → `1.1.0` |
| 不兼容变更（工程格式、导出格式） | major | `1.1.0` → `2.0.0` |

## 新增组件

**必须**遵循 [COMPONENT_DEVELOPMENT.md](./COMPONENT_DEVELOPMENT.md)：
标准需求 Prompt 模板 + 十步登记清单（组件/config/catalog/selectionMetadata/paletteSlots/
orchestrate/测试/skill）+ 内容键保护规则 + QA 验证链。

## 透明导出原理

1. Chromium/WebView2 的 WebCodecs 不支持 alpha 编码（实测 Chrome 151 / Edge 152 均
   `NotSupportedError: Alpha encoding is not currently supported`），浏览器端透明导出不可行。
2. 桌面端改走「帧序列」：`renderStillOnWeb` 逐帧输出带 alpha 的 PNG → Tauri IPC 写临时目录
   （base64 传输，目录名强制 `motioncaption-alpha-*` 前缀防路径逃逸）→ Rust 启动内置 ffmpeg：
   `-framerate <fps> -i frame%06d.png -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le -alpha_bits 8`。
3. 为什么不是透明 WebM：早期用 VP8/VP9 + `yuva420p` 出过 WebM，Chrome / VLC / mpv 都能正常
   显示透明，但**实测在剪映中被当成不透明素材**，遂整体切换到剪辑软件普遍支持的 ProRes 4444。
   ProRes 是帧内编码，无需 `-b:v` / `-auto-alt-ref` 之类参数。
