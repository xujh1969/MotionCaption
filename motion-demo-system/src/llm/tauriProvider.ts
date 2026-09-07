import type { NativeBridge, NativeCompletionRequest } from '../tauri/bridge';
import { LlmAbortedError, throwIfAborted, type LlmCompletionRequest, type LlmProvider } from './provider';

export interface TauriProviderConfig {
  baseUrl: string;
  model: string;
  maxOutputChars?: number;
  timeoutMs?: number;
}

/**
 * Routes completions through the native command so the API Key never reaches
 * the webview. The provider only forwards the request envelope and returns the
 * raw model text.
 */
export function createTauriProvider(bridge: NativeBridge, config: TauriProviderConfig): LlmProvider {
  return {
    async complete(request: LlmCompletionRequest): Promise<string> {
      throwIfAborted(request.signal);
      const payload: NativeCompletionRequest = {
        baseUrl: config.baseUrl,
        model: config.model,
        system: request.system,
        messages: request.messages,
        ...(config.maxOutputChars === undefined ? {} : { maxOutputChars: config.maxOutputChars }),
        ...(config.timeoutMs === undefined ? {} : { timeoutMs: config.timeoutMs }),
      };
      const pending = bridge.completeOpenAiCompatible(payload);
      if (!request.signal) return pending;
      return new Promise<string>((resolve, reject) => {
        const onAbort = () => reject(new LlmAbortedError());
        request.signal?.addEventListener('abort', onAbort, { once: true });
        pending.then(resolve, reject).finally(() => {
          request.signal?.removeEventListener('abort', onAbort);
        });
      });
    },
  };
}
