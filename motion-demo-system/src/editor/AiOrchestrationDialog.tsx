import React, { useRef, useState } from 'react';
import type { OrchestrationResult } from '../llm/orchestrate';
import { orchestrateEffects, type ComponentSummary } from '../llm/orchestrate';
import type { LlmProvider } from '../llm/provider';
import { createTauriProvider } from '../llm/tauriProvider';
import type { NativeBridge } from '../tauri/bridge';
import { effectRegistry } from '../effects/registry';
import type { MotionEffectInstance, MotionProject } from '../project/types';

export const AI_ORCHESTRATION_LIBRARY_VERSION = 1;

/**
 * Declared once by the host shell. Task 13 replaces this with the Tauri secure
 * provider; browser acceptance and demos inject a scripted provider here.
 */
declare global {
  interface Window {
    __captionforgeLlm?: { provider: LlmProvider; profileName: string };
    /** Base URL and model only — never an API Key, which lives in the OS credential store. */
    __captionforgeLlmConfig?: { baseUrl: string; model: string; profileName?: string };
  }
}

export const readLlmRuntime = (): { provider: LlmProvider; profileName: string } | null => (
  typeof window !== 'undefined' ? window.__captionforgeLlm ?? null : null
);

/**
 * Desktop shells run completions through Tauri so the Key never reaches the
 * renderer; without a bridge (or without an endpoint config) the browser keeps
 * using the injected provider.
 */
export const resolveLlmRuntime = (
  bridge: NativeBridge | null,
): { provider: LlmProvider; profileName: string } | null => {
  if (bridge) {
    const config = typeof window !== 'undefined' ? window.__captionforgeLlmConfig : undefined;
    if (config && config.baseUrl && config.model) {
      return {
        provider: createTauriProvider(bridge, { baseUrl: config.baseUrl, model: config.model }),
        profileName: config.profileName ?? '原生安全通道',
      };
    }
  }
  return readLlmRuntime();
};

export const buildComponentSummaries = (): ComponentSummary[] => (
  effectRegistry.list().map((definition) => ({
    componentId: definition.id,
    componentVersion: definition.version,
    name: definition.name,
    suitableFor: definition.selection.suitableFor,
    avoidFor: definition.selection.avoidFor,
  }))
);

type ReferenceModules = Record<string, string>;

const referenceModules: ReferenceModules = import.meta.glob(
  '../../skill/references/components/*.md',
  { query: '?raw', import: 'default', eager: true },
) as ReferenceModules;

export const loadComponentReference = (componentId: string): string | null => {
  const entry = Object.entries(referenceModules)
    .find(([path]) => path.endsWith(`/components/${componentId}.md`));
  return entry ? entry[1] : null;
};

export function applyOrchestrationResult(
  result: OrchestrationResult,
  replaceEffects: (effects: readonly MotionEffectInstance[]) => void,
): string {
  if (result.ok) {
    replaceEffects(result.effects);
    const warningText = result.warnings.length
      ? `\n警告：\n${result.warnings.map((warning) => warning.message).join('\n')}`
      : '';
    return `已生成 ${result.effects.length} 个动效并替换全部旧动效（第 ${result.attempts} 轮完成）。${warningText}`;
  }
  return `AI 编排失败（共 ${result.attempts} 轮）：\n${result.errors.map((error) => error.message).join('\n')}`;
}

interface AiOrchestrationDialogProps {
  open: boolean;
  onClose: () => void;
  provider: LlmProvider | null;
  modelLabel: string;
  project: MotionProject;
  selectedInstanceId: string | null;
  replaceEffects: (effects: readonly MotionEffectInstance[]) => void;
}

type RunPhase = 'idle' | 'running' | 'done' | 'error';

export const AiOrchestrationDialog: React.FC<AiOrchestrationDialogProps> = ({
  open,
  onClose,
  provider,
  modelLabel,
  project,
  selectedInstanceId,
  replaceEffects,
}) => {
  const cues = project.cues;
  const effects = project.effects;
  const [style, setStyle] = useState('');
  const [phase, setPhase] = useState<RunPhase>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  if (!open) return null;

  const selectedSummary = selectedInstanceId && effects.length
    ? `已选组件 ${effects.find((effect) => effect.instanceId === selectedInstanceId)?.componentId ?? '—'} 会作为偏好参考`
    : '未选中组件，将完全由 AI 决定';

  const cancel = () => {
    abortRef.current?.abort();
  };

  const close = () => {
    if (phase === 'running') cancel();
    onClose();
  };

  const run = async () => {
    if (!provider || phase === 'running') return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('running');
    setStatusMessage('正在编排：选择组件 → 生成草稿（失败会自动修复一次）…');
    try {
      const result = await orchestrateEffects(provider, {
        project,
        style,
        components: buildComponentSummaries(),
        loadReference: loadComponentReference,
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        setPhase('idle');
        setStatusMessage('AI 编排已取消，工程保持不变。');
        return;
      }
      const message = applyOrchestrationResult(result, replaceEffects);
      setPhase(result.ok ? 'done' : 'error');
      setStatusMessage(message);
    } catch (error) {
      setPhase('error');
      setStatusMessage(controller.signal.aborted
        ? 'AI 编排已取消，工程保持不变。'
        : `AI 编排异常终止：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  return (
    <div className="dialog-overlay" data-ai-orchestration-dialog>
      <div className="dialog-panel" role="dialog" aria-label="AI 编排">
        <header className="dialog-header">
          <strong>AI 编排</strong>
          <button type="button" className="dialog-close" aria-label="关闭 AI 编排" onClick={close}>×</button>
        </header>
        <div className="dialog-body">
          <p className="dialog-meta" data-ai-dialog-meta>
            字幕 {cues.length} 条 · 组件库版本 {AI_ORCHESTRATION_LIBRARY_VERSION} · 模型：{modelLabel}
          </p>
          <p className="dialog-meta">{selectedSummary}</p>
          {!provider && (
            <p className="dialog-warning" role="status">
              尚未配置模型供应商（Task 13 接入后可用）；当前仅支持测试注入的演示模型。
            </p>
          )}
          <label className="dialog-field">
            <span>风格偏好（可选）</span>
            <textarea
              aria-label="风格偏好"
              rows={3}
              value={style}
              placeholder="例如：科技感、克制、蓝色调，面向高层汇报"
              onChange={(event) => setStyle(event.target.value)}
            />
          </label>
          {statusMessage && (
            <pre className={`dialog-status ${phase}`} role="status" data-ai-dialog-status>{statusMessage}</pre>
          )}
        </div>
        <footer className="dialog-actions">
          {phase === 'running'
            ? <button type="button" aria-label="取消 AI 编排" onClick={cancel}>取消</button>
            : (
              <button
                type="button"
                aria-label="开始 AI 编排"
                disabled={!provider || cues.length === 0}
                onClick={() => void run()}
              >
                生成动效
              </button>
            )}
        </footer>
      </div>
    </div>
  );
};
