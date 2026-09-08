import React from 'react';
import { effectRegistry } from '../effects/registry';
import type { MotionEffectInstance } from '../project/types';
import { ConfigProvider, EffectClipCtx } from '../remotion/config';
import { toInstanceConfig } from './instanceConfig';

export const EffectInstanceFrame: React.FC<{ effect: MotionEffectInstance }> = ({ effect }) => {
  const Component = effectRegistry.get(effect.componentId).component;
  const config = toInstanceConfig(effect, { source: 'formal-project' });

  return (
    <ConfigProvider value={config}>
      <EffectClipCtx.Provider value={effect.durationInFrames}>
        <Component />
      </EffectClipCtx.Provider>
    </ConfigProvider>
  );
};
