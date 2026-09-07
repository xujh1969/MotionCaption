import {
  canRenderMediaOnWeb,
  renderMediaOnWeb,
} from '@remotion/web-renderer';
import type { ComponentType } from 'react';
import {
  ProjectComposition,
  type ProjectCompositionProps,
} from '../composition/ProjectComposition';
import type { RenderBackend } from './RenderBackend';
import {
  evaluateWebmAlphaSupport,
  WEBM_ALPHA_RENDER_OPTIONS,
  type WebRendererSupportProbe,
} from './exportValidation';

interface WebRendererDependencies {
  canRenderMediaOnWeb: WebRendererSupportProbe;
  renderMediaOnWeb: typeof renderMediaOnWeb;
}

export function createWebRendererBackend(
  dependencies: WebRendererDependencies,
): RenderBackend {
  return {
    checkSupport: () => evaluateWebmAlphaSupport(
      dependencies.canRenderMediaOnWeb,
      1920,
      1080,
    ),

    async render(project, options, onProgress) {
      const support = await evaluateWebmAlphaSupport(
        dependencies.canRenderMediaOnWeb,
        options.width,
        options.height,
      );
      if (!support.supported) {
        throw new Error(`Transparent WebM export is not supported: ${support.reasons.join(' ')}`);
      }

      const result = await dependencies.renderMediaOnWeb({
        ...WEBM_ALPHA_RENDER_OPTIONS,
        composition: {
          id: 'ProjectComposition',
          component: ProjectComposition as ComponentType<
            ProjectCompositionProps & Record<string, unknown>
          >,
          width: options.width,
          height: options.height,
          fps: options.fps,
          durationInFrames: project.video.durationInFrames,
          defaultProps: { project },
        },
        inputProps: { project },
        onProgress: ({ progress }) => onProgress(progress),
      });

      return result.getBlob();
    },
  };
}

export const webRendererBackend = createWebRendererBackend({
  canRenderMediaOnWeb,
  renderMediaOnWeb,
});
