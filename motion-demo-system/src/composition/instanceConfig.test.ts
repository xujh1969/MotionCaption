import { describe, expect, it } from 'vitest';
import type { MotionEffectInstance } from '../project/types';
import { toInstanceConfig } from './instanceConfig';

const effect = (props: Record<string, unknown>): MotionEffectInstance => ({
  instanceId: 'title-1',
  sceneId: 'scene-1',
  componentId: 't1-05',
  componentVersion: 1,
  sourceCueIds: ['cue-1'],
  startFrame: 0,
  durationInFrames: 90,
  track: 0,
  zIndex: 1,
  props,
  transform: { x: 320, y: 180, scale: 1, rotation: 15 },
});

describe('toInstanceConfig', () => {
  it('merges curated defaults, agent-editable content, and the legacy transform fields', () => {
    const config = toInstanceConfig(effect({ titleText: '工程标题' }));

    expect(config).toMatchObject({
      titleText: '工程标题',
      descText: '多场景适配 · 高兼容 · 低损耗运行机制',
      titleColor: '#FFFFFF',
      posX: 320,
      posY: 180,
      scale: 100,
    });
    expect(config).not.toHaveProperty('rotation');
  });

  it('keeps style, layout, and unknown props locked on the default agent path', () => {
    const config = toInstanceConfig(effect({
      titleText: 'Agent 标题',
      titleColor: '#ff0000',
      titleSize: 96,
      posX: 999,
      unknownProp: 'blocked',
    }));

    expect(config.titleText).toBe('Agent 标题');
    expect(config.titleColor).toBe('#FFFFFF');
    expect(config.titleSize).toBe(58);
    expect(config.posX).toBe(320);
    expect(config).not.toHaveProperty('unknownProp');
  });

  it('applies declared style props on the formal-project path but still rejects unknown props', () => {
    const config = toInstanceConfig(
      effect({
        titleText: '已确认标题',
        titleColor: '#ff6699',
        titleSize: 72,
        unknownProp: 'blocked',
      }),
      { source: 'formal-project' },
    );

    expect(config).toMatchObject({
      titleText: '已确认标题',
      titleColor: '#ff6699',
      titleSize: 72,
    });
    expect(config).not.toHaveProperty('unknownProp');
  });
});
