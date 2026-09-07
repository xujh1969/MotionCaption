import { compileAgentDraft } from '../project/compileDraft';
import type { AgentDraft, MotionProject } from '../project/types';
import type { TrackAllocationOptions } from '../project/trackAllocation';
import { validateAgentDraft, type DraftDiagnostic } from '../project/validateDraft';

export type AgentImportResult =
  | { ok: true; project: MotionProject; warnings: DraftDiagnostic[] }
  | { ok: false; errors: DraftDiagnostic[]; warnings: DraftDiagnostic[] };

export function importAgentSequence(
  project: MotionProject,
  draft: AgentDraft,
  options: TrackAllocationOptions = {},
): AgentImportResult {
  const validation = validateAgentDraft(draft, {
    kind: 'captionforge.agent-input',
    schemaVersion: 1,
    componentLibraryVersion: 1,
    video: {
      width: project.video.width,
      height: project.video.height,
      fps: project.video.fps,
      durationMs: project.video.durationInFrames / project.video.fps * 1000,
    },
    cues: project.cues,
  }, undefined, project.effects, options);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors, warnings: validation.warnings };
  }

  try {
    const effects = compileAgentDraft(project, draft, { searchStepLimit: options.searchStepLimit });
    return {
      ok: true,
      project: { ...project, effects },
      warnings: validation.warnings,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown error';
    return {
      ok: false,
      errors: [{ code: 'compile_failed', message: `Agent sequence compilation failed: ${detail}` }],
      warnings: validation.warnings,
    };
  }
}
