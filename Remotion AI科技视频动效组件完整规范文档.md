# Remotion AI科技视频动效组件完整规范文档

> 更新要点

1. **强制避中心区**：画布1920×1080，中心禁区 X：760‑1160px，**禁止放置任何UI、文字、卡片、线条、光点**；所有组件只能放在【左侧安全区 X120‑720px】或【右侧安全区 X1200‑1800px】
2. 每个组件增加「适配主题&场景」，明确适合的话题、业务使用场景
3. 完整保留原有运动曲线、色值、字体、示例文字；不再使用画面居中排版，模块内部文字跟随放置侧做左对齐/右对齐
4. 安全边距：上下80px，左右120px，组件不得超出画布安全边界
5. **本次新增：组件内部每一个元素的像素偏移、相对坐标、间距、锚点、对齐基准；不再只写模糊排版描述**

> 坐标约定：

> - 模块容器：以模块左上角为局部原点 `(localX=0,localY=0)`

> - 左侧安全区：模块容器左上角绝对坐标 `X=130,Y=传入Y值`；内部全部元素**锚点Left‑Top，左对齐**

> - 右侧安全区：模块容器右上角绝对坐标 `X=1790,Y=传入Y值`；内部全部元素**锚点Right‑Top，右对齐**

> - 所有间距均为像素px；行间距为行高倍数；卡片内边距为padding

> - 模块容器宽高：自动适配内部全部子元素，不会溢出安全区边界

## 0. 全局通用强制规范

### 0.1 渲染规则

1. 全部组件为**透明通道叠加素材**，不生成背景，直接叠加在底层视频之上。
2. 画布：1920×1080，16:9。
3. 安全边距：上下80px，左右120px。
4. 布局铁则：中心禁区 X760‑1160px 只留给原始视频画面；组件二选一：左侧安全区（模块整体左对齐） / 右侧安全区（模块整体右对齐），模块边界严禁跨入中心禁区。
5. 视觉基调：极简高级科技风，动效克制，服务信息阅读，拒绝浮夸装饰。

### 0.2 字体规范

- 中文：思源黑体 Bold / Heavy
- 英文/数字：Inter Bold / Black，字距适度拉开

### 0.3 全局色彩

- 主文字白：`#FFFFFF`
- 辅助浅灰：`#E6E6E6`
- 主题青蓝：`#4CC9F0`
- 主题玫红：`#F72585`
- 主题青绿：`#06D6A0`
- 主题淡紫：`#C77DFF`
- 轨道半透底色：`rgba(255,255,255,0.18)`
- 文字投影：`rgba(0,0,0,0.45)`，柔和投影，无硬描边

### 0.4 运动曲线（Remotion + Hyperframes）

> 禁止使用 linear 匀速

1. 入场动画：`Hyperframes EaseOutExpo` 极致缓出，先快后慢轻柔定格
2. 常驻呼吸动画：`Remotion EaseInOutSine` 正弦韵律柔和起伏
3. 位移流转动画：`Hyperframes EaseInOutQuad` 弹性缓动，带物理惯性
4. 数字扫光：柔光掠过 + 底层正弦呼吸；整套组件节奏基准1.5s

---

# 第一大类：极简纯文字+细线条组件

> 风格：无卡片、无光晕，依靠字号层级+细线条构建信息，轻量化；模块整体置于左侧/右侧安全区，禁止侵入中心禁区。

> 内部坐标规则：

> - 左侧放置：模块容器绝对坐标 `X=130`；所有子元素 localX=0，锚点 Left‑Top

> - 右侧放置：模块容器绝对坐标 `X=1790`；所有子元素 localX=0，锚点 Right‑Top

> - 元素之间垂直间距为像素，从上往下依次排布。

## 1. 顶部状态标签+主标题副标题组合组件

- **模块摆放位置**：推荐右侧安全区，模块容器绝对坐标 `X=1790,Y=160`；容器最大宽度570px；整体右对齐
- **内部像素级布局（相对模块容器）**

1. 状态标签：localX=0，localY=0；字号28px Bold；垂直向下距离下一个元素 `32px`
2. 英文小节标签：localX=0，localY=32；字号32px Bold；垂直向下距离下一个元素 `24px`
3. 中文主标题：localX=0，localY=88；字号80px Heavy；垂直向下距离下一个元素 `16px`
4. 中文副标题：localX=0，localY=184；字号40px Regular

> 全部元素锚点 Right‑Top；无横向偏移；模块容器高度自动撑开至副标题底部。

- 文字参数
  - 状态标签：28px Bold｜`#E6E6E6`｜全大写
  - 小节英文标签：32px Bold｜主题色
  - 中文主标题：80px Heavy｜`#FFFFFF`
  - 中文副标题：40px Regular｜`#E6E6E6`
- **动效**：角标优先EaseOutExpo淡入，依次带出英文、主标题、副标题；状态角标带极弱正弦呼吸，其余文字静态
- **适配主题&场景**
  - 话题：AI模型更新、硬件性能、软件版本迭代、项目模块开篇
  - 场景：技术章节导言、产品版本片头、报告片段开篇
- 示例文字

  > 状态标签：LOOP

  > 英文：TECHNOLOGY ANALYSIS

  > 主标题：AI智能算法迭代升级

  > 副标题：基于深度学习的全新算力优化方案

## 2. 左侧竖线引用注释组件

- **模块摆放位置**：固定左侧安全区，模块容器绝对坐标 `X=140,Y=220`；容器最大宽度540px；整体左对齐
- **内部像素级布局（相对模块容器，锚点Left‑Top）**

1. 装饰竖线：localX=0，localY=0；宽度3px；高度自适应引用正文总高度；圆角2px；
2. 引用正文文本块：localX=50，localY=0；字号44px Bold；行间距1.2；垂直向下距离注释小字 `20px`
3. 注释小字：localX=50，localY=正文总高+20；字号34px Regular

> 竖线Y范围与引用正文完全对齐；注释小字不跟随竖线高度。

- 文字&线条
  - 引用正文：44px Bold｜`#FFFFFF`｜行间距1.2
  - 注释小字：34px Regular｜`#E6E6E6`
  - 竖线：宽3px｜主题纯色｜圆角2px，高度自适应文本
- **动效**：竖线EaseOutExpo从上向下生长，文字逐行淡入；竖线常驻正弦呼吸伸缩
- **适配主题&场景**
  - 话题：行业洞察、技术哲学、专家观点、项目理念
  - 场景：金句引用、专家观点摘录、核心结论摘抄
- 示例文字

  > 引用正文：技术迭代的核心，是效率与体验的双向突破

  > 注释小字：行业核心共识 · 2026技术发展准则

## 3. 顶部小字注解+主标题组合组件

- **模块摆放位置**：可选左侧`X=130` / 右侧`X=1790`安全区，模块Y=180；容器最大宽度570px
- **内部像素级布局**

1. 注解小字：localX=0，localY=0；字号34px；垂直向下间距 `28px`
2. 主标题：localX=0，localY=28；字号82px Heavy

> 左模式锚点Left‑Top；右模式锚点Right‑Top。

- 文字参数
  - 注解：34px｜`#E6E6E6`
  - 主标题：82px Heavy｜`#FFFFFF`
- **动效**：注解先淡入，主标题EaseOutExpo缩放浮现；常驻完全静态
- **适配主题&场景**
  - 话题：技术名词科普、行业背景、方案要点预告
  - 场景：概念引出、章节小标题、知识点前置介绍
- 示例文字

  > 注解：核心技术亮点

  > 主标题：全域智能感知系统

## 4. 顶部小标题+大副标题层级组件

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区，模块Y=180；容器最大宽度570px
- **内部像素级布局**

1. 顶部小标题：localX=0，localY=0；字号38px Bold；向下间距`24px`
2. 主标题：localX=0，localY=24；字号86px Heavy；向下间距`16px`
3. 副标题：localX=0，localY=126；字号44px Regular

> 左模式锚点Left‑Top；右模式锚点Right‑Top。

- 文字参数
  - 顶部小标题：38px Bold｜`#4CC9F0`
  - 主标题：86px Heavy｜`#FFFFFF`
  - 副标题：44px Regular｜`#E6E6E6`
- **动效**：小字优先淡入，主标题缩放出场，副标题延迟跟进；常驻静态
- **适配主题&场景**
  - 话题：算力升级、架构改造、产品新特性
  - 场景：技术进展介绍、方案概述、模块开篇
- 示例文字

  > 小标题：TECH PROGRESS

  > 主标题：算力效能全面升级

  > 副标题：突破传统算力瓶颈，实现全域效率提升

## 5. 双层粗细线条标题装饰组件

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区，模块Y=200；容器最大宽度570px
- **内部像素级布局**

1. 主标题：localX=0，localY=0；字号82px Heavy；向下间距`14px`
2. 副标题：localX=0，localY=96；字号42px Regular；向下间距`22px`
3. 上线细实线：localX=0，localY=152；高度2px；长度与主标题文字宽度保持一致；圆角2px
4. 下线粗半透线：localX=0，localY=158；高度4px；长度与上线完全相同；圆角2px

> 线条和主标题同宽；左模式从localX=0向右延伸；右模式从localX=0向左延伸。

- 线条&文字
  - 上线：2px｜`#4CC9F0`，下线：4px｜`rgba(76,201,240,0.3)`，圆角2px
  - 主标题：82px Heavy｜`#FFFFFF`
  - 副标题：42px Regular｜`#E6E6E6`
- **动效**：双层线条从中心向两端生长，文字同步淡入；上线正弦呼吸，下线静态
- **适配主题&场景**
  - 话题：技术突破、产品亮点、新功能发布
  - 场景：模块重点标题、核心亮点强调
- 示例文字

  > 主标题：智能化场景落地应用

  > 副标题：多场景适配 · 高兼容 · 低损耗运行机制

## 6. 标题+底部双线条平衡组件

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区，模块Y=200；容器最大宽度570px
- **内部像素级布局**

1. 英文小节标签：localX=0，localY=0；字号32px Bold；向下间距`22px`
2. 中文主标题：localX=0，localY=22；字号82px Heavy；向下间距`14px`
3. 副标题：localX=0，localY=114；字号42px Regular；向下间距`26px`
4. 上平行线：localX=0，localY=172；高度3px；
5. 下平行线：localX=0，localY=184；高度3px；两条线垂直间距12px；线条长度等于主标题文字宽度。

- 线条&文字
  - 英文标签：32px Bold｜`#4CC9F0`
  - 主标题：82px Heavy｜`#FFFFFF`
  - 副标题：42px Regular｜`#E6E6E6`
  - 双线：单条高3px，间距12px，主题色，圆角2px
- **动效**：文字层级逐次淡入，双线拉伸生长；双线同步正弦呼吸
- **适配主题&场景**
  - 话题：技术复盘、成果汇总、方案小结
  - 场景：章节收尾、模块总结、结论收束
- 示例文字

  > 英文标签：SUMMARY

  > 主标题：技术体系整体总结

  > 副标题：完成全链路技术闭环，实现高效稳定运行

## 7. 双标题叠加层级组件

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区，模块Y=200；容器最大宽度570px
- **内部像素级布局**

> 两层标题**垂直完全重叠**，局部Y坐标完全一致，底层衬托文字Z‑Index=1；顶层主标题Z‑Index=2。

1. 底层衬托标题：localX=0，localY=0；字号70px Bold
2. 顶层主标题：localX=0，localY=0；字号86px Heavy
3. 辅助说明小字：localX=0，localY=102；字号40px Regular；在标题下方，垂直间距24px

- 文字参数
  - 底层衬托：70px Bold｜`rgba(255,255,255,0.25)`
  - 顶层主标题：86px Heavy｜`#FFFFFF`
  - 辅助说明：40px Regular｜`#E6E6E6`
- **动效**：底层文字先淡入铺垫，顶层主标题缩放凸显；常驻全程静态
- **适配主题&场景**
  - 话题：商业分析、技术愿景、长期战略规划
  - 场景：高级感开篇标题、远景阐述、价值主张输出
- 示例文字

  > 底层：DATA DRIVEN

  > 主标题：数据驱动智能升级

  > 说明：以数据为核心，重构智能运行逻辑

## 8. 分段式多行文本递进组件

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区，模块Y=220；容器最大宽度570px
- **内部像素级布局**

1. 模块主标题：localX=0，localY=0；字号76px Heavy；向下间距26px
2. 多行文本块：localX=0，localY=102；字号44px；行间距1.3；每一条列表项垂直间距18px；关键词行内高亮，不改变元素位置。

- 文字参数
  - 模块主标题：76px Heavy｜`#FFFFFF`
  - 常规文本：44px Regular｜`#E6E6E6`
  - 高亮正向：44px Bold｜`#4CC9F0`；高亮反向：44px Bold｜`#F72585`
- **动效**：文字自上而下逐行淡入；高亮关键词极弱正弦呼吸提亮
- **适配主题&场景**
  - 话题：技术利弊分析、风险收益、方案约束条件
  - 场景：优缺点罗列、要点拆解、多条件对比说明
- 示例文字

  > 主标题：技术优势与现存痛点

  > • **高效算力**：单设备算力输出提升30%，运行延迟大幅降低

  > • **适配局限**：极端场景下兼容性有待进一步优化升级

## 9. 顶部锚点标签正文组件

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区，模块Y=180；容器最大宽度570px
- **内部像素级布局**

1. 锚点标签：localX=0，localY=0；字号34px Bold；向下间距28px
2. 主标题：localX=0，localY=28；字号82px Heavy；向下间距20px
3. 正文段落：localX=0，localY=124；字号42px Regular；行间距1.25；行内关键词高亮。

- 文字参数
  - 锚点标签：34px Bold｜`#C77DFF`｜全大写
  - 主标题：82px Heavy｜`#FFFFFF`
  - 正文：42px Regular｜`#E6E6E6`
- **动效**：锚点先淡入，主标题缩放显现，正文逐行递进；关键词呼吸提亮
- **适配主题&场景**
  - 话题：算法逻辑、系统架构、业务原理解读
  - 场景：原理解析、逻辑讲解、机制说明
- 示例文字

  > 锚点：CORE LOGIC

  > 主标题：核心运行逻辑解析

  > 正文：依托**自适应算法**，系统可实时调整运行策略，规避**无效算力消耗**，实现高效运转。

## 10. 底部注释锚点文本组件

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区，模块Y=300；容器最大宽度570px
- **内部像素级布局**

1. 主文本块：localX=0，localY=0；字号50px Bold；行间距1.25；向下间距24px
2. 底部注释：localX=0，localY=主文本总高+24；字号32px Regular

- 文字参数
  - 主文本：50px Bold｜`#FFFFFF`｜行间距1.25
  - 底部注释：32px Regular｜`#4CC9F0`
- **动效**：主文本整体淡入，注释延迟0.2s浮现；注释带微弱正弦呼吸
- **适配主题&场景**
  - 话题：行业统计、调研数据、分析结论
  - 场景：带数据源备注的结论展示、统计结果输出
- 示例文字

  > 主文本：全链路智能化改造，实现降本增效核心目标

  > 注释：数据统计周期：2026全年

## 11. 右侧角标标签+主体文本组件

- **模块摆放位置**：推荐右侧安全区，模块容器绝对坐标`X=1790,Y=260`；容器最大宽度570px；整体右对齐
- **内部像素级布局**

> 角标是模块内部的悬浮子元素，不占用主文本垂直流；Z‑Index=3。

1. 角标：localX=0，localY=0；锚点Right‑Top；字号32px Bold；带小圆角半透底衬；
2. 主标题：localX=0，localY=44；字号78px Heavy；向下间距16px
3. 说明文本：localX=0，localY=138；字号42px Regular

> 角标在模块容器的右上角，不和主标题发生垂直重叠。

- 文字参数
  - 角标：32px Bold｜`#F72585`｜全大写，半透小圆角底衬
  - 主标题：78px Heavy｜`#FFFFFF`
  - 说明文本：42px Regular｜`#E6E6E6`
- **动效**：角标优先点亮，标题、说明依次缓出；角标常驻柔和呼吸
- **适配主题&场景**
  - 话题：版本更新、新增功能、实验性功能提示
  - 场景：新特性标记、迭代提示、版本状态高亮
- 示例文字

  > 角标：NEW UPDATE

  > 主标题：全新版本功能迭代

  > 说明：多项核心功能优化，适配更多应用场景

---

# 第二大类：光晕阴影卡片风格组件

> 卡片统一规则：

> - 卡片容器为最外层；卡片设置padding；所有文字、线条在卡片padding内部；

> - 左侧放置：卡片绝对X=130；卡片内部所有元素锚点Left‑Top；

> - 右侧放置：卡片绝对X=1790；卡片内部所有元素锚点Right‑Top；

> - 卡片外发光属于卡片容器样式，不属于内部子元素。

## 1. 单侧渐变发光边框文本卡片组件

- **模块摆放位置**：可选左侧/右侧安全区悬浮，Y=240；卡片内边 padding：上下24px，左右24px；卡片宽度自适应内部文本。
- **内部像素级布局（卡片padding内部）**

1. 正文文本：localX=0，localY=0；字号52px Bold；行间距1.25；占满padding内部可用空间。
2. 渐变边框：绑定卡片容器，仅单侧3px渐变边框，不占用内部布局空间；外发光挂载卡片容器。

- 卡片样式：底色完全透明；仅单侧3px渐变边框`#4CC9F0→#C77DFF`，圆角8px；外发光 `0 0 10px`渐变柔光
- 文字：正文52px Bold｜`#FFFFFF`｜行间距1.25
- **动效**：渐变边框逐段生长绘制，文字延迟淡入；边框柔光正弦明暗呼吸
- **适配主题&场景**
  - 话题：关键技术论断、项目核心价值、行业重要判断
  - 场景：核心结论高亮、关键观点强化、重点信息卡片
- 示例文字

  > 卡片正文：核心技术突破，实现行业领先层级效能

## 2. 悬浮圆角标题卡片组件

- **模块摆放位置**：可选左侧/右侧安全区，Y=220；卡片padding：上下36px，左右48px；圆角16px。
- **内部像素级布局（padding内部）**

1. 顶部小字标签：localX=0，localY=0；字号36px Bold；向下间距22px
2. 主标题：localX=0，localY=58；字号78px Heavy

- 卡片样式：底色`rgba(76,201,240,0.06)`；2px纯色边框`#4CC9F0`，圆角16px；微弱外发光`0 0 8px rgba(76,201,240,0.15)`
- 文字：顶部小字标签36px Bold｜`#4CC9F0`；主标题78px Heavy｜`#FFFFFF`
- **动效**：卡片整体缩放淡入，之后文字依次点亮；卡片底色极弱呼吸缩放
- **适配主题&场景**
  - 话题：核心技术成果、项目里程碑、重要产出
  - 场景：章节重点高亮、成果卡片、里程碑展示
- 示例文字

  > 标签：CORE ACHIEVEMENT

  > 主标题：核心技术成果落地

## 3. 弱底纹高亮重点模块组件

- **模块摆放位置**：可选左侧/右侧安全区，Y=240；底纹容器包裹全部文字，圆角12px，无边框；padding上下20px，左右20px。
- **内部像素级布局（padding内部）**

1. 标题：localX=0，localY=0；字号60px Heavy；向下间距16px
2. 说明文本：localX=0，localY=76；字号40px

- 样式：底纹`rgba(76,201,240,0.08)`
- 文字：标题60px Heavy｜`#FFFFFF`；说明40px｜`#E6E6E6`
- **动效**：底纹先淡入打底，文字层级显现；底纹超低幅度正弦呼吸
- **适配主题&场景**
  - 话题：产品核心优势、能力要点、关键卖点
  - 场景：重点信息高亮、优势提炼、核心能力概括
- 示例文字

  > 标题：核心优势亮点

  > 说明：低功耗、高效率、高兼容的一体化运行体系

## 4. 渐变底纹高亮标题组件

- **模块摆放位置**：可选左侧/右侧安全区，Y=220；底纹容器padding上下30px，左右30px；圆角12px，无硬边框。
- **内部像素级布局（padding内部）**

1. 主标题：localX=0，localY=0；字号84px Heavy；向下间距18px
2. 辅助说明：localX=0，localY=102；字号42px Regular

- 样式：线性渐变底纹 `rgba(76,201,240,0.1) → rgba(199,125,255,0.1)`
- 文字：主标题84px Heavy｜`#FFFFFF`；辅助说明42px Regular｜`#E6E6E6`
- **动效**：渐变底纹柔和淡入，主标题缩放缓出；底纹做低对比度明暗呼吸
- **适配主题&场景**
  - 话题：年度重大突破、里程碑事件、跨越式升级
  - 场景：重磅结论、关键节点、重大成果强调
- 示例文字

  > 主标题：年度核心突破

  > 说明：突破行业技术壁垒，实现跨越式效能提升

---

# 第三大类：数据展示类组件

> 全部模块容器约束在单侧安全区，不跨禁区；内部元素相对模块容器写死垂直像素间距。

## 1. 超大单位后缀数字组件

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区，Y=220；容器最大宽度570px
- **内部像素级布局**

1. 顶部说明小字：localX=0，localY=0；字号36px；向下间距24px
2. 【数字+单位行】：localX=0，localY=60；数字与单位**横向紧贴排布无间距**；数字200px Heavy，单位80px Bold；向下间距20px
3. 底部说明：localX=0，localY=280；字号42px

- 文字参数
  - 顶部小字：36px｜`#E6E6E6`
  - 核心数字：200px Heavy｜`#FFFFFF`
  - 单位：80px Bold｜主题色
  - 底部说明：42px｜`#E6E6E6`
- **动效**：数字EaseOutExpo回弹缩放入场；常驻底层正弦呼吸 +135°斜向扫光循环
- **适配主题&场景**
  - 话题：性能指标、帧率、吞吐量、硬件核心参数
  - 场景：单核心KPI展示、峰值参数突出展示
- 示例文字

  > 顶部小字：整体运算效率

  > 数字：120 单位：FPS

  > 底部说明：超高帧率稳定运行，无卡顿延迟

## 2. 数据前缀标签+核心数值组件

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区，Y=260；容器最大宽度570px
- **内部像素级布局**

1. 标签‑数值‑单位横向一行；localX=0，localY=0；三者横向紧贴；标签48px Bold；数值180px Heavy；单位64px。

- 文字参数
  - 标签：48px Bold｜主题色
  - 数值：180px Heavy｜`#FFFFFF`
  - 单位：64px｜主题色
- **动效**：标签先淡入，数字弹性缩放入场；常驻扫光循环+微弱呼吸
- **适配主题&场景**
  - 话题：提升幅度、增长率、效率增益、降幅数据
  - 场景：增益数据、提升比例、优化前后变化幅度
- 示例文字

  > 标签：算力提升 数值：58 单位：%

## 3. 左右双数据对比组件

- **模块摆放位置**：整套模块完整放在左侧或右侧安全区内，Y=240；模块总宽度570px，**不可跨到中心禁区**
- **内部像素级布局（模块容器内部）**

> 模块内部双栏；栏之间固定水平间距120px；

> 左栏localX=0；右栏localX=285；两栏顶部Y对齐localY=0。

每栏内部垂直排布：

1. 分类标签：localY=0；字号40px Bold；向下间距16px
2. 核心数值：localY=44；字号160px Heavy；向下间距12px
3. 底部小字：localY=216；字号38px Regular

- 文字参数
  - 分类标签：40px Bold｜左`#4CC9F0` /右`#F72585`
  - 核心数值：160px Heavy｜`#FFFFFF`
  - 底部小字：38px Regular｜`#E6E6E6`
- **动效**：左栏优先出场，右栏延迟0.2s；双数值同步扫光，差异化微弱呼吸
- **适配主题&场景**
  - 话题：优化前后对比、新旧版本、改造前后指标
  - 场景：A/B对照、基线‑优化后数据对比
- 示例文字

  > 【优化前】 45 基础算力水准

  > 【优化后】 92 全新算力水准

## 4. 三行并列核心数据文本组件

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区，Y=220；容器最大宽度570px
- **内部像素级布局**

1. 总标题：localX=0，localY=0；字号76px Heavy；向下间距24px
2. 数据行1：localX=0，localY=100；字号组合【前置标签44px +核心数据56px +后缀说明40px】；横向紧贴
3. 数据行2：localX=0，localY=172；与上一行垂直间距24px
4. 数据行3：localX=0，localY=244；与上一行垂直间距24px

- 文字参数
  - 总标题：76px Heavy｜`#FFFFFF`
  - 前置标签：44px Bold｜`#4CC9F0`
  - 核心数据：56px Heavy｜`#FFFFFF`
  - 后缀说明：40px Regular｜`#E6E6E6`
- **动效**：总标题优先淡入，数据行自上而下错峰入场；数值极弱呼吸高亮
- **适配主题&场景**
  - 话题：多组核心参数、系统指标集合
  - 场景：多参数罗列、关键指标一览、多维度性能汇总
- 示例文字

  > 总标题：核心参数指标

  > •【延迟】8ms 超低运行延迟

  > •【功耗】12W 低功耗运行

  > •【准确率】99.6% 超高识别精度

---

# 第四大类：流程轨道进度组件

## 1. 四等分横向多步骤流程组件

- **模块摆放位置**：整套放置左侧/右侧安全区内部，Y=260；模块总宽度570px
- **内部像素级布局**

1. 主标题：localX=0，localY=0；字号72px Heavy；向下间距32px
2. 四步骤横向排布，在模块容器内做四等分；每一步宽度=(570‑90)/4；步骤之间水平间距30px；全部在模块容器内部，不溢出。

> 单步骤内部垂直布局：

> 步骤序号 localY=0 → 步骤标题 localY=22（向下间距14px）→步骤说明 localY=82（向下间距12px）

> 状态透明度区分：当前100% /已完成80% /未执行25%

- 文字参数
  - 主标题：72px Heavy｜`#FFFFFF`
  - 步骤序号：40px Bold｜`#4CC9F0`
  - 步骤标题：56px Bold｜`#FFFFFF`
  - 步骤说明：38px Regular｜`#E6E6E6`
- **动效**：光点位移使用`EaseInOutQuad`弹性缓动；当前步骤线段正弦呼吸，步骤切换平滑过渡
- **适配主题&场景**
  - 话题：数据处理链路、业务闭环、四阶段工作流
  - 场景：四步闭环拆解、流水线流程、处理链路可视化
- 示例文字

  > 主标题：四步闭环运行流程

  > 1.数据采集 · 全域信息抓取收录

  > 2.数据清洗 · 无效信息过滤剔除

  > 3.运算分析 · 智能算法解析处理

  > 4.结果输出 · 精准结果落地反馈

> 文档到此完整闭环；后续新增组件将统一沿用本套全局约束：**避中心禁区、二选一左右侧放置、每个组件附带适配主题&场景、组件内部全部元素输出相对模块容器的localX/localY、垂直/水平像素间距**。

---

# 第五大类：列表条目‑清单类组件

> 适用：多要点、特性清单、风险点、功能列表；全部元素约束在单侧安全区，不侵入中心禁区。

## 5‑1 带圆点标记竖向条目清单组件

- **模块摆放位置**：可选左侧`X=130` / 右侧`X=1790`安全区；模块Y=220；容器最大宽度570px
- **内部像素级布局（相对模块容器）**

1. 清单主标题：localX=0，localY=0；字号72px Heavy；向下垂直间距`28px`
2. 条目容器起始位置：localX=0，localY=100
3. 单条条目内部：
  - 标记圆点：localX=0，localY=0；圆形半径8px；填充`#4CC9F0`；与后方文本水平间距`16px`
  - 条目标题文本：localX=24，localY=-6；字号48px Bold；
  - 条目描述文本：localX=24，localY=48；字号38px Regular；行间距1.2
4. 条目与下一条整体垂直间距：`36px`

> 右侧模式：圆点localX=0向左排布，文本跟随右对齐；圆点保持在文本外侧。

- 色彩：圆点`#4CC9F0`；条目标题`#FFFFFF`；条目描述`#E6E6E6`
- **动效**：主标题EaseOutExpo淡入；条目从上到下依次错峰延迟0.18s入场；圆点执行微弱正弦呼吸缩放；文本常驻静态。
- **适配主题&场景**
  - 话题：产品特性、能力清单、风险点罗列、方案优势集合
  - 场景：功能盘点、要点枚举、多条件说明
- 示例文字

> 主标题：核心能力清单

> ● 高速推理：大模型本地高速推理，降低云端依赖

> ● 低资源占用：硬件开销可控，适配中端设备

> ● 高扩展性：插件化架构，支持自定义模块接入

## 5‑2 状态标签+条目清单组件（三色状态标记）

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区；模块Y=240；容器最大宽度570px
- **内部像素级布局**

1. 模块标题：localX=0，localY=0；字号70px Heavy；向下间距`30px`
2. 条目起始 localX=0，localY=100
3. 单条目内部：
  - 状态小标签：localX=0，localY=0；字号30px Bold；padding：上下4px，左右10px；圆角6px；
    - 正常/完成：`#06D6A0`；警告：`#F72585`；进行中：`#4CC9F0`
  - 条目主文本：localX=标签宽度+20，localY=-4；字号44px Bold
  - 补充小字：localX=标签宽度+20，localY=46；字号36px Regular
4. 条目之间垂直间距：`40px`

- **动效**：标题先入场；条目逐行依次弹出；状态标签带颜色呼吸闪烁，正文静态。
- **适配主题&场景**
  - 话题：项目任务、迭代进度、功能状态巡检、风险清单
  - 场景：任务看板、状态盘点、待办/已完成展示
- 示例文字

> 主标题：迭代任务状态

> 【DONE】内核模块重构：完成底层调度逻辑重写

> 【PROGRESS】多模型调度：正在兼容第三方模型接入

> 【WARN】内存回收：极端场景存在内存泄漏风险

## 5‑3 数字序号竖向列表组件

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区；模块Y=200；容器最大宽度570px
- **内部像素级布局**

1. 章节标题：localX=0，localY=0；字号74px Heavy；向下间距`26px`
2. 列表起始 localX=0，localY=94
3. 单条内部：
  - 序号：localX=0，localY=0；字号46px Bold；主题色；固定宽度42px；
  - 条目标题：localX=54，localY=-4；字号48px Bold；
  - 条目说明：localX=54，localY=48；字号38px Regular；
4. 条目垂直间距：`34px`

- **动效**：标题淡入，序号先行点亮，随后条目文字依次出现；序号微弱呼吸。
- **适配主题&场景**
  - 话题：步骤讲解、方案要点、原因分析、技术要点拆解
  - 场景：教程步骤、原因罗列、方案分步解读
- 示例文字

> 章节标题：系统优化三大方向

> 1.算力调度：重新分配硬件资源，降低无效占用

> 2.缓存策略：构建多级缓存，缩短数据读取耗时

> 3.链路裁剪：剔除冗余逻辑，压缩整体执行链路

## 5‑4 双列key‑value信息清单组件

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区；模块Y=240；容器总宽570px
- **内部像素级布局**

1. 模块标题：localX=0，localY=0；字号70px Heavy；向下间距`28px`
2. 列表起始 localX=0，localY=98
3. 单条行内布局：
  - Key字段：localX=0，localY=0；字号44px Bold；主题色；固定宽度180px
  - Value字段：localX=200，localY=0；字号44px Regular；`#E6E6E6`
4. 行与行垂直间距：`26px`

> 右侧模式：Key靠右，Value向左排布，保持总宽度570px。

- **动效**：标题先出现；每行Key先点亮，Value延迟0.1s跟进；无常驻动画。
- **适配主题&场景**
  - 话题：系统参数、版本信息、硬件配置、项目元信息
  - 场景：配置一览、版本信息、元数据展示
- 示例文字

> 模块标题：版本基础信息

> 版本号  V2.5.1

> 发布时间 2026‑08

> 目标平台 Windows / MacOS

> 内核  Hyper‑engine‑v4

---

# 第六大类：轨道、时间线、箭头流向可视化组件

> 全部轨道、节点、箭头严格限定在单侧安全区，**轨道线段绝对禁止跨入X760‑1160中心禁区**。

## 6‑1 竖向时间线时间轴组件

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区；模块Y=200；容器最大宽度570px
- **内部像素级布局**

1. 时间线标题：localX=0，localY=0；字号72px Heavy；向下间距`32px`
2. 主竖轨道线：localX=22，localY=104；线宽3px；颜色`rgba(76,201,240,0.3)`；高度自适应所有节点总高度。
3. 时间节点（每个节点）：
  - 圆点节点：localX=22，localY=N；半径10px；填充`#4CC9F0`；Z-index=2；圆心落在竖轨道上。
  - 时间标签：localX=56，localY=N‑8；字号34px Bold｜`#4CC9F0`
  - 事件标题：localX=56，localY=N+24；字号46px Bold｜`#FFFFFF`
  - 事件描述：localX=56，localY=N+64；字号36px Regular｜`#E6E6E6`
4. 节点之间垂直间距固定：`80px`

> 右侧模式：竖轨道靠右，圆点靠右，文本向左排布。

- **动效**：竖轨道从上向下生长；节点圆点依次点亮弹出；时间标签、标题、描述依次延迟入场；当前激活节点圆点正弦呼吸放大缩小。
- **适配主题&场景**
  - 话题：产品迭代历史、项目里程碑、技术演进、事件时间线
  - 场景：版本发展史、项目关键节点、技术演进回顾
- 示例文字

> 时间线标题：产品演进时间线

> 2025‑03 V1.0正式发布 基础推理能力落地

> 2025‑11 V2.0大版本更新 新增多任务调度模块

> 2026‑08 V2.5重大升级 重构底层内核架构

## 6‑2 单向箭头横向流转组件（三节点数据流）

- **模块摆放位置**：整套放置左侧/右侧安全区内部，Y=260；模块总宽度570px，**不跨禁区**
- **内部像素级布局**

1. 模块标题：localX=0，localY=0；字号70px Heavy；向下间距`36px`
2. 节点横向均分排布，模块总宽570px；节点之间水平间距60px。
3. 单节点容器宽130px；内部垂直布局：
  - 节点标题 localY=0；字号42px Bold｜`#FFFFFF`
  - 节点小字 localY=42；字号32px Regular｜`#E6E6E6`
4. 箭头：位于两个节点中间；高度2px；`#4CC9F0`；箭头三角大小12px；箭头动画光点沿箭头从左向右流动。

> 右侧模式整体右对齐，箭头方向逻辑不变。

- **动效**：标题先淡入；节点依次出场；箭头线段逐段绘制；流动光点使用`EaseInOutQuad`做往复流转动画。
- **适配主题&场景**
  - 话题：数据流、消息流转、请求链路、业务流向
  - 场景：三阶段数据流展示、请求‑处理‑输出链路
- 示例文字

> 模块标题：数据流转链路

> 输入 原始数据接入

> 处理 算法运算解析

> 输出 结果对外返回

## 6‑3 分组轨道分段进度条组件

- **模块摆放位置**：可选左侧`X=130` /右侧`X=1790`安全区；Y=300；容器最大宽度570px
- **内部像素级布局**

1. 进度标题：localX=0，localY=0；字号70px Heavy；向下间距`30px`
2. 进度轨道背景条：localX=0，localY=100；高度14px；圆角7px；底色`rgba(255,255,255,0.18)`；宽度570px。
3. 进度填充条：localX=0，localY=100；高度14px；圆角7px；主题色；宽度按进度百分比；Z-index=1。
4. 进度文本组：
  - 当前进度数值：localX=0，localY=130；字号48px Heavy｜`#FFFFFF`
  - 进度描述小字：localX=110，localY=136；字号34px｜`#E6E6E6`

- **动效**：背景轨道先出现；填充条EaseOutExpo从0向目标宽度延展；进度数字同步计数动画；填充条正弦呼吸明暗。
- **适配主题&场景**
  - 话题：任务完成度、加载进度、指标达成率、项目完成比例
  - 场景：进度可视化、达成率展示、任务完成状态
- 示例文字

> 进度标题：项目整体完成度

> 82% 整体开发任务进度

## 6‑4 带分支分叉流向图组件（双分支输出）

- **模块摆放位置**：整套放置左侧/右侧安全区，Y=240；模块总宽570px
- **内部像素级布局**

1. 主标题：localX=0，localY=0；字号70px Heavy；向下间距34px
2. 输入节点：localX=0，localY=98；节点文本44px Bold；下方输出主轨道向下；轨道宽3px。
3. 分叉点 localY=180；从分叉点分出左右两条分支轨道；分支水平分开距离140px。
4. 左右分支终点节点：每个节点内部：标题42px Bold；说明34px Regular。
5. 全部线条宽度3px；主题半透色；节点圆点半径10px。

- **动效**：主轨道先绘制，再生成分叉两条分支；节点依次点亮；光点沿路径流动。
- **适配主题&场景**
  - 话题：分支逻辑、分流策略、两种结果分支、条件判断
  - 场景：条件分支演示、分流架构、两种路径输出
- 示例文字

> 主标题：分支调度逻辑

> 输入任务

> ├─高速路径：低延迟快速返回

> └─深度路径：全量精细运算

---

# 第七大类：迷你图表数据可视化组件

> 定位：短视频内轻量数据展示，非复杂大屏图表；全部图形、文字约束在单侧安全区，不侵入中心禁区。

## 7‑1 竖向迷你柱状对比组件（4柱）

- **模块摆放位置**：可选左侧`X=130` / 右侧`X=1790`安全区；模块Y=220；容器最大宽度570px
- **内部像素级布局（相对模块容器）**

1. 图表主标题：localX=0，localY=0；字号72px Heavy；向下垂直间距`30px`
2. 图表画布区域起始：localX=0，localY=102；图表画布总宽570px，图表高度220px
3. 4根柱子均分画布宽度；柱子总可用宽度 = 570‑60；柱子之间水平间距20px；单柱宽度 = (570‑60‑(3*20)) / 4 = 102px
4. 单柱内部布局：
  - 柱体：底部对齐图表画布底边；柱高度由数值占比决定；圆角6px；主色`#4CC9F0`，次要对比色`#F72585`
  - 柱顶部数值标签：localX=柱中心，localY=柱体顶部‑12；字号36px Bold；锚点Bottom‑Center；`#FFFFFF`
  - 柱底部类目标签：localX=柱中心，localY=图表画布底边+16；字号32px Regular；锚点Top‑Center；`#E6E6E6`
5. Y轴无坐标轴线条，极简无网格。

> 右侧模式：整体右对齐，柱子从右向左依次排布，标签锚点逻辑不变。

- **动效**：标题先EaseOutExpo淡入；柱体从底部向上生长；顶部数值标签延迟0.2s依次弹出；柱体带有微弱正弦呼吸亮度变化。
- **适配主题&场景**
  - 话题：多组数据对比、性能跑分、吞吐量、版本指标对比
  - 场景：短视频内轻量数据对比、多方案指标对照
- 示例文字

> 图表主标题：各版本推理速度对比

> V1.0｜28

> V2.0｜47

> V2.4｜66

> V2.5｜92

## 7‑2 横向条形对比组件（3条目）

- **模块摆放位置**：可选左侧`X=130` / 右侧`X=1790`安全区；模块Y=240；容器最大宽度570px
- **内部像素级布局**

1. 图表标题：localX=0，localY=0；字号70px Heavy；向下间距`28px`
2. 条目起始位置：localX=0，localY=98；单条目垂直总高度72px；条目之间垂直间距24px
3. 单条目内部：
  - 类目名称文本：localX=0，localY=8；字号42px Bold；固定宽度160px；`#FFFFFF`
  - 条形背景轨道：localX=170，localY=14；高度32px；圆角16px；底色`rgba(255,255,255,0.18)`；可用条形宽度 570‑170‑20 = 380px
  - 条形填充：localX=170，localY=14；高度32px；圆角16px；填充色`#4CC9F0`；宽度映射数值占比
  - 数值标签：localX=170 + 条形填充宽度 +12；localY=10；字号38px Bold；`#FFFFFF`

> 右侧模式：类目靠右，条形向左延伸，数值标签放在条形左侧。

- **动效**：标题入场；背景轨道出现；填充条从左向右延展；数值标签跟随条形末端出现。
- **适配主题&场景**
  - 话题：资源占用、耗时对比、得分、占比统计
  - 场景：硬件开销对比、方案耗时对比
- 示例文字

> 图表标题：资源占用对比

> CPU占用  62%

> 内存占用 48%

> GPU占用 76%

## 7‑3 环形占比饼图组件（3分区，极简无外圈边框）

- **模块摆放位置**：可选左侧`X=130` / 右侧`X=1790`安全区；模块Y=200；容器最大宽度570px
- **内部像素级布局**

1. 图表标题：localX=0，localY=0；字号72px Heavy；向下间距`34px`
2. 环形图容器：localX=0，localY=106；环形外直径220px；内孔直径120px；圆心在容器X=110,Y=110
3. 环形分区：3段扇区；颜色依次：`#4CC9F0`、`#06D6A0`、`#F72585`；无描边。
4. 环形中心内部文本：
  - 主数值：localX=110，localY=96；字号54px Heavy；锚点Center‑Center；`#FFFFFF`
  - 辅助小字：localX=110，localY=140；字号32px Regular；锚点Center‑Center；`#E6E6E6`
5. 图例列表：环形右侧；localX=240，localY=106；
  - 图例色块方块：16×16px；与后面文本水平间距12px；
  - 图例文字：字号34px Regular；`#E6E6E6`；
  - 图例条目垂直间距22px。

> 右侧模式：环形在靠右，图例放在环形左侧。

- **动效**：标题淡入；环形扇区按顺序顺时针绘制展开；中心数字计数动画；扇区常驻静态。
- **适配主题&场景**
  - 话题：资源占比、流量分布、成本构成、任务占比
  - 场景：结构占比展示、成分拆解
- 示例文字

> 图表标题：算力资源分配

> 总计 100%

> 推理算力 60%

> 缓存开销 25%

> 其他开销 15%

## 7‑4 双轴迷你折线趋势组件（双线条，无网格）

- **模块摆放位置**：可选左侧`X=130` / 右侧`X=1790`安全区；模块Y=260；容器最大宽度570px
- **内部像素级布局**

1. 图表标题：localX=0，localY=0；字号70px Heavy；向下间距`30px`
2. 绘图画布：localX=0，localY=100；画布宽570px，画布高度200px；无边框、无坐标轴、无网格线。
3. 两条折线：
  - A线：`#4CC9F0`，线宽4px；圆点标记半径7px；
  - B线：`#F72585`，线宽4px；圆点标记半径7px；
4. X方向均匀分布5个数据点；Y坐标映射数值大小；
5. 底部X类目标签：每个数据点正下方；字号30px Regular；`#E6E6E6`；锚点Top‑Center；垂直距离画布底边14px。
6. 右上角迷你图例：localX=420，localY=104；两个图例，色块14×14px，文字30px；条目横向间距24px。

> 右侧模式：图表整体右对齐，X标签、图例跟随镜像。

- **动效**：标题入场；折线路径逐点绘制；数据圆点依次点亮；线条无呼吸动画。
- **适配主题&场景**
  - 话题：性能随时间变化、吞吐量走势、负载变化趋势
  - 场景：指标趋势、版本迭代变化曲线
- 示例文字

> 图表标题：吞吐量随负载变化

> 负载：20%｜40%｜60%｜80%｜100%

> A模型｜B模型两组曲线

## 7‑5 指标卡片组（双指标并排）

- **模块摆放位置**：可选左侧`X=130` / 右侧`X=1790`安全区；模块Y=240；容器最大宽度570px
- **内部像素级布局**

1. 组标题：localX=0，localY=0；字号70px Heavy；向下间距`26px`
2. 两张卡片横向排布；卡片之间水平间距30px；单卡片宽度270px；卡片padding上下24px，左右20px；圆角12px；底色`rgba(255,255,255,0.08)`；无外发光。
3. 单卡片内部布局：
  - 指标名称：localX=0，localY=0；字号36px Regular；`#E6E6E6`
  - 指标大数值：localX=0，localY=44；字号72px Heavy；`#FFFFFF`
  - 变化标签：localX=0，localY=124；字号32px Bold；向上为`#06D6A0`；向下为`#F72585`

> 右侧模式：两张卡片从右向左排布。

- **动效**：组标题淡入；两张卡片依次弹出；大数字执行计数动画；变化标签微弱呼吸。
- **适配主题&场景**
  - 话题：核心KPI、关键指标、同比环比数据
  - 场景：核心数据快照、关键结果展示
- 示例文字

> 组标题：核心指标快照

> 平均延迟 24ms ↑18%

> 成功率  97.2% ↑2.1%

---

# 第八大类：复合组合组件

> 

> 说明：

> 

> 

> 1. 第八大类 `category:"composite‑module"`，由前面 t1‑xx /t2‑xx /t3‑xx /t4‑xx /t5‑xx /t6‑xx /t7‑xx 基础组件拼装而成；

> 2. 字段 `slots[]`：声明内部引用的基础组件 ID、局部偏移、局部覆盖参数；支持局部覆盖颜色、y 偏移、maxWidth、sample 示例；

> 3. 继承全局画布、禁区约束、easing、color/font tokens；

> 4. 复合容器拥有整体入场动画，内部子组件执行自身原有动画；

> 5. `slot.override`：局部覆写基础组件配置，不会修改原始基础组件定义；

> 6. 整体容器支持统一呼吸动画开关 `compositeBreath`。

# 全部组件汇总说明

> 1‑7大类，合计：

> 第一大类：11个纯文字细线条组件

> 第二大类：4个光晕卡片组件

> 第三大类：4个数据展示组件

> 第四大类：1个流程轨道组件

> 第五大类：4个清单列表组件

> 第六大类：4个时间线流向轨道组件

> 第七大类：5个迷你图表组件第八大类：复合组件

> 总计：**33个可直接用于Remotion的UI组件**，全部具备：画布绝对坐标、模块容器定义、localX/localY相对坐标、像素间距、锚点规则、色值、动画参数、使用场景、示例文本。

```json
{
  "$schemaVersion": "remotion‑tech‑ui‑v1",
  "canvas": {
    "width": 1920,
    "height": 1080,
    "centerForbiddenZone": { "xMin":760, "xMax":1160 },
    "safeAreaLeft": { "x":120, "xMax":720 },
    "safeAreaRight": { "x":1200, "xMax":1800 }
  },
  "globalTokens": {
    "color": {
      "textPrimary": "#FFFFFF",
      "textSecondary": "#E6E6E6",
      "themeCyan": "#4CC9F0",
      "themeMagenta": "#F72585",
      "themeGreen": "#06D6A0",
      "bgOverlayLow": "rgba(255,255,255,0.08)",
      "bgOverlayMed": "rgba(255,255,255,0.18)"
    },
    "font": {
      "cnBold": "SourceHanSans‑Bold",
      "cnHeavy": "SourceHanSans‑Heavy",
      "enBold": "Inter‑Bold",
      "enBlack": "Inter‑Black"
    },
    "easing": {
      "enter": "EaseOutExpo",
      "move": "EaseInOutQuad",
      "breath": "InOutSine 1.5s infinite"
    }
  },
  "components": [
    {
      "componentId":"t1‑01",
      "name":"顶部状态标签+主标题副标题组合",
      "category":"text‑line",
      "placement":["left","right"],
      "container":{ "y":160, "maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑Right","fontSize":28,"fontWeight":"Bold","colorKey":"textSecondary","spacingBottom":32,"animation":"enter"},
        {"localX":0,"localY":32,"anchor":"Top‑Right","fontSize":32,"fontWeight":"Bold","colorKey":"themeCyan","spacingBottom":24,"animation":"enter delay 0.15s"},
        {"localX":0,"localY":88,"anchor":"Top‑Right","fontSize":80,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":16,"animation":"enter delay 0.3s"},
        {"localX":0,"localY":184,"anchor":"Top‑Right","fontSize":40,"fontWeight":"Regular","colorKey":"textSecondary","animation":"enter delay 0.45s"}
      ],
      "breathElements":[0],
      "useCase":{"topics":["AI模型更新","硬件介绍","章节开篇"],"scenes":["章节导言","版本片头"]},
      "sample":{"tag":"LOOP","enTitle":"TECHNOLOGY ANALYSIS","title":"AI智能算法迭代升级","subtitle":"基于深度学习全新算力架构"}
    },
    {
      "componentId":"t1‑02",
      "name":"左侧竖线引用注释组件",
      "category":"text‑line",
      "placement":["left"],
      "container":{ "x":140,"y":220,"maxWidth":540 },
      "elements":[
        {"localX":0,"localY":0,"type":"line‑v","width":3,"colorKey":"themeCyan","heightAuto":"textBlock0","radius":2,"animation":"grow‑down","breath":true},
        {"localX":50,"localY":0,"anchor":"Top‑Left","fontSize":44,"fontWeight":"Bold","colorKey":"textPrimary","lineHeight":1.2,"refId":"textBlock0","spacingBottom":20,"animation":"enter delay 0.2s"},
        {"localX":50,"localY":"textBlock0.bottom+20","anchor":"Top‑Left","fontSize":34,"fontWeight":"Regular","colorKey":"textSecondary","animation":"enter delay 0.35s"}
      ],
      "useCase":{"topics":["行业洞察","理念观点"],"scenes":["金句引用、观点摘录"]},
      "sample":{"quote":"技术迭代的核心，是效率与成本的平衡","note":"行业共识 · 2026技术报告"}
    },
    {
      "componentId":"t1‑03",
      "name":"顶部小字注解+主标题",
      "category":"text‑line",
      "placement":["left","right"],
      "container":{ "y":180,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":34,"fontWeight":"Regular","colorKey":"textSecondary","spacingBottom":28,"animation":"enter"},
        {"localX":0,"localY":28,"anchor":"Top‑LeftOrRight","fontSize":82,"fontWeight":"Heavy","colorKey":"textPrimary","animation":"enter delay 0.25s"}
      ],
      "useCase":{"topics":["概念科普","背景介绍"],"scenes":["小标题引入、知识点前置"]},
      "sample":{"note":"核心技术亮点","title":"全域感知系统"}
    },
    {
      "componentId":"t1‑04",
      "name":"小标题‑主标题‑副标题层级",
      "category":"text‑line",
      "placement":["left","right"],
      "container":{ "y":180,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":38,"fontWeight":"Bold","colorKey":"themeCyan","spacingBottom":24,"animation":"enter"},
        {"localX":0,"localY":24,"anchor":"Top‑LeftOrRight","fontSize":86,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":16,"animation":"enter delay 0.15s"},
        {"localX":0,"localY":126,"anchor":"Top‑LeftOrRight","fontSize":44,"fontWeight":"Regular","colorKey":"textSecondary","animation":"enter delay 0.3s"}
      ],
      "useCase":{"topics":["算力升级","架构改版","新特性"],"scenes":["模块开篇，方案概述"]},
      "sample":{"subTitle":"TECH PROGRESS","title":"算力效率全面提升","desc":"突破传统瓶颈，实现全链路优化"}
    },
    {
      "componentId":"t1‑05",
      "name":"双层粗细线条标题装饰",
      "category":"text‑line",
      "placement":["left","right"],
      "container":{ "y":200,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":82,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":14,"animation":"enter"},
        {"localX":0,"localY":96,"anchor":"Top‑LeftOrRight","fontSize":42,"fontWeight":"Regular","colorKey":"textSecondary","spacingBottom":22,"animation":"enter delay 0.15s"},
        {"localX":0,"localY":152,"type":"line‑h","height":2,"colorKey":"themeCyan","widthAuto":"text0.width","radius":2,"animation":"grow‑center"},
        {"localX":0,"localY":158,"type":"line‑h","height":4,"color":"rgba(76,201,240,0.3)","widthAuto":"text0.width","radius":2,"animation":"grow‑center delay 0.1s"}
      ],
      "breathElements":[2],
      "useCase":{"topics":["技术突破","产品亮点"],"scenes":["章节重点标题"]},
      "sample":{"title":"多场景自适应能力","desc":"多场景兼容 · 低资源开销 · 快速部署"}
    },
    {
      "componentId":"t1‑06",
      "name":"标题底部双平行线平衡组件",
      "category":"text‑line",
      "placement":["left","right"],
      "container":{ "y":200,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":32,"fontWeight":"Bold","colorKey":"themeCyan","spacingBottom":22,"animation":"enter"},
        {"localX":0,"localY":22,"anchor":"Top‑LeftOrRight","fontSize":82,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":14,"animation":"enter delay 0.15s"},
        {"localX":0,"localY":114,"anchor":"Top‑LeftOrRight","fontSize":42,"fontWeight":"Regular","colorKey":"textSecondary","spacingBottom":26,"animation":"enter delay 0.3s"},
        {"localX":0,"localY":172,"type":"line‑h","height":3,"colorKey":"themeCyan","widthAuto":"text1.width","radius":2,"animation":"grow‑center"},
        {"localX":0,"localY":184,"type":"line‑h","height":3,"colorKey":"themeCyan","widthAuto":"text1.width","radius":2,"spacingV":12,"animation":"grow‑center delay 0.1s"}
      ],
      "breathElements":[3,4],
      "useCase":{"topics":["项目复盘","成果总结"],"scenes":["章节收尾、总结段落"]},
      "sample":{"enTag":"SUMMARY","title":"系统整体能力复盘","desc":"完成全链路闭环，达成预期目标"}
    },
    {
      "componentId":"t1‑07",
      "name":"双层重叠标题+辅助说明",
      "category":"text‑line",
      "placement":["left","right"],
      "container":{ "y":200,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"zIndex":1,"anchor":"Top‑LeftOrRight","fontSize":70,"fontWeight":"Bold","color":"rgba(255,255,255,0.25)"},
        {"localX":0,"localY":0,"zIndex":2,"anchor":"Top‑LeftOrRight","fontSize":86,"fontWeight":"Heavy","colorKey":"textPrimary","animation":"enter delay 0.2s"},
        {"localX":0,"localY":102,"anchor":"Top‑LeftOrRight","fontSize":40,"fontWeight":"Regular","colorKey":"textSecondary","spacingTop":24,"animation":"enter delay 0.4s"}
      ],
      "useCase":{"topics":["商业解读","技术愿景"],"scenes":["开篇愿景、价值输出"]},
      "sample":{"bgText":"DATA DRIVEN","title":"数据驱动智能升级","desc":"以数据为根基，重构业务运行逻辑"}
    },
    {
      "componentId":"t1‑08",
      "name":"分段多行文本列表",
      "category":"text‑line",
      "placement":["left","right"],
      "container":{ "y":220,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":76,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":26,"animation":"enter"},
        {"localX":0,"localY":102,"anchor":"Top‑LeftOrRight","fontSize":44,"fontWeight":"Regular","colorKey":"textSecondary","lineHeight":1.3,"itemSpacingV":18,"animation":"stagger 0.18s"}
      ],
      "breathHighlight":true,
      "useCase":{"topics":["优缺点拆解","约束条件"],"scenes":["要点罗列，风险分析"]},
      "sample":{"title":"系统优势与现存约束","items":["● 算力提升：硬件资源利用率显著提高","● 兼容限制：极端环境仍存在适配短板"]}
    },
    {
      "componentId":"t1‑09",
      "name":"顶部锚点标签+正文段落",
      "category":"text‑line",
      "placement":["left","right"],
      "container":{ "y":180,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":34,"fontWeight":"Bold","colorKey":"themeMagenta","spacingBottom":28,"animation":"enter"},
        {"localX":0,"localY":28,"anchor":"Top‑LeftOrRight","fontSize":82,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":20,"animation":"enter delay 0.15s"},
        {"localX":0,"localY":124,"anchor":"Top‑LeftOrRight","fontSize":42,"fontWeight":"Regular","colorKey":"textSecondary","lineHeight":1.25,"animation":"enter delay 0.3s"}
      ],
      "breathHighlight":true,
      "useCase":{"topics":["算法原理","业务逻辑解析"],"scenes":["原理说明，机制解读"]},
      "sample":{"tag":"CORE LOGIC","title":"内核运行逻辑","body":"依靠自适应调度，规避无效资源消耗，提升整体吞吐。"}
    },
    {
      "componentId":"t1‑10",
      "name":"主文本块底部注释",
      "category":"text‑line",
      "placement":["left","right"],
      "container":{ "y":300,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":50,"fontWeight":"Bold","colorKey":"textPrimary","lineHeight":1.25,"refId":"textBlock0","spacingBottom":24,"animation":"enter"},
        {"localX":0,"localY":"textBlock0.bottom+24","anchor":"Top‑LeftOrRight","fontSize":32,"fontWeight":"Regular","colorKey":"themeCyan","animation":"enter delay 0.2s","breath":true}
      ],
      "useCase":{"topics":["统计结论，调研结果"],"scenes":["带数据源备注的结论展示"]},
      "sample":{"body":"完成业务全链路改造，达成降本增效目标","note":"统计周期：2026全年"}
    },
    {
      "componentId":"t1‑11",
      "name":"模块内部悬浮角标+主体文本",
      "category":"text‑line",
      "placement":["right"],
      "container":{ "x":1790,"y":260,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"zIndex":3,"anchor":"Top‑Right","fontSize":32,"fontWeight":"Bold","colorKey":"themeMagenta","padding":"4 10","radius":6,"bg":"rgba(247,37,133,0.15)","animation":"enter","breath":true},
        {"localX":0,"localY":44,"anchor":"Top‑Right","fontSize":78,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":16,"animation":"enter delay 0.2s"},
        {"localX":0,"localY":138,"anchor":"Top‑Right","fontSize":42,"fontWeight":"Regular","colorKey":"textSecondary","animation":"enter delay 0.35s"}
      ],
      "useCase":{"topics":["版本更新，实验特性"],"scenes":["新功能标记、迭代提示"]},
      "sample":{"badge":"NEW UPDATE","title":"新版本迭代能力","desc":"多项能力更新，拓展使用边界"}
    },
    {
      "componentId":"t2‑01",
      "name":"单侧渐变边框透明卡片",
      "category":"card‑glow",
      "placement":["left","right"],
      "container":{ "y":240,"maxWidth":570,"padding":[24,24,24,24],"radius":8,"bg":"transparent" },
      "border":{"side":"single","width":3,"gradient":["#4CC9F0","#C77DFF"],"glow":"0 0 10px rgba(76,201,240,0.4)"},
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":52,"fontWeight":"Bold","colorKey":"textPrimary","lineHeight":1.25,"animation":"enter delay 0.2s"}
      ],
      "breathBorder":true,
      "useCase":{"topics":["关键论断，核心价值"],"scenes":["重点结论高亮卡片"]},
      "sample":{"text":"核心技术突破，实现行业领先水平"}
    },
    {
      "componentId":"t2‑02",
      "name":"半透底色发光圆角标题卡片",
      "category":"card‑glow",
      "placement":["left","right"],
      "container":{ "y":220,"maxWidth":570,"padding":[36,48,36,48],"radius":16,"bg":"rgba(76,201,240,0.06)" },
      "border":{"width":2,"color":"#4CC9F0","glow":"0 0 8px rgba(76,201,240,0.2)"},
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":36,"fontWeight":"Bold","colorKey":"themeCyan","spacingBottom":22,"animation":"enter"},
        {"localX":0,"localY":58,"anchor":"Top‑LeftOrRight","fontSize":78,"fontWeight":"Heavy","colorKey":"textPrimary","animation":"enter delay 0.2s"}
      ],
      "breathContainer":true,
      "useCase":{"topics":["里程碑，重要产出"],"scenes":["成果展示、版本里程碑"]},
      "sample":{"tag":"CORE ACHIEVEMENT","title":"底层架构完成重构"}
    },
    {
      "componentId":"t2‑03",
      "name":"弱底色高亮信息模块",
      "category":"card‑glow",
      "placement":["left","right"],
      "container":{ "y":240,"maxWidth":570,"padding":[20,20,20,20],"radius":12,"bg":"rgba(76,201,240,0.08)","border":null },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":60,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":16,"animation":"enter"},
        {"localX":0,"localY":76,"anchor":"Top‑LeftOrRight","fontSize":40,"fontWeight":"Regular","colorKey":"textSecondary","animation":"enter delay 0.2s"}
      ],
      "breathContainer":true,
      "useCase":{"topics":["产品优势，核心能力"],"scenes":["能力概括，卖点卡片"]},
      "sample":{"title":"核心优势汇总","desc":"低资源占用，高兼容性，可快速扩展"}
    },
    {
      "componentId":"t2‑04",
      "name":"渐变底色无外框标题卡片",
      "category":"card‑glow",
      "placement":["left","right"],
      "container":{ "y":220,"maxWidth":570,"padding":[30,30,30,30],"radius":12,"bgGradient":["rgba(76,201,240,0.1)","rgba(199,125,255,0.1)"],"border":null },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":84,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":18,"animation":"enter"},
        {"localX":0,"localY":102,"anchor":"Top‑LeftOrRight","fontSize":42,"fontWeight":"Regular","colorKey":"textSecondary","animation":"enter delay 0.2s"}
      ],
      "breathContainer":true,
      "useCase":{"topics":["重大升级，版本迭代"],"scenes":["重磅更新展示"]},
      "sample":{"title":"重大版本升级","desc":"内核全面迭代，综合能力大幅提升"}
    },
    {
      "componentId":"t3‑01",
      "name":"大数字+单位底部说明组件",
      "category":"data‑show",
      "placement":["left","right"],
      "container":{ "y":220,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":36,"fontWeight":"Regular","colorKey":"textSecondary","spacingBottom":24,"animation":"enter"},
        {"localX":0,"localY":60,"anchor":"Top‑LeftOrRight","inlineGroup":true,"items":[
            {"fontSize":200,"fontWeight":"Heavy","colorKey":"textPrimary"},
            {"fontSize":80,"fontWeight":"Bold","colorKey":"themeCyan"}
        ],"spacingBottom":20,"animation":"enter delay 0.2s"},
        {"localX":0,"localY":280,"anchor":"Top‑LeftOrRight","fontSize":42,"fontWeight":"Regular","colorKey":"textSecondary","animation":"enter delay 0.35s"}
      ],
      "breathElements":[1],
      "useCase":{"topics":["性能指标，峰值数据"],"scenes":["单核心KPI展示"]},
      "sample":{"note":"推理吞吐","value":"120","unit":"FPS","desc":"满负载稳定输出"}
    },
    {
      "componentId":"t3‑02",
      "name":"前缀标签‑数值‑单位横向单行",
      "category":"data‑show",
      "placement":["left","right"],
      "container":{ "y":260,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","inlineGroup":true,"items":[
            {"fontSize":48,"fontWeight":"Bold","colorKey":"themeCyan"},
            {"fontSize":180,"fontWeight":"Heavy","colorKey":"textPrimary"},
            {"fontSize":64,"fontWeight":"Bold","colorKey":"themeCyan"}
        ],"animation":"enter"}
      ],
      "breathElements":[0],
      "useCase":{"topics":["提升幅度，增长率"],"scenes":["指标增幅快速展示"]},
      "sample":{"prefix":"性能提升","value":"58","unit":"%"}
    },
    {
      "componentId":"t3‑03",
      "name":"双栏对比数据组件",
      "category":"data‑show",
      "placement":["left","right"],
      "container":{ "y":240,"maxWidth":570 },
      "columns":[{"localX":0},{"localX":285,"gap":120}],
      "perColumnElements":[
        {"localY":0,"fontSize":40,"fontWeight":"Bold","colorKey":["themeCyan","themeMagenta"],"spacingBottom":16,"animation":"enter"},
        {"localY":44,"fontSize":160,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":12,"animation":"enter delay 0.15s"},
        {"localY":216,"fontSize":38,"fontWeight":"Regular","colorKey":"textSecondary","animation":"enter delay 0.3s"}
      ],
      "useCase":{"topics":["新旧版本对比，基线对照"],"scenes":["A/B效果对比"]},
      "sample":{"col1":{"label":"基线","val":"45","desc":"旧版本"},"col2":{"label":"新版","val":"92","desc":"V2.5版本"}}
    },
    {
      "componentId":"t3‑04",
      "name":"多行key‑value数据条目",
      "category":"data‑show",
      "placement":["left","right"],
      "container":{ "y":220,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":76,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":24,"animation":"enter"},
        {"localX":0,"localY":100,"rowHeight":72,"rowSpacingV":24,"keyWidth":180,"keyFont":{"size":44,"weight":"Bold","color":"themeCyan"},"valFont":{"size":44,"weight":"Regular","color":"textSecondary"},"animation":"stagger 0.12s"}
      ],
      "useCase":{"topics":["参数配置，元信息"],"scenes":["版本信息、硬件参数列表"]},
      "sample":{"title":"版本参数","rows":[{"k":"版本号","v":"V2.5.1"},{"k":"发布时间","v":"2026‑08"},{"k":"平台","v":"Windows/MacOS"}]}
    },
    {
      "componentId":"t4‑01",
      "name":"模块内四步横向流程",
      "category":"flow‑track",
      "placement":["left","right"],
      "container":{ "y":260,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":72,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":32,"animation":"enter"}
      ],
      "stepLayout":{"count":4,"gapH":30,"innerW":(570‑90)/4,"perStep":{"title":{"size":56,"weight":"Bold"},"desc":{"size":38,"weight":"Regular"},"num":{"size":40,"color":"themeCyan"},"spacingV":[14,12]},"opacityStates":{"active":1.0,"done":0.8,"pending":0.25}},
      "useCase":{"topics":["数据链路，业务流程"],"scenes":["四阶段业务流转演示"]},
      "sample":{"title":"数据处理链路","steps":[{"num":1,"t":"采集","d":"原始数据接收"},{"num":2,"t":"清洗","d":"过滤无效内容"},{"num":3,"t":"运算","d":"模型推理计算"},{"num":4,"t":"输出","d":"结果返回"}]}
    },
    {
      "componentId":"t5‑01",
      "name":"圆点标记竖向清单",
      "category":"list‑item",
      "placement":["left","right"],
      "container":{ "y":220,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":72,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":28,"animation":"enter"}
      ],
      "itemLayout":{"startY":100,"marker":{"r":8,"color":"themeCyan","gapH":16},"title":{"size":48,"weight":"Bold"},"desc":{"size":38,"weight":"Regular","lineHeight":1.2},"itemSpacingV":36},
      "breathMarker":true,
      "useCase":{"topics":["功能清单，优势盘点"],"scenes":["特性列表展示"]},
      "sample":{"title":"核心能力清单","items":[{"t":"本地高速推理","d":"降低云端依赖开销"},{"t":"低资源消耗","d":"适配中端硬件设备"},{"t":"插件扩展","d":"支持自定义模块接入"}]}
    },
    {
      "componentId":"t5‑02",
      "name":"三色状态标签条目清单",
      "category":"list‑item",
      "placement":["left","right"],
      "container":{ "y":240,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":70,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":30,"animation":"enter"}
      ],
      "itemLayout":{"startY":100,"tag":{"fontSize":30,"padding":[4,10],"radius":6,"colors":{"done":"#06D6A0","progress":"#4CC9F0","warn":"#F72585"}},"title":{"size":44,"weight":"Bold"},"desc":{"size":36,"weight":"Regular"},"itemSpacingV":40},
      "breathTag":true,
      "useCase":{"topics":["迭代任务，风险巡检"],"scenes":["任务状态看板"]},
      "sample":{"title":"迭代任务状态","items":[{"tag":"done","t":"内核重构","d":"底层调度完成"},{"tag":"progress","t":"多模型调度","d":"第三方适配进行中"},{"tag":"warn","t":"内存回收","d":"极端场景存在泄漏风险"}]}
    },
    {
      "componentId":"t5‑03",
      "name":"数字序号竖向列表",
      "category":"list‑item",
      "placement":["left","right"],
      "container":{ "y":200,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":74,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":26,"animation":"enter"}
      ],
      "itemLayout":{"startY":94,"numBlock":{"fixedW":42,"fontSize":46,"color":"themeCyan"},"title":{"size":48,"weight":"Bold"},"desc":{"size":38,"weight":"Regular"},"itemSpacingV":34},
      "breathNumber":true,
      "useCase":{"topics":["方案拆解，步骤讲解"],"scenes":["教程步骤、原因分析"]},
      "sample":{"title":"系统优化方向","items":[{"n":1,"t":"算力调度","d":"重新分配硬件资源"},{"n":2,"t":"多级缓存","d":"缩短读取耗时"},{"n":3,"t":"链路裁剪","d":"剔除冗余逻辑"}]}
    },
    {
      "componentId":"t5‑04",
      "name":"双列Key‑Value信息清单",
      "category":"list‑item",
      "placement":["left","right"],
      "container":{ "y":240,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":70,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":28,"animation":"enter"}
      ],
      "itemLayout":{"startY":98,"keyFixedW":180,"keyFont":{"size":44,"weight":"Bold","color":"themeCyan"},"valFont":{"size":44,"weight":"Regular","color":"textSecondary"},"rowSpacingV":26},
      "useCase":{"topics":["硬件配置，版本元数据"],"scenes":["配置信息一览"]},
      "sample":{"title":"版本基础信息","rows":[{"k":"版本号","v":"V2.5.1"},{"k":"发布时间","v":"2026‑08"},{"k":"目标平台","v":"Windows / MacOS"}]}
    },
    {
      "componentId":"t6‑01",
      "name":"竖向时间轴时间线",
      "category":"timeline‑flow",
      "placement":["left","right"],
      "container":{ "y":200,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":72,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":32,"animation":"enter"}
      ],
      "track":{"lineV":{"localX":22,"localY":104,"width":3,"color":"rgba(76,201,240,0.3)"},"node":{"r":10,"color":"themeCyan"},"nodeGapV":80,"labelOffsetX":56,"timeFont":{"size":34,"color":"themeCyan"},"titleFont":{"size":46,"weight":"Bold"},"descFont":{"size":36}},
      "breathActiveNode":true,
      "useCase":{"topics":["产品迭代，项目里程碑"],"scenes":["版本演进回顾"]},
      "sample":{"title":"产品演进时间线","nodes":[{"time":"2025‑03","t":"V1.0发布","d":"基础推理落地"},{"time":"2025‑11","t":"V2.0更新","d":"多任务调度上线"},{"time":"2026‑08","t":"V2.5升级","d":"内核架构重构"}]}
    },
    {
      "componentId":"t6‑02",
      "name":"三节点横向箭头数据流",
      "category":"timeline‑flow",
      "placement":["left","right"],
      "container":{ "y":260,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":70,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":36,"animation":"enter"}
      ],
      "track":{"nodeCount":3,"nodeW":130,"gapH":60,"arrow":{"strokeW":2,"color":"themeCyan","arrowSize":12},"nodeTitle":{"size":42,"weight":"Bold"},"nodeDesc":{"size":32}},
      "flowParticleAnim":true,
      "useCase":{"topics":["请求链路，数据流转"],"scenes":["输入‑处理‑输出链路展示"]},
      "sample":{"title":"数据流转链路","nodes":[{"t":"输入","d":"原始数据接入"},{"t":"处理","d":"算法运算解析"},{"t":"输出","d":"结果对外返回"}]}
    },
    {
      "componentId":"t6‑03",
      "name":"分段进度条指标组件",
      "category":"timeline‑flow",
      "placement":["left","right"],
      "container":{ "y":300,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":70,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":30,"animation":"enter"}
      ],
      "track":{"bgBar":{"localX":0,"localY":100,"h":14,"radius":7,"bg":"rgba(255,255,255,0.18)"},"fillBar":{"h":14,"radius":7,"color":"themeCyan"},"numFont":{"size":48,"weight":"Heavy"},"descFont":{"size":34}},
      "breathFill":true,
      "useCase":{"topics":["任务完成率，达成指标"],"scenes":["项目进度可视化"]},
      "sample":{"title":"项目整体完成度","pct":82,"desc":"整体开发任务进度"}
    },
    {
      "componentId":"t6‑04",
      "name":"单输入双分支分叉流向图",
      "category":"timeline‑flow",
      "placement":["left","right"],
      "container":{ "y":240,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":70,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":34,"animation":"enter"}
      ],
      "track":{"lineW":3,"nodeR":10,"forkY":180,"branchSepX":140,"nodeTitle":{"size":44,"weight":"Bold"},"nodeDesc":{"size":34}},
      "flowParticleAnim":true,
      "useCase":{"topics":["条件分支、分流策略"],"scenes":["两种路径逻辑演示"]},
      "sample":{"title":"分支调度逻辑","input":"任务输入","branches":[{"t":"高速路径","d":"低延迟快速返回"},{"t":"深度路径","d":"全量精细运算"}]}
    },
    {
      "componentId":"t7‑01",
      "name":"4柱竖向迷你柱状图",
      "category":"mini‑chart",
      "placement":["left","right"],
      "container":{ "y":220,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":72,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":30,"animation":"enter"}
      ],
      "chart":{"canvasH":220,"barW":102,"barGapH":20,"barRadius":6,"valLabel":{"size":36,"weight":"Bold"},"catLabel":{"size":32}},
      "breathBar":true,
      "useCase":{"topics":["多版本性能对比"],"scenes":["短视频轻量对比图表"]},
      "sample":{"title":"各版本推理速度对比","data":[{"cat":"V1.0","val":28},{"cat":"V2.0","val":47},{"cat":"V2.4","val":66},{"cat":"V2.5","val":92}]}
    },
    {
      "componentId":"t7‑02",
      "name":"横向条形对比图(3条)",
      "category":"mini‑chart",
      "placement":["left","right"],
      "container":{ "y":240,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":70,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":28,"animation":"enter"}
      ],
      "chart":{"itemH":72,"itemGapV":24,"catFixedW":160,"barH":32,"barRadius":16,"barMaxW":380},
      "useCase":{"topics":["资源占用、耗时对比"],"scenes":["硬件开销对比展示"]},
      "sample":{"title":"资源占用对比","rows":[{"cat":"CPU占用","val":62},{"cat":"内存占用","val":48},{"cat":"GPU占用","val":76}]}
    },
    {
      "componentId":"t7‑03",
      "name":"三段环形占比图",
      "category":"mini‑chart",
      "placement":["left","right"],
      "container":{ "y":200,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":72,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":34,"animation":"enter"}
      ],
      "chart":{"outerD":220,"innerD":120,"centerNum":{"size":54,"weight":"Heavy"},"centerSub":{"size":32},"legendMarkerW":16},
      "useCase":{"topics":["资源占比、成本构成"],"scenes":["结构占比拆解"]},
      "sample":{"title":"算力资源分配","totalText":"总计 100%","segs":[{"name":"推理算力","pct":60},{"name":"缓存开销","pct":25},{"name":"其他开销","pct":15}]}
    },
    {
      "componentId":"t7‑04",
      "name":"双线条迷你折线图",
      "category":"mini‑chart",
      "placement":["left","right"],
      "container":{ "y":260,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":70,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":30,"animation":"enter"}
      ],
      "chart":{"canvasH":200,"lineW":4,"dotR":7,"xLabelFont":{"size":30},"legendFont":{"size":30}},
      "useCase":{"topics":["性能随负载变化","迭代趋势"],"scenes":["指标走势可视化"]},
      "sample":{"title":"吞吐量随负载变化","xLabels":["20%","40%","60%","80%","100%"],"seriesA":[12,27,44,61,78],"seriesB":[18,33,51,66,82]}
    },
    {
      "componentId":"t7‑05",
      "name":"双卡片指标快照组件",
      "category":"mini‑chart",
      "placement":["left","right"],
      "container":{ "y":240,"maxWidth":570 },
      "elements":[
        {"localX":0,"localY":0,"anchor":"Top‑LeftOrRight","fontSize":70,"fontWeight":"Heavy","colorKey":"textPrimary","spacingBottom":26,"animation":"enter"}
      ],
      "chart":{"cardW":270,"cardGapH":30,"cardPadding":[24,20],"cardRadius":12,"cardBg":"rgba(255,255,255,0.08)"},
      "breathChangeTag":true,
      "useCase":{"topics":["核心KPI快照、环比数据"],"scenes":["关键结果展示"]},
      "sample":{"title":"核心指标快照","cards":[{"name":"平均延迟","val":"24ms","delta":{"v":"+18%","dir":"up"}},{"name":"成功率","val":"97.2%","delta":{"v":"+2.1%","dir":"up"}}]}
    }
  ]
}

```

第八大类 components 数组片段

```json
{
  "componentId":"t8‑01",
  "name":"标题+要点列表双模块复合模块",
  "category":"composite‑module",
  "placement":["left","right"],
  "container":{"y":160,"maxWidth":570},
  "compositeBreath":false,
  "compositeEnterAnimation":{"type":"enter","delay":0.0},
  "slots":[
    {
      "refComponentId":"t1‑04",
      "localOffsetY":0,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"subTitle":"CORE FEATURES","title":"核心能力总览","desc":"版本关键特性汇总"}}
    },
    {
      "refComponentId":"t5‑01",
      "localOffsetY":140,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"title":"","items":[
        {"t":"高速本地推理","d":"降低云端调用成本"},
        {"t":"多硬件兼容","d":"覆盖主流消费级设备"},
        {"t":"可扩展插件体系","d":"自定义业务能力接入"}
      ]}}
    }
  ],
  "useCase":{"topics":["产品新特性、版本介绍","scenes":["视频开篇能力总览模块"]},
  "sample":{}
},
{
  "componentId":"t8‑02",
  "name":"标题卡片 + 双栏对比数据复合模块",
  "category":"composite‑module",
  "placement":["left","right"],
  "container":{"y":180,"maxWidth":570},
  "compositeBreath":true,
  "compositeEnterAnimation":{"type":"enter","delay":0.0},
  "slots":[
    {
      "refComponentId":"t2‑02",
      "localOffsetY":0,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"tag":"PERFORMANCE COMPARE","title":"版本性能对比"}}
    },
    {
      "refComponentId":"t3‑03",
      "localOffsetY":160,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"col1":{"label":"旧基线","val":"42","desc":"V2.4"},"col2":{"label":"新版","val":"88","desc":"V2.5"}}}}
    }
  ],
  "useCase":{"topics":["版本迭代、性能对标","scenes":["A/B对比高亮模块"]},
  "sample":{}
},
{
  "componentId":"t8‑03",
  "name":"标题+竖向时间轴里程碑复合模块",
  "category":"composite‑module",
  "placement":["left","right"],
  "container":{"y":140,"maxWidth":570},
  "compositeBreath":false,
  "compositeEnterAnimation":{"type":"enter","delay":0.0},
  "slots":[
    {
      "refComponentId":"t1‑03",
      "localOffsetY":0,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"note":"PRODUCT MILESTONE","title":"产品演进时间线"}}
    },
    {
      "refComponentId":"t6‑01",
      "localOffsetY":120,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"title":"","nodes":[
        {"time":"2025‑02","t":"V1.0 首发","d":"基础推理能力落地"},
        {"time":"2025‑10","t":"V2.0 更新","d":"多任务调度上线"},
        {"time":"2026‑08","t":"V2.5 重构","d":"底层架构全面升级"}
      ]}}
    }
  ],
  "useCase":{"topics":["产品发展史、项目里程碑","scenes":["技术视频时间线叙事模块"]},
  "sample":{}
},
{
  "componentId":"t8‑04",
  "name":"标题+横向迷你条形图复合模块",
  "category":"composite‑module",
  "placement":["left","right"],
  "container":{"y":180,"maxWidth":570},
  "compositeBreath":false,
  "compositeEnterAnimation":{"type":"enter","delay":0.0},
  "slots":[
    {
      "refComponentId":"t1‑05",
      "localOffsetY":0,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"title":"硬件资源开销","desc":"多维度资源占用统计"}}
    },
    {
      "refComponentId":"t7‑02",
      "localOffsetY":130,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"title":"","rows":[
        {"cat":"CPU占用","val":58},
        {"cat":"内存占用","val":44},
        {"cat":"GPU占用","val":71}
      ]}}
    }
  ],
  "useCase":{"topics":["硬件资源、性能评测","scenes":["评测视频数据展示模块"]},
  "sample":{}
},
{
  "componentId":"t8‑05",
  "name":"引用金句 + key‑value参数清单复合模块",
  "category":"composite‑module",
  "placement":["left","right"],
  "container":{"y":160,"maxWidth":570},
  "compositeBreath":true,
  "compositeEnterAnimation":{"type":"enter","delay":0.0},
  "slots":[
    {
      "refComponentId":"t1‑02",
      "localOffsetY":0,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"quote":"性能的本质是取舍，在约束中寻找最优解","note":"技术设计理念"}}
    },
    {
      "refComponentId":"t5‑04",
      "localOffsetY":150,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"title":"版本参数","rows":[
        {"k":"内核版本","v":"V2.5.1‑build1042"},
        {"k":"目标平台","v":"Windows / MacOS"},
        {"k":"模型大小","v":"13B‑quant4"}
      ]}}
    }
  ],
  "useCase":{"topics":["技术理念+参数说明","scenes":["技术讲解视频复合信息面板"]},
  "sample":{}
},
{
  "componentId":"t8‑06",
  "name":"标题+流程箭头 + 状态标签清单复合模块",
  "category":"composite‑module",
  "placement":["left","right"],
  "container":{"y":180,"maxWidth":570},
  "compositeBreath":false,
  "compositeEnterAnimation":{"type":"enter","delay":0.0},
  "slots":[
    {
      "refComponentId":"t1‑06",
      "localOffsetY":0,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"enTag":"WORKFLOW","title":"业务处理流程","desc":"完整链路流转与任务状态"}}
    },
    {
      "refComponentId":"t6‑02",
      "localOffsetY":130,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"title":"","nodes":[
        {"t":"请求输入","d":"接收业务请求"},
        {"t":"调度处理","d":"任务分发运算"},
        {"t":"结果输出","d":"返回业务应答"}
      ]}}
    },
    {
      "refComponentId":"t5‑02",
      "localOffsetY":260,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"title":"任务状态","items":[
        {"tag":"done","t":"请求解析","d":"已完成"},
        {"tag":"progress","t":"模型推理","d":"执行中"},
        {"tag":"warn","t":"结果校验","d":"待复核"}
      ]}}
    }
  ],
  "useCase":{"topics":["业务流程、任务状态流转","scenes":["业务流程讲解完整复合面板"]},
  "sample":{}
},
{
  "componentId":"t8‑07",
  "name":"高亮卡片 + 环形占比图复合模块",
  "category":"composite‑module",
  "placement":["left","right"],
  "container":{"y":160,"maxWidth":570},
  "compositeBreath":true,
  "compositeEnterAnimation":{"type":"enter","delay":0.0},
  "slots":[
    {
      "refComponentId":"t2‑03",
      "localOffsetY":0,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"title":"算力资源构成","desc":"内部资源开销拆解"}}
    },
    {
      "refComponentId":"t7‑03",
      "localOffsetY":140,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"title":"","totalText":"总计 100%","segs":[
        {"name":"推理算力","pct":58},
        {"name":"缓存开销","pct":27},
        {"name":"其他开销","pct":15}
      ]}}
    }
  ],
  "useCase":{"topics":["资源构成、成本拆解","scenes":["资源分析复合展示面板"]},
  "sample":{}
},
{
  "componentId":"t8‑08",
  "name":"标题 + 双指标卡片快照复合模块",
  "category":"composite‑module",
  "placement":["left","right"],
  "container":{"y":200,"maxWidth":570},
  "compositeBreath":false,
  "compositeEnterAnimation":{"type":"enter","delay":0.0},
  "slots":[
    {
      "refComponentId":"t1‑07",
      "localOffsetY":0,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"bgText":"CORE METRICS","title":"核心指标快照","desc":"版本关键性能结果"}}
    },
    {
      "refComponentId":"t7‑05",
      "localOffsetY":120,
      "override":{"container":{"y":0,"maxWidth":570},"sample":{"title":"","cards":[
        {"name":"平均延迟","val":"21ms","delta":{"v":"‑22%","dir":"down"}},
        {"name":"成功率","val":"98.1%","delta":{"v":"+2.7%","dir":"up"}}
      ]}}
    }
  ],
  "useCase":{"topics":["核心KPI、版本成果","scenes":["版本总结结尾数据面板"]},
  "sample":{}
}

```
