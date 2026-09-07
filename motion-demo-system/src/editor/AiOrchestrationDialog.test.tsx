import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MotionEffectInstance, MotionProject } from '../project/types';
import type { OrchestrationResult } from '../llm/orchestrate';
import { AiOrchestrationDialog, applyOrchestrationResult, resolveLlmRuntime } from './AiOrchestrationDialog';
import type { NativeBridge } from '../tauri/bridge';

const project = (cueCount = 0): MotionProject => ({
  kind: 'captionforge.project', schemaVersion: 1,
  video: { width: 1920, height: 1080, fps: 30, durationInFrames: 300 },
  cues: Array.from({ length: cueCount }, (_, index) => ({
    cueId: `cue-${index}`, startMs: index * 1000, endMs: index * 1000 + 1000, text: `第${index}条`,
  })),
  effects: [],
});

const renderDialog = (overrides: Partial<Parameters<typeof AiOrchestrationDialog>[0]> = {}) => {
  const props = {
    open: true,
    onClose: () => undefined,
    provider: null,
    modelLabel: '未配置',
    project: project(2),
    selectedInstanceId: null,
    replaceEffects: () => undefined,
    ...overrides,
  };
  return renderToStaticMarkup(React.createElement(AiOrchestrationDialog, props));
};

describe('AiOrchestrationDialog', () => {
  it('renders subtitle count, library version, style input, and missing-provider notice', () => {
    const markup = renderDialog();

    expect(markup).toContain('data-ai-orchestration-dialog');
    expect(markup).toContain('字幕 2 条');
    expect(markup).toContain('组件库版本 1');
    expect(markup).toContain('aria-label="风格偏好"');
    expect(markup).toContain('尚未配置模型');
    expect(markup).toContain('disabled');
  });

  it('enables the run button and shows the model label when a provider exists', () => {
    const markup = renderDialog({ provider: { complete: async () => '{}' }, modelLabel: '演示模型' });

    expect(markup).toContain('演示模型');
    expect(markup).not.toContain('尚未配置模型');
    expect(markup).toContain('aria-label="开始 AI 编排"');
  });

  it('keeps the dialog out of the markup when closed', () => {
    expect(renderDialog({ open: false })).toBe('');
  });
});

describe('applyOrchestrationResult', () => {
  const effects = [{ instanceId: 'new' }] as unknown as MotionEffectInstance[];

  it('replaces effects exactly once and reports the attempt count on success', () => {
    const replaceEffects = vi.fn();
    const result: OrchestrationResult = { ok: true, effects, warnings: [], attempts: 1 };

    const message = applyOrchestrationResult(result, replaceEffects);

    expect(replaceEffects).toHaveBeenCalledTimes(1);
    expect(replaceEffects).toHaveBeenCalledWith(effects);
    expect(message).toContain('1');
  });

  it('surfaces warnings alongside the success message', () => {
    const replaceEffects = vi.fn();
    const result: OrchestrationResult = {
      ok: true,
      effects,
      warnings: [{ code: 'z_index_conflict', message: 'zIndex 冲突已自动调整。' }],
      attempts: 2,
    };

    const message = applyOrchestrationResult(result, replaceEffects);

    expect(replaceEffects).toHaveBeenCalledTimes(1);
    expect(message).toContain('zIndex 冲突已自动调整。');
  });

  it('never touches effects on failure and lists the errors', () => {
    const replaceEffects = vi.fn();
    const result: OrchestrationResult = {
      ok: false,
      errors: [{ code: 'draft_invalid', message: '草稿校验失败。' }],
      attempts: 2,
    };

    const message = applyOrchestrationResult(result, replaceEffects);

    expect(replaceEffects).not.toHaveBeenCalled();
    expect(message).toContain('草稿校验失败。');
  });
});
describe('resolveLlmRuntime', () => {
  const bridge = {
    saveApiKey: async () => {},
    hasApiKey: async () => true,
    completeOpenAiCompatible: async () => '{}',
    scanComponentSkill: async () => ({ libraryVersion: 1, components: [], aiProposals: [] }),
    applyComponentSkill: async () => {},
    exportComponentSkill: async () => 0,
  } as unknown as NativeBridge;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefers the native provider when an endpoint is configured', () => {
    vi.stubGlobal('window', {
      __captionforgeLlmConfig: { baseUrl: 'https://api.example.com/v1', model: 'gpt-x' },
    });

    const runtime = resolveLlmRuntime(bridge);

    expect(runtime?.profileName).toBe('原生安全通道');
    expect(Object.keys(runtime?.provider ?? {})).toEqual(['complete']);
  });

  it('falls back to the injected browser provider', () => {
    vi.stubGlobal('window', {
      __captionforgeLlm: { provider: { complete: vi.fn() }, profileName: '脚本模型' },
    });

    expect(resolveLlmRuntime(null)?.profileName).toBe('脚本模型');
    // A desktop shell without endpoint config falls back too.
    expect(resolveLlmRuntime(bridge)?.profileName).toBe('脚本模型');
  });

  it('has no runtime without a window', () => {
    expect(resolveLlmRuntime(bridge)).toBeNull();
  });
});
