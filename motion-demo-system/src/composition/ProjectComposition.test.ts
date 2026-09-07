import React from 'react';
import { Sequence } from 'remotion';
import { describe, expect, it } from 'vitest';
import { effectRegistry } from '../effects/registry';
import { twoComponentSceneProject } from '../project/fixtures/two-component-scene';
import type { MotionEffectInstance, MotionProject } from '../project/types';
import { ConfigProvider, type ConfigState } from '../remotion/config';
import { EffectInstanceFrame } from './EffectInstanceFrame';
import { ProjectComposition } from './ProjectComposition';

type SequenceElement = React.ReactElement<{
  children: React.ReactElement<{
    effect: MotionEffectInstance;
    'data-effect-root'?: string;
    style?: React.CSSProperties;
    children?: React.ReactElement<{ effect: MotionEffectInstance }>;
  }>;
  durationInFrames: number;
  from: number;
  layout: string;
}>;

type ProviderElement = React.ReactElement<{
  children: React.ReactElement;
  value: ConfigState;
}>;

describe('ProjectComposition element tree', () => {
  it('renders the permanent fixture as sorted, overlapping layout-none sequences', () => {
    const project = {
      ...twoComponentSceneProject,
      effects: [...twoComponentSceneProject.effects].reverse(),
    };
    const tree = ProjectComposition({ project }) as React.ReactElement<{
      children: React.ReactNode;
      style: React.CSSProperties;
    }>;

    expect(tree.type).toBe('div');
    expect(tree.props.style).toMatchObject({
      position: 'relative',
      width: project.video.width,
      height: project.video.height,
      overflow: 'hidden',
      background: 'transparent',
    });
    const sequences = React.Children.toArray(tree.props.children) as SequenceElement[];
    expect(sequences).toHaveLength(2);
    expect(sequences.every(({ type }) => type === Sequence)).toBe(true);
    expect(sequences.map(({ props }) => ({
      componentId: props.children.props.children!.props.effect.componentId,
      durationInFrames: props.durationInFrames,
      from: props.from,
      layout: props.layout,
    }))).toEqual([
      { componentId: 't1-05', durationInFrames: 180, from: 0, layout: 'none' },
      { componentId: 't7-06', durationInFrames: 180, from: 0, layout: 'none' },
    ]);
    // Each sequence wraps its instance in a measurable full-canvas root.
    expect(sequences.every(({ props }) => (
      props.children.type === 'div'
      && props.children.props['data-effect-root'] === props.children.props.children!.props.effect.instanceId
      && props.children.props.children!.type === EffectInstanceFrame
    ))).toBe(true);
  });

  it('dims instances on hidden tracks without unmounting them', () => {
    const instance = (instanceId: string, track: number, zIndex: number): MotionEffectInstance => ({
      instanceId, componentId: 't1-05', componentVersion: 1, sourceCueIds: [],
      startFrame: 0, durationInFrames: 60, track, zIndex, props: {},
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    });
    const project: MotionProject = {
      kind: 'captionforge.project', schemaVersion: 1,
      video: { width: 1920, height: 1080, fps: 30, durationInFrames: 60 },
      cues: [],
      effects: [instance('lower', 0, 1), instance('upper', 1, 2)],
    };

    const tree = ProjectComposition({ project, dimTrackIds: ['effect-track-0'] }) as React.ReactElement<{
      children: React.ReactNode;
    }>;
    const sequences = React.Children.toArray(tree.props.children) as SequenceElement[];

    expect(sequences).toHaveLength(2);
    const dimmedStyle = sequences[0].props.children.props.style!;
    expect(dimmedStyle.opacity).toBeLessThan(0.5);
    expect(String(dimmedStyle.filter)).toContain('grayscale');
    expect(sequences[1].props.children.props.style!.opacity).toBeUndefined();
  });

  it('returns an independent formal ConfigProvider for each fixture instance', () => {
    const [titleEffect, gaugeEffect] = twoComponentSceneProject.effects;
    const titleProvider = EffectInstanceFrame({ effect: titleEffect }) as ProviderElement;
    const gaugeProvider = EffectInstanceFrame({ effect: gaugeEffect }) as ProviderElement;

    expect(titleProvider.type).toBe(ConfigProvider);
    expect(gaugeProvider.type).toBe(ConfigProvider);
    expect(titleProvider.props.value).not.toBe(gaugeProvider.props.value);
    expect(titleProvider.props.value).toMatchObject({
      titleText: '单一工程 · 多实例协同',
      posX: 130,
      scale: 90,
    });
    expect(gaugeProvider.props.value).toMatchObject({
      percent: 72,
      arcColor: '#4CC9F0',
      posX: 620,
      scale: 48,
    });
    expect(titleProvider.props.value).not.toHaveProperty('percent');
    expect(gaugeProvider.props.value).not.toHaveProperty('titleText');
    expect(titleProvider.props.children.type).toBe(effectRegistry.get('t1-05').component);
    expect(gaugeProvider.props.children.type).toBe(effectRegistry.get('t7-06').component);
  });
});
