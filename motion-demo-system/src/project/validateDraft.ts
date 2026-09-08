import { effectRegistry, type EffectRegistry } from '../effects/registry';
import type { EffectDefinition } from '../effects/types';
import { createComponentMetaSource } from './componentMeta';
import type { AgentInput, MotionEffectInstance } from './types';
import {
  validateAgentDraftCore,
  type DraftDiagnostic,
  type AgentDraftValidationResult,
} from './validateDraftCore';
import type { TrackAllocationOptions } from './trackAllocation';

export type { DraftDiagnostic, AgentDraftValidationResult };

const engineMetaSource = createComponentMetaSource(effectRegistry.list());

const definitionsOf = (registry: EffectRegistry): readonly EffectDefinition[] => (
  registry === effectRegistry ? effectRegistry.list() : registry.list()
);

/**
 * In-app entry point. Keeps the historical signature (EffectRegistry-based)
 * while delegating all rules to the framework-neutral core. Consumers that
 * pass a custom registry (tests, compile pipeline) are adapted on the fly.
 */
export function validateAgentDraft(
  draftValue: unknown,
  input: AgentInput,
  registry: EffectRegistry = effectRegistry,
  existingEffects: readonly Pick<MotionEffectInstance, 'track' | 'startFrame' | 'durationInFrames'>[] = [],
  allocationOptions: TrackAllocationOptions = {},
): AgentDraftValidationResult {
  const metaSource = registry === effectRegistry
    ? engineMetaSource
    : createComponentMetaSource(definitionsOf(registry));
  return validateAgentDraftCore(
    draftValue,
    input,
    metaSource,
    existingEffects,
    allocationOptions,
  );
}
