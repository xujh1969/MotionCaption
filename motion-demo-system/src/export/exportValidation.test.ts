import { describe, expect, it, vi } from 'vitest';
import { ProjectComposition } from '../composition/ProjectComposition';
import type { MotionProject } from '../project/types';
import {
  evaluateWebmAlphaSupport,
  WEBM_ALPHA_RENDER_OPTIONS,
} from './exportValidation';
import { createWebRendererBackend } from './webRendererBackend';

const project: MotionProject = {
  kind: 'captionforge.project',
  schemaVersion: 1,
  video: {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: 90,
  },
  cues: [],
  effects: [],
};

describe('WebM alpha support validation', () => {
  it('probes the exact transparent VP9/WebM configuration', async () => {
    const probe = vi.fn().mockResolvedValue({ canRender: true, issues: [] });

    await expect(evaluateWebmAlphaSupport(probe, 1280, 720)).resolves.toEqual({
      supported: true,
      reasons: [],
    });
    expect(probe).toHaveBeenCalledWith({
      ...WEBM_ALPHA_RENDER_OPTIONS,
      width: 1280,
      height: 720,
    });
  });

  it('preserves explicit browser failure reasons', async () => {
    const probe = vi.fn().mockResolvedValue({
      canRender: false,
      issues: [
        {
          type: 'transparent-video-unsupported',
          severity: 'error',
          message: 'VP9 alpha encoding is unavailable.',
        },
      ],
    });

    await expect(evaluateWebmAlphaSupport(probe, 1920, 1080)).resolves.toEqual({
      supported: false,
      reasons: ['VP9 alpha encoding is unavailable.'],
    });
  });

  it('supplies an explicit reason when the browser probe omits details', async () => {
    const probe = vi.fn().mockResolvedValue({ canRender: false, issues: [] });

    await expect(evaluateWebmAlphaSupport(probe, 1920, 1080)).resolves.toEqual({
      supported: false,
      reasons: ['Browser cannot encode transparent VP9/WebM.'],
    });
  });
});

describe('web renderer backend', () => {
  it('fails explicitly and never renders when alpha support is unavailable', async () => {
    const canRenderMediaOnWeb = vi.fn().mockResolvedValue({
      canRender: false,
      issues: [
        {
          type: 'video-codec-unsupported',
          severity: 'error',
          message: 'VP9 encoding is unavailable.',
        },
      ],
    });
    const renderMediaOnWeb = vi.fn();
    const backend = createWebRendererBackend({ canRenderMediaOnWeb, renderMediaOnWeb });

    await expect(backend.render(
      project,
      { format: 'webm-alpha', width: 1920, height: 1080, fps: 30 },
      vi.fn(),
    )).rejects.toThrow('VP9 encoding is unavailable.');
    expect(renderMediaOnWeb).not.toHaveBeenCalled();
  });

  it('renders ProjectComposition with alpha settings and forwards progress', async () => {
    const output = new Blob(['webm'], { type: 'video/webm' });
    const canRenderMediaOnWeb = vi.fn().mockResolvedValue({ canRender: true, issues: [] });
    const renderMediaOnWeb = vi.fn().mockImplementation(async ({ onProgress }) => {
      onProgress?.({ progress: 0.375 });
      return { getBlob: async () => output };
    });
    const onProgress = vi.fn();
    const backend = createWebRendererBackend({ canRenderMediaOnWeb, renderMediaOnWeb });

    await expect(backend.render(
      project,
      { format: 'webm-alpha', width: 1280, height: 720, fps: 60 },
      onProgress,
    )).resolves.toBe(output);

    expect(canRenderMediaOnWeb).toHaveBeenCalledWith({
      ...WEBM_ALPHA_RENDER_OPTIONS,
      width: 1280,
      height: 720,
    });
    expect(renderMediaOnWeb).toHaveBeenCalledWith(expect.objectContaining({
      ...WEBM_ALPHA_RENDER_OPTIONS,
      composition: {
        id: 'ProjectComposition',
        component: ProjectComposition,
        width: 1280,
        height: 720,
        fps: 60,
        durationInFrames: 90,
        defaultProps: { project },
      },
      inputProps: { project },
    }));
    expect(onProgress).toHaveBeenCalledWith(0.375);
  });
});
