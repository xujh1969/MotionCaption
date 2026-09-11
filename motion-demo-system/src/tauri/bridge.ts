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
  /** Transparent export: PNG frame pipeline + native ffmpeg (ProRes 4444 MOV). */
  beginTransparentExport(): Promise<string>;
  writeTransparentFrame(dir: string, index: number, dataBase64: string): Promise<void>;
  /**
   * Runs the native ffmpeg muxer off the main thread. `totalSeconds` feeds the
   * native progress parser; percent updates arrive via
   * `subscribeTransparentEncodeProgress`.
   */
  finishTransparentExport(dir: string, fps: string, destination: string, totalSeconds: number): Promise<void>;
  /** Kills the ffmpeg process started for this frame directory (no-op if idle). */
  abortTransparentEncode(dir: string): Promise<void>;
  cancelTransparentExport(dir: string): Promise<void>;
  /**
   * Native "Save As" dialog + write; the WebView2 shell does not implement
   * anchor downloads, so JSON exports must go through this on the desktop.
   * Resolves the written path, or null when the user cancels.
   */
  saveTextFile(defaultName: string, contents: string): Promise<string | null>;
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
    beginTransparentExport: () => invoke<string>('begin_transparent_export'),
    writeTransparentFrame: (dir, index, dataBase64) => invoke('write_transparent_frame', { dir, index, dataB64: dataBase64 }),
    finishTransparentExport: (dir, fps, destination, totalSeconds) =>
      invoke('finish_transparent_export', { dir, fps, destination, totalSeconds }),
    abortTransparentEncode: (dir) => invoke('abort_transparent_encode', { dir }),
    cancelTransparentExport: (dir) => invoke('cancel_transparent_export', { dir }),
    saveTextFile: (defaultName, contents) => invoke<string | null>('save_text_file', { defaultName, contents }),
  };
}

export interface TransparentEncodeProgress {
  percent: number;
  seconds: number;
  /** Frame directory of the running encode — pass to `abortTransparentEncode`. */
  dir: string;
}

/**
 * Subscribes to native ffmpeg encode progress (percent 0-100). Returns an
 * unsubscribe function; resolves to a no-op in a plain browser.
 */
export async function subscribeTransparentEncodeProgress(
  handler: (progress: TransparentEncodeProgress) => void,
): Promise<() => void> {
  if (!isTauriRuntime()) return () => undefined;
  try {
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = await listen<TransparentEncodeProgress>('transparent-encode-progress', (event) => {
      handler(event.payload);
    });
    return unlisten;
  } catch {
    return () => undefined;
  }
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
