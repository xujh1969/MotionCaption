import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MotionEffectInstance } from '../project/types';
import { selectionOverlayZIndex, SelectionBox } from './SelectionBox';

const effect: MotionEffectInstance = {
  instanceId: 'selected-title', componentId: 't1-01', componentVersion: 1, sourceCueIds: [],
  startFrame: 0, durationInFrames: 30, track: 0, zIndex: 2, props: {},
  transform: { x: 100, y: 120, scale: 1, rotation: 0 },
};

const props = {
  effect,
  footprint: { width: 700, height: 540 },
  projectSize: { width: 1920, height: 1080 },
  fittedRect: { left: 0, top: 0, width: 960, height: 540, scale: 0.5 },
  selected: true,
  stackRank: 0,
  stackCount: 1,
  onSelect: () => undefined,
  onTransform: () => undefined,
};

describe('SelectionBox', () => {
  it('renders no editor overlay when editorMode is false', () => {
    expect(renderToStaticMarkup(<SelectionBox {...props} editorMode={false} />)).toBe('');
  });

  it('renders an independent hit target and four proportional resize handles in editor mode', () => {
    const markup = renderToStaticMarkup(<SelectionBox {...props} editorMode />);

    expect(markup).toContain('data-selection-box="selected-title"');
    expect(markup.match(/data-resize-corner=/g)).toHaveLength(4);
    expect(markup).toContain('z-index:2');
  });

  it('keeps a selected lower effect above an unselected extremely high formal zIndex', () => {
    expect(selectionOverlayZIndex(false, 0, 2)).toBe(1);
    expect(selectionOverlayZIndex(false, 1, 2)).toBe(2);
    expect(selectionOverlayZIndex(true, 0, 2)).toBe(3);

    const extreme = { ...effect, instanceId: 'extreme', zIndex: Number.MAX_SAFE_INTEGER };
    const markup = renderToStaticMarkup(<>
      <SelectionBox {...props} effect={extreme} selected={false} stackRank={1} stackCount={2} editorMode />
      <SelectionBox {...props} selected stackRank={0} stackCount={2} editorMode />
    </>);

    expect(markup).toContain('data-selection-box="selected-title"');
    expect(markup.match(/data-resize-corner=/g)).toHaveLength(4);
    expect(markup).toContain('z-index:3');
    expect(markup).not.toContain('2000000');
  });
});
