import React from 'react';
import { effectRegistry } from '../effects/registry';
import type { MotionEffectInstance } from '../project/types';
import { ConfigProvider } from '../remotion/config';
import { toInstanceConfig } from './instanceConfig';

export const EffectInstanceFrame: React.FC<{ effect: MotionEffectInstance }> = ({ effect }) => {
  const Component = effectRegistry.get(effect.componentId).component;
  const config = toInstanceConfig(effect, { source: 'formal-project' });

  return (
    <ConfigProvider value={config}>
      <Component />
    </ConfigProvider>
  );
};
