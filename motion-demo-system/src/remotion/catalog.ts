import * as C1 from './components/cat1_text';
import * as C2 from './components/cat2_card';
import * as C3 from './components/cat3_data';
import * as C4 from './components/cat4_5';
import * as C6 from './components/cat6_timeline';
import * as C7 from './components/cat7_chart';
import * as S from './components/catS_fx';
import type { ComponentDef } from '../effects/types';

export type { ComponentDef } from '../effects/types';

export const CATEGORIES: { id: string; label: string }[] = [
  { id: 'special-fx', label: '零、特效FX' },
  { id: 'text-line', label: '一、极简纯文字+细线条' },
  { id: 'card-glow', label: '二、光晕阴影卡片风格' },
  { id: 'data-show', label: '三、数据展示' },
  { id: 'flow-track', label: '四、流程轨道进度' },
  { id: 'list-item', label: '五、列表条目清单' },
  { id: 'timeline-flow', label: '六、时间线·流向·轨道' },
  { id: 'mini-chart', label: '七、迷你图表可视化' },
];

export const CATALOG: ComponentDef[] = [
  // S/特效 FX 系列
  { id: 'fx-01', name: '英文标签+主标题+渐变分割线', category: 'special-fx', component: S.FX_01 },
  { id: 'fx-02', name: '英文标签+主标题+渐变线+线下方小字', category: 'special-fx', component: S.FX_02 },
  { id: 'fx-03', name: '渐变警示条(菱形感叹号)', category: 'special-fx', component: S.FX_03 },
  { id: 'fx-04', name: '大标题+指标块列表', category: 'special-fx', component: S.FX_04 },
  { id: 'fx-05', name: '竖线+胶囊标签+双行标题', category: 'special-fx', component: S.FX_05 },
  { id: 'fx-06', name: '大标题+多行列表', category: 'special-fx', component: S.FX_06 },
  { id: 'fx-07', name: '大标题+多行列表卡片', category: 'special-fx', component: S.FX_07 },
  { id: 'fx-08', name: '大标题+多进度条', category: 'special-fx', component: S.FX_08 },
  { id: 'fx-09', name: '深色渐变数字卡片', category: 'special-fx', component: S.FX_09 },
  // 第一大类 纯文字+细线条
  { id: 't1-01', name: '顶部标签+英文标签+主标题副标题', category: 'text-line', component: C1.T1_01 },
  { id: 't1-02', name: '左侧竖线引用注释', category: 'text-line', component: C1.T1_02 },
  { id: 't1-03', name: '顶部小字注解+主标题', category: 'text-line', component: C1.T1_03 },
  { id: 't1-04', name: '小标题-主标题-副标题层级', category: 'text-line', component: C1.T1_04 },
  { id: 't1-05', name: '主标题副标题+底部渐变线', category: 'text-line', component: C1.T1_05 },
  { id: 't1-06', name: '英文标签+主标题副标题+底部渐变线', category: 'text-line', component: C1.T1_06 },
  { id: 't1-07', name: '顶部标签+主标题+辅助说明', category: 'text-line', component: C1.T1_07 },
  { id: 't1-08', name: '顶部锚点标签+主标题+正文段落', category: 'text-line', component: C1.T1_08 },
  { id: 't1-09', name: '主文本块底部注释', category: 'text-line', component: C1.T1_09 },
  // 第二大类 光晕卡片
  { id: 't2-01', name: '单侧渐变发光边框文本卡片', category: 'card-glow', component: C2.T2_01 },
  { id: 't2-02', name: '半透底色发光圆角标题卡片', category: 'card-glow', component: C2.T2_02 },
  { id: 't2-03', name: '弱底色高亮信息模块', category: 'card-glow', component: C2.T2_03 },
  // 第三大类 数据展示
  { id: 't3-01', name: '大数字+单位底部说明', category: 'data-show', component: C3.T3_01 },
  { id: 't3-02', name: '前缀标签-数值-单位单行', category: 'data-show', component: C3.T3_02 },
  { id: 't3-03', name: '双栏对比数据', category: 'data-show', component: C3.T3_03 },
  { id: 't3-04', name: '多行key-value数据条目', category: 'data-show', component: C3.T3_04 },
  // 第四大类 流程轨道
  { id: 't4-01', name: '多步横向流程', category: 'flow-track', component: C4.T4_01 },
  { id: 't4-02', name: '渐变节点阶段演进时间轴', category: 'flow-track', component: C4.T4_02 },
  // 第五大类 列表
  { id: 't5-01', name: '圆点标记竖向清单', category: 'list-item', component: C4.T5_01 },
  { id: 't5-02', name: '三色状态标签条目清单', category: 'list-item', component: C4.T5_02 },
  { id: 't5-03', name: '序号+大小标题列表', category: 'list-item', component: C4.T5_03 },
  { id: 't5-04', name: '双列Key-Value信息清单', category: 'list-item', component: C4.T5_04 },
  { id: 't5-05', name: '侧边竖向堆叠标签卡片组', category: 'list-item', component: C4.T5_05 },
  { id: 't5-06', name: '横向多列标签标题列表', category: 'list-item', component: C4.T5_06 },
  // 第六大类 时间线流向
  { id: 't6-01', name: '竖向时间轴时间线', category: 'timeline-flow', component: C6.T6_01 },
  { id: 't6-02', name: '多节点横向箭头数据流', category: 'timeline-flow', component: C6.T6_02 },
  { id: 't6-03', name: '分段进度条指标', category: 'timeline-flow', component: C6.T6_03 },
  { id: 't6-04', name: '单输入双分支分叉流向', category: 'timeline-flow', component: C6.T6_04 },
  { id: 't6-05', name: '节点分步入场时间线', category: 'timeline-flow', component: C6.T6_05 },
  { id: 't6-06', name: '多步骤向上浮动递进时间线', category: 'timeline-flow', component: C6.T6_06 },
  { id: 't6-07', name: '有序序号步骤列表·焦点滚动切换', category: 'timeline-flow', component: C6.T6_07 },
  // 第七大类 迷你图表
  { id: 't7-01', name: '标题+竖向柱状图', category: 'mini-chart', component: C7.T7_01 },
  { id: 't7-02', name: '横向条形对比图', category: 'mini-chart', component: C7.T7_02 },
  { id: 't7-03', name: '多段环形占比图', category: 'mini-chart', component: C7.T7_03 },
  { id: 't7-04', name: '双线条迷你折线图', category: 'mini-chart', component: C7.T7_04 },
  { id: 't7-05', name: '多卡片指标快照', category: 'mini-chart', component: C7.T7_05 },
  { id: 't7-06', name: '半环形占比仪表盘', category: 'mini-chart', component: C7.T7_06 },
];
