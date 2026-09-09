import { importAgentSequence } from '../agent/importAgentSequence';
import { AgentDraftSchema } from '../project/schema';
import type { AgentDraft, MotionProject } from '../project/types';
import type { DraftDiagnostic } from '../project/validateDraft';
import { LlmAbortedError, throwIfAborted, type LlmChatMessage, type LlmProvider } from './provider';
import { readUserStyleDefaults } from '../effects/stylePrefs';
import { convertCnNumerals } from './cnNumbers';

export interface ComponentSummary {
  componentId: string;
  componentVersion: number;
  name: string;
  suitableFor: string[];
  avoidFor: string[];
  /** One-line motion sketch (entry style + pacing), optional while only fx/t1 carry it. */
  motionFeel?: string;
}

export interface OrchestrationOptions {
  project: MotionProject;
  style: string;
  components: ComponentSummary[];
  /** Loads the generated skill reference markdown for a selected component. */
  loadReference: (componentId: string) => string | null;
  signal?: AbortSignal;
}

export type OrchestrationResult =
  | { ok: true; effects: import('../project/types').MotionEffectInstance[]; warnings: DraftDiagnostic[]; attempts: 1 | 2 }
  | { ok: false; errors: DraftDiagnostic[]; attempts: 1 | 2 };

const SYSTEM_PROMPT = [
  '你是 CaptionForge 的字幕动效编排助手。',
  '你会收到字幕内容、画布参数、可选的风格偏好和组件资料，任务是挑选组件并填写它们允许编辑的内容字段。',
  '规则：',
  '1. 只输出一个 JSON 对象，禁止输出任何解释、注释或 Markdown 代码围栏以外的文字。',
  '2. 内容字段只能使用组件资料中明确列为可编辑的键；风格、布局、坐标等一切样式属性由系统锁定，禁止出现在 JSON 中。',
  '3. 内容必须基于字幕原文，不得编造字幕里不存在的事实。',
  '4. 结构先行：先按叙事把字幕划分为场景角色（开场/章节标题、并列要点组、单个指标强调、警示/结论、收尾），再为每个角色挑组件；多条连续的同构短句应合并进一个列表/卡片/流程场景，而不是逐句套标题类组件。',
  '5. 组件复用由你按内容形态判断，不做死板的相邻/次数限制：一组可列表化表达且观点多于 3 条时，应合并进一个支持数组的列表/卡片/流程组件（如 fx-04/fx-06/fx-07、t5-*、t7-05）一次性表达，不要用同一个组件多次重复地逐条表达；观点 ≤3 条或各场景结构确实不同时，允许跨场景复用同一组件。唯一要避免的是让某个组件包办整片绝大多数场景，此时改用语义最接近的其他组件。',
  '6. 同刻叠加（多轨）：同一时刻/同一时间段允许叠加多个特效，引擎会把重叠效果自动分配到不同轨道。做法：把同时出现的元素放进同一个 scene 的 components 数组，或让多个 scene 引用同一段/重叠的字幕区间。每层用不同 placementPreset 分占屏幕区域（如上方标题 + 下方指标），避免都留 auto 居中互相遮挡；每个 scene 的 role 需互不相同，同一时刻最多 2-3 层。',
  '7. 文案守则（展示字段是改写，不是照搬）：标题/标签/说明等展示字段（titleText、topText、title/title1/title2、tagText、kickerText、descText，以及列表项的名称/说明）应提炼字幕而不是整句照抄。单行标题字段尽量短（中文 ≤12 字、英文 ≤28 字符）——超长会触发单行自动缩号，影响观感；标题字段内不要用逗号/分号断开长句，多条并列观点应交给列表/卡片/流程场景；枚举优先用数字标识（1/2/3 或 01/02），不要用"其一/其二"式中文序数。数值类字段（如 fx-04 items[].val）只填数字或百分比（如 "80" 或 "80%"），不要填描述性文字；展示文案中的汉字数字一律改写为阿拉伯数字（一百五十→150、百分之二十→20%），字幕已给出的阿拉伯数字保持原样。',
  '8. 对比与取舍内容：字幕出现 A/B 双方优劣或数量的对比且强调某一方（例如"150 种不如意 vs 10 种精要，重点是后者"）时，必须选用能并列呈现双方数值/条目的组件（t3-03 双值对比、t7-01/t7-02/fx-08 条形、t5-* 列表/卡片），并把被强调的一方的数字与结论放进展示字段做视觉侧重；不要用单行标题类组件（t1-*、fx-01/fx-02/fx-05）把这种对比压成一句标题——它们表达不了两边的量级差。',
  '9. 条目出现时机（必须尽量设置）：列表/步骤/卡片/流程/时间轴类组件（t3-05、t3-06、t4-02、t4-03、t4-04、t4-05、t4-06、t4-07、t4-08、t4-09、t5-*、t6-*、t7-07、t7-08、t7-09、t7-11、fx-04/06/07/08 等）的每个条目带数值字段 at（单位：秒，相对场景内最早引用字幕 startMs 的偏移）。凡是内容对应到某条被引用字幕的条目，都必须填 at = (该字幕 startMs − 场景内最早引用字幕的 startMs) / 1000（保留 1 位小数），让每条文字恰好在解说讲到它时出现而不是匀速刷屏；同时确保 sourceCueIds 包含这些字幕。示例：场景引用字幕起点 9800/15600/21400ms → 各条目 at 依次为 0、5.8、11.6。仅当条目是无法对应到任何具体字幕的总结性文字时才省略 at；禁止编造与字幕时间无关的等距数值。at 必须是数字（≥0），禁止字符串、负数或超出场景时长。',
  '10. 默认值是占位，必须全部替换：组件资料里列出的 default（titleText、kickerText、tagText、topText、title1/title2、quoteText、bodyText、descText、noteText、footerText 以及列表项 label / subLabel / indexText / name / pointsA / pointsB / k / v / d 等）只是参数形态示例，不是真实可保留的展示文案。任何示例性短语（如"执行链路三步走""明确目标/拆解路径/验收结果""七天学习计划""机器人/智能体/复杂软件""三步闭环运行流程""4 条主标题")禁止出现在最终 JSON 里——必须改写为基于字幕的提炼内容。t4-03 必须逐项改写 items[].label 和 kickerText/titleText；t4-06 必须逐项改写 items[].indexText/label/subLabel 并按场景调 borderColor；t3-06 必须重写 pointsA/B 的每条要点；标题类组件的 titleText/title 必须根据本场景字幕重新提炼。',
  '11. 主标题承重，副标题辅助：display 字段里**主标题（titleText/title/title1）承载核心重点**——受众最该记住的数字、结论、动作都应浓缩在这一行；副标题（subLabel/descText/quoteText/bodyText/noteText/footerText）只做辅助说明，长度应明显短于主标题或拆成多条要点放进列表。禁止"主标题一句话 + 副标题一整段长解释"这种重心倒置的写法；遇到这种情况，把解释性内容下放为列表条目或换成列表/卡片组件。',
  '12. 组件复用节制（避免重复刷屏）：不要让某个组件 id 在短时间内刷屏。①单场景内只放一个标题/章节型组件（t1-*/fx-01/fx-02/fx-05/t2-02）；②单场景内只放一个多观点容器（fx-04/fx-06/fx-07/t5-*/t7-05）；③短时间窗（约 5 秒）内同一组件 id 不连续出现 2 次以上；④全片 6 个组件里若 t2-01 已出现 2 次，第 3 次必须换型（如改 t1-02 或 t1-09 或 t2-02）；⑤同一个 t4-* 流程组件若已经在上一幕用过 2 步以上的版本，本幕应换同族其他 id 或改用 t6-* 纵向步骤；不允许让一个组件包办整片绝大多数场景（与规则 5 配合）。',
  '13. 列举与顿号并列必须用列表类组件：凡字幕出现"X 和 Y 一共有 N 种情况 / 最好的解决办法有 4 种"或用顿号"、"并列的并列语义（如"换一条视频、换一个文案、换一种风格就不行了"），都属于可列举的并列结构，必须挑选支持数组条目的组件（fx-04/fx-06/fx-07、t3-06、t4-04、t4-05、t4-08、t4-09、t5-01/t5-02/t5-03/t5-04/t5-05/t5-06、t6-*、t7-05 等）一次性表达，按条目逐项填入并列元素；不要拆成多次单标题组件，也不要把这些并列项硬塞进一个 titleText 或 descText 字段。文字特效的任务就是让并列关系可视化。',
  '14. 同刻叠加 ≠ 把顺序内容强行同时：同一时刻允许 2-3 层不同视觉角色的多轨叠加（上方标题 + 下方指标 + 角标等真正同时刻、不互相表达因果的元素），但**应当按顺序表达的内容不要被压成同时出现**——若多个元素本身有先后（步骤、阶段、因果、对比切换），应交给带 at 的列表/流程/时间轴类组件，让观众感受到"先后发生"；只有当元素之间互为支撑、且确实发生在同一瞬间时，才放进同一 scene 的 components 数组同时叠加。顺序变同时会让信息密度塌陷成"全屏大字"。',
].join('\n');

/**
 * Static cue-shape → component shortlist table, mirrored in the generated
 * skill (scripts/generate-skill.mjs). A shortcut, not a complete mapping.
 */
const QUICK_NAV_ROWS = [
  ['开场 / 章节标题', 'fx-01, fx-02, fx-05, t1-01, t1-06, t2-02'],
  ['观点 / 引用 / 警示 / 结论', 't1-02, t1-09, t2-01, fx-03'],
  ['单个数字 / 指标', 't3-01, t3-02, fx-09, t6-03, t7-06'],
  ['多条并列要点（合并为一个场景）', 'fx-04, fx-06, fx-07, t3-06, t4-04, t4-05, t4-08, t4-09, t5-01, t5-02, t5-03, t5-04, t5-05, t5-06, t7-05'],
  ['流程 / 步骤 / 时间轴', 't4-01, t4-02, t4-03, t4-06, t4-07, t6-01, t6-02, t6-04, t6-05, t6-06, t6-07, t6-08'],
  ['图表 / 占比 / 对比', 't3-03, t3-05, t7-01, t7-02, t7-03, t7-04, t7-07, t7-08, t7-09, t7-10, t7-11, fx-08'],
] as const;

const QUICK_NAV_BLOCK = [
  '先按字幕形态缩小候选，再在组件清单中确认（此表是捷径而非穷举）：',
  '',
  '| 字幕形态 | 优先候选组件 |',
  '| --- | --- |',
  ...QUICK_NAV_ROWS.map(([shape, ids]) => `| ${shape} | ${ids} |`),
].join('\n');

const SELECTION_INSTRUCTION = [
  '请从下方组件清单中选出最适合表达这批字幕的组件（1-6 个）。',
  '只输出 JSON：{"selectedComponentIds": ["组件ID", ...]}。',
  '',
  '## 画布',
  '{{CANVAS}}',
  '',
  '## 字幕',
  '{{CUES}}',
  '',
  '## 风格偏好',
  '{{STYLE}}',
  '',
  '## 快速定位',
  '{{NAV}}',
  '',
  '## 组件清单（ID | 名称 | 动效 | 适用 | 不适用）',
  '{{COMPONENTS}}',
].join('\n');

const DRAFT_INSTRUCTION = [
  '基于选定的组件资料，为这批字幕产出一个完整的 CaptionForge Agent 草稿。',
  '只输出一个符合以下结构的 JSON 对象：',
  '{"kind":"captionforge.agent-draft","schemaVersion":1,"componentLibraryVersion":1,"scenes":[{"sceneId":"scene-1","sourceCueIds":["..."],"components":[{"componentId":"...","componentVersion":1,"role":"...","content":{...},"placementPreset":"auto"}]}]}',
  '每个组件的 content 只能包含其资料中列出的可编辑键。',
  '展示文案是提炼不是照抄：标题/标签保持精简（中文 ≤12 字、勿用逗号断句、枚举用数字标识），数值类字段只填数字或百分比。',
  '列表条目出现时机：凡内容对应到某条被引用字幕的条目都必须填数值 at（秒 = (字幕 startMs − 场景最早引用字幕 startMs)/1000，1 位小数），使条目在解说讲到时出现；仅无法对应具体字幕的条目省略；禁止编造等距数值。',
  '场景按时间顺序覆盖整批字幕；多条字幕合并进一个场景时，sourceCueIds 必须列出该场景引用的全部 cue。',
  '需要同刻多轨叠加时：把同时出现的元素放进同一个 scene 的 components（不同 placementPreset 分区），或用多个 scene 引用同一字幕区间——重叠效果会自动落到不同轨道。',
  '',
  '## 画布',
  '{{CANVAS}}',
  '',
  '## 字幕',
  '{{CUES}}',
  '',
  '## 风格偏好',
  '{{STYLE}}',
  '',
  '## 选定组件资料',
  '{{REFERENCES}}',
].join('\n');

/** Extracts a JSON object string, tolerating Markdown code fences around it. */
export function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

const canvasBlock = (project: MotionProject): string => (
  `${project.video.width}x${project.video.height} · ${project.video.fps}fps · ${project.video.durationInFrames} 帧`
);

const cuesBlock = (project: MotionProject): string => (
  project.cues.length
    ? project.cues.map((cue) => (
      `[${cue.cueId}] ${cue.startMs}-${cue.endMs}ms ${convertCnNumerals(cue.text)}`
    )).join('\n')
    : '（无字幕）'
);

const componentsBlock = (components: ComponentSummary[]): string => (
  components.map((component) => (
    `${component.componentId} v${component.componentVersion} | ${component.name}`
    + ` | 动效: ${component.motionFeel || '—'}`
    + ` | ${component.suitableFor.join('；') || '—'}`
    + ` | ${component.avoidFor.join('；') || '—'}`
  )).join('\n')
);

const fill = (template: string, values: Record<string, string>): string => (
  Object.entries(values).reduce(
    (text, [token, value]) => text.split(`{{${token}}}`).join(value),
    template,
  )
);

interface StageOutcome {
  text: string;
  parsed: unknown;
  messages: LlmChatMessage[];
}

class OrchestrationFailure extends Error {
  constructor(
    public readonly diagnostic: DraftDiagnostic,
    public readonly messages: LlmChatMessage[],
    public readonly raw: string | null,
  ) {
    super(diagnostic.message);
  }
}

/**
 * Runs one completion and parses its reply as a JSON object. Throws
 * OrchestrationFailure so the caller can decide whether a repair round is
 * still available.
 */
async function runStage(
  provider: LlmProvider,
  messages: LlmChatMessage[],
  signal: AbortSignal | undefined,
  describeError: (detail: string) => DraftDiagnostic,
): Promise<StageOutcome> {
  let text: string;
  try {
    throwIfAborted(signal);
    text = await provider.complete({ system: SYSTEM_PROMPT, messages, signal });
  } catch (error) {
    if (error instanceof LlmAbortedError || (error instanceof Error && error.name === 'AbortError')) {
      throw new OrchestrationFailure({ code: 'aborted', message: 'AI 编排已取消。' }, messages, null);
    }
    throw new OrchestrationFailure(
      describeError(error instanceof Error ? error.message : String(error)),
      messages,
      null,
    );
  }
  const json = extractJsonObject(text);
  if (!json) {
    throw new OrchestrationFailure(
      describeError('模型输出中没有可解析的 JSON 对象。'),
      messages,
      text,
    );
  }
  try {
    return { text, parsed: JSON.parse(json), messages };
  } catch (error) {
    throw new OrchestrationFailure(
      describeError(`JSON 解析失败：${error instanceof Error ? error.message : '未知错误'}`),
      messages,
      text,
    );
  }
}

function repairMessages(
  failed: { text: string; messages: LlmChatMessage[] },
  errors: readonly string[],
): LlmChatMessage[] {
  return [
    ...failed.messages,
    {
      role: 'user' as const,
      content: [
        '你上一次的输出无效。输出原文如下：',
        '<<<',
        failed.text,
        '>>>',
        '错误如下：',
        ...errors.map((error) => `- ${error}`),
        '请重新输出修正后的完整 JSON 对象，仍然只输出 JSON。',
      ].join('\n'),
    },
  ];
}

export async function orchestrateEffects(
  provider: LlmProvider,
  options: OrchestrationOptions,
): Promise<OrchestrationResult> {
  const { project, style, components, loadReference, signal } = options;
  const shared = {
    CANVAS: canvasBlock(project),
    CUES: cuesBlock(project),
    STYLE: style.trim() || '（未指定）',
  };

  // Stage 1 — component selection from summaries only.
  let selection: StageOutcome;
  try {
    selection = await runStage(
      provider,
      [{ role: 'user', content: fill(SELECTION_INSTRUCTION, {
        ...shared,
        NAV: QUICK_NAV_BLOCK,
        COMPONENTS: componentsBlock(components),
      }) }],
      signal,
      (detail) => ({ code: 'selection_invalid', message: `组件选择阶段失败：${detail}` }),
    );
  } catch (error) {
    if (error instanceof OrchestrationFailure) {
      // Aborting must never trigger another completion.
      if (error.diagnostic.code === 'aborted') {
        return { ok: false, errors: [error.diagnostic], attempts: 1 };
      }
      // One repair round for the selection stage.
      try {
        selection = await runStage(
          provider,
          repairMessages({ text: error.raw ?? '', messages: error.messages }, [error.diagnostic.message]),
          signal,
          (detail) => ({ code: 'selection_invalid', message: `组件选择阶段失败：${detail}` }),
        );
    } catch (retryError) {
      const failure = retryError instanceof OrchestrationFailure
        ? retryError
        : new OrchestrationFailure(
          { code: 'selection_invalid', message: `组件选择阶段失败：${retryError instanceof Error ? retryError.message : '未知错误'}` },
          [],
          null,
        );
      return {
        ok: false,
        errors: [failure.diagnostic],
        attempts: failure.diagnostic.code === 'aborted' ? 1 : 2,
      };
    }
  } else {
    throw error;
  }
  }

  const parsedSelection = selection.parsed as { selectedComponentIds?: unknown };
  const requestedIds = Array.isArray(parsedSelection?.selectedComponentIds)
    ? parsedSelection.selectedComponentIds.filter((id): id is string => typeof id === 'string')
    : [];
  const knownIds = new Set(components.map((component) => component.componentId));
  const selectedIds = [...new Set(requestedIds)].filter((id) => knownIds.has(id));
  const references = selectedIds
    .map((componentId) => ({ componentId, reference: loadReference(componentId) }))
    .filter((entry): entry is { componentId: string; reference: string } => entry.reference !== null);

  if (!references.length) {
    return {
      ok: false,
      errors: [{ code: 'no_components', message: '模型没有选中任何有效组件，无法生成动效草稿。' }],
      attempts: 1,
    };
  }

  // Stage 2 — full agent draft with only the selected references.
  const draftMessages = (): LlmChatMessage[] => [{
    role: 'user',
    content: fill(DRAFT_INSTRUCTION, {
      ...shared,
      REFERENCES: references
        .map(({ componentId, reference }) => `### ${componentId}\n\n${reference}`)
        .join('\n\n'),
    }),
  }];

  const compile = (candidate: unknown): { project: MotionProject; warnings: DraftDiagnostic[] } => {
    const parsed = AgentDraftSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new OrchestrationFailure(
        {
          code: 'draft_schema_invalid',
          message: `草稿结构校验失败：${parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('；')}`,
        },
        draftMessages(),
        JSON.stringify(candidate),
      );
    }
    const draft: AgentDraft = parsed.data;
    const imported = importAgentSequence(project, draft, {
      userStyleDefaults: readUserStyleDefaults(),
    });
    if (!imported.ok) {
      throw new OrchestrationFailure(
        imported.errors[0] ?? { code: 'draft_invalid', message: '草稿校验失败。' },
        draftMessages(),
        JSON.stringify(candidate),
      );
    }
    return imported;
  };

  try {
    const stage = await runStage(provider, draftMessages(), signal, (detail) => ({
      code: 'draft_invalid',
      message: `草稿生成阶段失败：${detail}`,
    }));
    const imported = compile(stage.parsed);
    return { ok: true, effects: imported.project.effects, warnings: imported.warnings, attempts: 1 };
  } catch (error) {
    if (!(error instanceof OrchestrationFailure)) throw error;
    if (error.diagnostic.code === 'aborted') {
      return { ok: false, errors: [error.diagnostic], attempts: 1 };
    }

    // Exactly one repair round; never a third completion.
    try {
      const stage = await runStage(
        provider,
        repairMessages({ text: error.raw ?? '', messages: error.messages }, [error.diagnostic.message]),
        signal,
        (detail) => ({ code: 'draft_invalid', message: `草稿生成阶段失败：${detail}` }),
      );
      const imported = compile(stage.parsed);
      return { ok: true, effects: imported.project.effects, warnings: imported.warnings, attempts: 2 };
    } catch (retryError) {
      if (!(retryError instanceof OrchestrationFailure)) throw retryError;
      return {
        ok: false,
        errors: [retryError.diagnostic],
        attempts: retryError.diagnostic.code === 'aborted' ? 1 : 2,
      };
    }
  }
}
