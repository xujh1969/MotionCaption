import type { LlmChatMessage } from '../llm/provider';
import { effectRegistry } from '../effects/registry';
import {
  describeSkillComponent,
  diffComponentSkill,
  type ApprovedSkillProposal,
  type ComponentManifest,
  type ComponentSkillDiff,
} from '../skill/sync';

export interface NativeCompletionRequest {
  baseUrl: string;
  model: string;
  system: string;
  messages: LlmChatMessage[];
  /** Native side enforces the hard cap; this is only a hint echoed back. */
  maxOutputChars?: number;
  timeoutMs?: number;
}

/**
 * Native-only surface. The browser build never sees an API Key: `hasApiKey`
 * returns a boolean and every completion is issued by the Rust side.
 */
export interface NativeBridge {
  saveApiKey(key: string): Promise<void>;
  hasApiKey(): Promise<boolean>;
  completeOpenAiCompatible(request: NativeCompletionRequest): Promise<string>;
  scanComponentSkill(): Promise<ComponentSkillDiff>;
  applyComponentSkill(proposal: ApprovedSkillProposal): Promise<void>;
  /** Returns the number of files written. */
  exportComponentSkill(destination: string): Promise<number>;
}

export class NativeUnavailableError extends Error {
  constructor(command: string) {
    super(`原生命令 ${command} 仅在桌面端可用。`);
    this.name = 'NativeUnavailableError';
  }
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

async function loadInvoke(): Promise<Invoke | null> {
  if (!isTauriRuntime()) return null;
  try {
    const module = await import('@tauri-apps/api/core');
    return module.invoke as Invoke;
  } catch {
    return null;
  }
}

/**
 * Native scan only reads the generated manifest from disk; the diff itself is
 * computed here so the Rust side never duplicates registry knowledge.
 */
export function createTauriBridge(invoke: Invoke): NativeBridge {
  return {
    saveApiKey: (key) => invoke('save_api_key', { key }),
    hasApiKey: () => invoke<boolean>('has_api_key'),
    completeOpenAiCompatible: (request) => invoke<string>('complete_openai_compatible', { request }),
    scanComponentSkill: async () => {
      const manifest = await invoke<ComponentManifest | null>('scan_component_skill');
      return diffComponentSkill(effectRegistry.list().map(describeSkillComponent), manifest ?? null);
    },
    applyComponentSkill: (proposal) => invoke('apply_component_skill', { proposal }),
    exportComponentSkill: (destination) => invoke('export_component_skill', { destination }),
  };
}

/** Opens a native directory picker; returns null in a plain browser. */
export async function pickDirectory(title: string): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  try {
    const dialog = await import('@tauri-apps/plugin-dialog');
    const picked = await dialog.open({ directory: true, multiple: false, title });
    return typeof picked === 'string' ? picked : null;
  } catch {
    return null;
  }
}

/** Returns the native bridge in the desktop shell and null in a plain browser. */
export async function resolveNativeBridge(): Promise<NativeBridge | null> {
  const invoke = await loadInvoke();
  return invoke ? createTauriBridge(invoke) : null;
}
