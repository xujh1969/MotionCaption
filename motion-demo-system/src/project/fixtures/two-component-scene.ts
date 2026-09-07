import type { MotionProject } from '../types';

export const twoComponentSceneProject: MotionProject = {
  kind: 'captionforge.project',
  schemaVersion: 1,
  video: {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: 180,
  },
  cues: [{
    cueId: 'cue-two-component-scene',
    startMs: 0,
    endMs: 6000,
    text: '单一工程同时渲染标题与半环形仪表。',
  }],
  effects: [
    {
      instanceId: 'fixture-title',
      sceneId: 'scene-two-component',
      componentId: 't1-05',
      componentVersion: 1,
      sourceCueIds: ['cue-two-component-scene'],
      startFrame: 0,
      durationInFrames: 180,
      track: 0,
      zIndex: 1,
      props: {
        titleText: '单一工程 · 多实例协同',
        descText: '标题与数据组件共享时间轴，各自保持独立参数',
        titleColor: '#FFFFFF',
        lineColor: '#4CC9F0',
      },
      transform: { x: 130, y: 180, scale: 0.9, rotation: 0 },
    },
    {
      instanceId: 'fixture-gauge',
      sceneId: 'scene-two-component',
      componentId: 't7-06',
      componentVersion: 1,
      sourceCueIds: ['cue-two-component-scene'],
      startFrame: 0,
      durationInFrames: 180,
      track: 1,
      zIndex: 2,
      props: {
        percent: 72,
        labelText: '工程完成度',
        arcColor: '#4CC9F0',
        glowColor: '#88FFBB',
      },
      transform: { x: 620, y: 190, scale: 0.48, rotation: 0 },
    },
  ],
};
