export interface LlmChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionRequest {
  system: string;
  messages: LlmChatMessage[];
  signal?: AbortSignal;
}

export interface LlmProvider {
  complete(request: LlmCompletionRequest): Promise<string>;
}

export class LlmAbortedError extends Error {
  constructor() {
    super('LLM request aborted.');
    this.name = 'LlmAbortedError';
  }
}

export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new LlmAbortedError();
}

/**
 * Scripted provider for tests and browser acceptance: returns canned replies in
 * order and records every request it received. An extra `onRequest` hook lets
 * callers assert on or mutate the request before the reply resolves.
 */
export function createScriptedProvider(
  replies: Array<string | Error>,
  onRequest?: (request: LlmCompletionRequest, index: number) => void,
): LlmProvider {
  let index = 0;
  return {
    async complete(request) {
      throwIfAborted(request.signal);
      const position = index++;
      onRequest?.(request, position);
      const reply = replies[position] ?? '';
      if (reply instanceof Error) throw reply;
      return reply;
    },
  };
}
