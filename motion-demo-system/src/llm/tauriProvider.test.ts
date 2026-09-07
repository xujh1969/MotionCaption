import { describe, expect, it, vi } from 'vitest';
import { LlmAbortedError } from './provider';
import { createTauriProvider } from './tauriProvider';
import { createTauriBridge, isTauriRuntime, type NativeBridge } from '../tauri/bridge';

const bridgeOf = (overrides: Partial<NativeBridge> = {}): NativeBridge => ({
  saveApiKey: vi.fn(async () => {}),
  hasApiKey: vi.fn(async () => true),
  completeOpenAiCompatible: vi.fn(async () => '{}'),
  scanComponentSkill: vi.fn(async () => ({ libraryVersion: 1, components: [], aiProposals: [] })),
  applyComponentSkill: vi.fn(async () => {}),
  exportComponentSkill: vi.fn(async () => 3),
  ...overrides,
});

describe('createTauriProvider', () => {
  it('forwards only the request envelope and returns the native text', async () => {
    const bridge = bridgeOf();
    const provider = createTauriProvider(bridge, { baseUrl: 'https://api.example.com/v1', model: 'gpt-x' });

    const reply = await provider.complete({
      system: 'sys',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(reply).toBe('{}');
    expect(bridge.completeOpenAiCompatible).toHaveBeenCalledWith({
      baseUrl: 'https://api.example.com/v1',
      model: 'gpt-x',
      system: 'sys',
      messages: [{ role: 'user', content: 'hello' }],
    });
  });

  it('rejects with LlmAbortedError when the caller aborts', async () => {
    const bridge = bridgeOf({
      completeOpenAiCompatible: () => new Promise(() => {}),
    });
    const provider = createTauriProvider(bridge, { baseUrl: 'https://api.example.com/v1', model: 'gpt-x' });
    const controller = new AbortController();

    const pending = provider.complete({ system: 'sys', messages: [], signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toBeInstanceOf(LlmAbortedError);
  });

  it('never exposes a key to the provider surface', () => {
    const bridge = bridgeOf();
    const provider = createTauriProvider(bridge, { baseUrl: 'https://api.example.com/v1', model: 'gpt-x' });

    expect(Object.keys(provider)).toEqual(['complete']);
  });
});

describe('tauri bridge', () => {
  it('invokes commands with snake_case payloads', async () => {
    const invoke = vi.fn(async () => true);
    const bridge = createTauriBridge(invoke as never);

    await bridge.saveApiKey('secret');
    await bridge.hasApiKey();

    expect(invoke).toHaveBeenNthCalledWith(1, 'save_api_key', { key: 'secret' });
    expect(invoke).toHaveBeenNthCalledWith(2, 'has_api_key');
  });

  it('reports a non-desktop runtime', () => {
    expect(isTauriRuntime()).toBe(false);
  });

  it('turns the native manifest into a registry diff without leaking the payload', async () => {
    const invoke = vi.fn(async () => ({
      libraryVersion: 7,
      components: [],
    }));
    const bridge = createTauriBridge(invoke as never);

    const diff = await bridge.scanComponentSkill();

    expect(invoke).toHaveBeenCalledWith('scan_component_skill');
    expect(diff.libraryVersion).toBe(7);
    // Every registered component shows up as `added` against an empty manifest.
    expect(diff.components.length).toBeGreaterThan(0);
    expect(diff.components.every((change) => change.status !== 'unchanged')).toBe(true);
  });
});
