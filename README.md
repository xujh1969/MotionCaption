# MotionCaption

AI 字幕驱动的视频动效编辑器 —— 将精品 Remotion 动效组件库与完整的视频/字幕/工程编辑能力合并到同一个统一工作台。

支持两条同等重要的使用路径：

1. **完全手工**：在空工程中挑选动效组件、编辑内容与时间、导出透明视频。
2. **AI 编排**：内置 LLM 或安装了组件 Skill 的外部 Agent 选择现有组件并生成 JSON 序列；程序校验通过后原子覆盖当前全部动效。

视频和字幕均为可选输入。新工程默认 1920×1080、30fps、10 秒。

## 核心特性

- **统一工作台**：顶部工具栏 + 左侧组件库 + 中间合成画布 + 右侧属性栏 + 底部时间轴，左右栏可折叠，不再区分"编辑器/组件实验室"两个界面。
- **动效组件库**：数据可视类（折线图、指标卡、进度条、环形进度等）与图文文字类（标题、标签、标注、字幕条等）组件，单击即在当前时间创建正式实例。
- **合成画布**：参考视频、Remotion 动效与字幕在同一工程坐标系合成；透明棋盘 / 深色背景 / 参考视频三种预览背景可切换；实例可点选、拖动、四角等比缩放，点击空白处或按 Escape 取消选中。
- **时间轴**：只读字幕参考轨 + 多条可编辑动效轨；整秒自适应刻度、可拖拽播放头、块级拖移与起止点调整；轨道眼睛开关以"变暗"方式保留内容预览（隐藏轨实例不参与选中与导出）。
- **AI 编排**：两阶段 LLM 流程（字幕选择摘要 → 全量草稿），strict JSON 解析 + schema/版本/字段/排他冲突校验，首次硬错误自动反馈修复一次，失败则保持工程不变；Provider 可替换，开发与测试使用假 Provider。
- **Agent JSON 导入**：外部 Agent 可安装导出的组件 Skill 自行生成同格式 JSON，经完整校验后确定性编译并原子覆盖动效。
- **透明导出**：基于 Remotion Web Renderer 的导出后端，含导出前校验。

## 技术栈

| 层 | 技术 |
| --- | --- |
| UI | React 18 + TypeScript |
| 构建 | Vite 5 |
| 视频合成 | Remotion 4（Player + Web Renderer） |
| 状态 | Zustand 5 |
| 校验 | Zod（工程 schema 与 Agent JSON strict 校验） |
| 测试 | Vitest（组件树静态渲染断言 + 浏览器 QA 脚本） |

## 快速开始

```bash
cd motion-demo-system
npm install
npm run dev       # 开发服务器
npm run verify    # 全量验证：vitest + tsc --noEmit + vite build
```

其他脚本：`npm run build`（类型检查 + 构建）、`npm run typecheck`、`npm run generate:skill`（导出组件 Skill）。

## 目录结构

```
motion-demo-system/        # 主应用
  src/
    editor/                # 工作台界面（工具栏、画布、时间轴、属性栏、AI 编排弹窗）
    composition/           # Remotion 合成树（ProjectComposition / EffectInstanceFrame）
    effects/               # 组件注册表与组件定义
    remotion/components/   # 精品动效组件实现
    llm/                   # LLM Provider 契约与两阶段编排
    project/               # MotionProject 类型、schema 与序列化
    store/                 # Zustand 编辑器状态
    export/                # 透明导出后端与校验
    subtitle/              # 字幕解析
docs/                      # 设计规格、迁移与计划文档
example/                   # 组件效果示例图
```

## 工程格式

工程文件为 `captionforge.project` JSON（schemaVersion 1），包含画布参数（宽高/fps/时长）、字幕 cue 列表与动效实例列表；每个实例引用组件库的 `componentId` + 版本，并携带内容 props、轨道、zIndex 与变换。视频文件与本机路径不进入工程 JSON。

## 路线图

- [ ] Tauri 桌面端：API Key 存入系统凭据库，网络请求由原生命令/sidecar 发出，前端不接触明文 Key
- [ ] 组件 Skill 与外部 Agent 工作流完善
- [ ] 导出性能与批量渲染优化

## 文档

- [统一编辑器工作台设计规格](docs/superpowers/specs/2026-09-07-unified-editor-workspace-design.md)
- [动效组件完整规范](<Remotion AI科技视频动效组件完整规范文档.md>)
