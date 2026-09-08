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
  // Self-contained drafts embed their own subtitle track; legacy drafts rely on
  // the project's already-imported cues. When embedded cues exist they are the
  // authoritative source, so no separate SRT import is required beforehand.
  const embeddedCues = Array.isArray(draft.cues) ? draft.cues : [];
  const cues = (embeddedCues.length > 0 ? embeddedCues : project.cues).map((cue) => ({ ...cue }));

  // Without a loaded video the project starts at a short default length. Grow it
  // to the latest frame any scene's last cue ends on, so every scene compiles.
  const { width, height, fps } = project.video;
  let requiredFrames = Math.max(1, Math.round(project.video.durationInFrames));
  for (const scene of draft.scenes) {
    const lastId = scene.sourceCueIds[scene.sourceCueIds.length - 1];
    const lastCue = cues.find((cue) => cue.cueId === lastId);
    if (!lastCue) continue; // reported as an unknown source cue below
    requiredFrames = Math.max(requiredFrames, Math.max(0, Math.ceil(lastCue.endMs * fps / 1000)));
  }
  const video = { ...project.video, durationInFrames: requiredFrames };
  const workingProject: MotionProject = { ...project, video, cues };

  // 展示文案按 JSON 原样落库（不在此改写汉字数字）：汉字→阿拉伯的规范化属于
  // 生成端职责——编排/外部 skill 让模型输出即用阿拉伯数字。导入只做校验与编译。
  const validation = validateAgentDraft(draft, {
    kind: 'captionforge.agent-input',
    schemaVersion: 1,
    componentLibraryVersion: 1,
    video: {
      width,
      height,
      fps,
      durationMs: video.durationInFrames / video.fps * 1000,
    },
    cues,
  }, undefined, project.effects, options);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors, warnings: validation.warnings };
  }

  try {
    const effects = compileAgentDraft(workingProject, draft, { searchStepLimit: options.searchStepLimit });
    return {
      ok: true,
      project: { ...workingProject, effects },
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
