import React from 'react';
import { Sequence } from 'remotion';
import type { MotionEffectInstance, MotionProject } from '../project/types';
import { EffectInstanceFrame } from './EffectInstanceFrame';

export interface ProjectCompositionProps {
  project: MotionProject;
  editorMode?: boolean;
}

export function sortEffectsForComposition(
  effects: readonly MotionEffectInstance[],
): MotionEffectInstance[] {
  return effects
    .map((effect, index) => ({ effect, index }))
    .sort((a, b) => (
      a.effect.zIndex - b.effect.zIndex
      || a.effect.track - b.effect.track
      || a.index - b.index
    ))
    .map(({ effect }) => effect);
}

export const ProjectComposition: React.FC<ProjectCompositionProps> = ({ project }) => {
  const effects = sortEffectsForComposition(project.effects);

  return (
    <div style={{
      position: 'relative',
      width: project.video.width,
      height: project.video.height,
      overflow: 'hidden',
      background: 'transparent',
    }}>
      {effects.map((effect) => (
        <Sequence
          key={effect.instanceId}
          from={effect.startFrame}
          durationInFrames={effect.durationInFrames}
          layout="none"
        >
          <div
            data-effect-root={effect.instanceId}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            <EffectInstanceFrame effect={effect} />
          </div>
        </Sequence>
      ))}
    </div>
  );
};
