# Frozen Motion Component Library v1

- User confirmation date: 2026-09-06
- Snapshot source: `motion-config-2026-08-31.json`
- Catalog source: `motion-demo-system/src/remotion/catalog.ts`
- Component total: 45
- Canvas: 1920×1080
- Frame rate: 30fps

This manifest is the visual migration baseline. Future migration work must preserve each component's rendered appearance at the frozen defaults; `CATALOG`, `CONFIGS`, and `DEFAULTS` are guarded together by `catalogParity.test.ts`.

| ID | Name | Category |
| --- | --- | --- |
| fx-01 | 英文标签+主标题+渐变分割线 | s |
| fx-02 | 英文标签+主标题+渐变线+线下方小字 | s |
| fx-03 | 渐变警示条(菱形感叹号) | s |
| fx-04 | 大标题+指标块列表 | s |
| fx-05 | 竖线+胶囊标签+双行标题 | s |
| fx-06 | 大标题+多行列表 | s |
| fx-07 | 大标题+多行列表卡片 | s |
| fx-08 | 大标题+多进度条 | s |
| fx-09 | 深色渐变数字卡片 | s |
| t1-01 | 顶部标签+英文标签+主标题副标题 | text-line |
| t1-02 | 左侧竖线引用注释 | text-line |
| t1-03 | 顶部小字注解+主标题 | text-line |
| t1-04 | 小标题-主标题-副标题层级 | text-line |
| t1-05 | 主标题副标题+底部渐变线 | text-line |
| t1-06 | 英文标签+主标题副标题+底部渐变线 | text-line |
| t1-07 | 顶部标签+主标题+辅助说明 | text-line |
| t1-08 | 顶部锚点标签+主标题+正文段落 | text-line |
| t1-09 | 主文本块底部注释 | text-line |
| t2-01 | 单侧渐变发光边框文本卡片 | card-glow |
| t2-02 | 半透底色发光圆角标题卡片 | card-glow |
| t2-03 | 弱底色高亮信息模块 | card-glow |
| t3-01 | 大数字+单位底部说明 | data-show |
| t3-02 | 前缀标签-数值-单位单行 | data-show |
| t3-03 | 双栏对比数据 | data-show |
| t3-04 | 多行key-value数据条目 | data-show |
| t4-01 | 多步横向流程 | flow-track |
| t4-02 | 渐变节点阶段演进时间轴 | flow-track |
| t5-01 | 圆点标记竖向清单 | list-item |
| t5-02 | 三色状态标签条目清单 | list-item |
| t5-03 | 序号+大小标题列表 | list-item |
| t5-04 | 双列Key-Value信息清单 | list-item |
| t5-05 | 侧边竖向堆叠标签卡片组 | list-item |
| t5-06 | 横向多列标签标题列表 | list-item |
| t6-01 | 竖向时间轴时间线 | timeline-flow |
| t6-02 | 多节点横向箭头数据流 | timeline-flow |
| t6-03 | 分段进度条指标 | timeline-flow |
| t6-04 | 单输入双分支分叉流向 | timeline-flow |
| t6-05 | 节点分步入场时间线 | timeline-flow |
| t6-06 | 多步骤向上浮动递进时间线 | timeline-flow |
| t7-01 | 标题+竖向柱状图 | mini-chart |
| t7-02 | 横向条形对比图 | mini-chart |
| t7-03 | 多段环形占比图 | mini-chart |
| t7-04 | 双线条迷你折线图 | mini-chart |
| t7-05 | 多卡片指标快照 | mini-chart |
| t7-06 | 半环形占比仪表盘 | mini-chart |
