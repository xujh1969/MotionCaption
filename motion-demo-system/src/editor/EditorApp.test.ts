import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AgentDraft } from '../project/types';
import { twoComponentSceneProject } from '../project/fixtures/two-component-scene';
import { createEditorStore } from '../store/editorStore';
import {
  connectPlayerEnded,
  frameFromMediaTime,
  frameFromPlayerFrame,
  importAgentSequenceFile,
  importSubtitleFile,
  playPlayerFromFrame,
  readProjectFile,
  seekPlaybackFrame,
  shouldDeleteSelectedOnKey,
  shouldDeselectOnKey,
  shouldStartCollapsed,
  StagePlaybackControls,
  clampTimelineHeight,
  timelineHeightFromPointer,
  type DeletionKeyEvent,
} from './EditorApp';

const playerEmitter = () => {
  const ended = new Set<() => void>();
  return {
    player: {
      addEventListener: vi.fn((name: string, listener: () => void) => {
        if (name === 'ended') ended.add(listener);
      }),
      removeEventListener: vi.fn((name: string, listener: () => void) => {
        if (name === 'ended') ended.delete(listener);
      }),
      play: vi.fn(),
      seekTo: vi.fn(),
    },
    end: () => ended.forEach((listener) => listener()),
  };
};

describe('shouldDeselectOnKey', () => {
  it('deselects on Escape only when no modal dialog is open', () => {
    expect(shouldDeselectOnKey('Escape', false)).toBe(true);
    expect(shouldDeselectOnKey('Escape', true)).toBe(false);
    expect(shouldDeselectOnKey('Enter', false)).toBe(false);
  });
});

describe('shouldDeleteSelectedOnKey', () => {
  const event = (
    key: string,
    extra: Partial<Pick<DeletionKeyEvent, 'target' | 'isComposing'>> = {},
  ): DeletionKeyEvent => ({
    key,
    target: { tagName: 'BODY' },
    isComposing: false,
    ...extra,
  });

  it('deletes on Delete/Backspace with focus outside a text control', () => {
    expect(shouldDeleteSelectedOnKey(event('Delete'), false)).toBe(true);
    expect(shouldDeleteSelectedOnKey(event('Backspace'), false)).toBe(true);
  });

  it('never deletes while a modal dialog is open or an IME composition is in flight', () => {
    expect(shouldDeleteSelectedOnKey(event('Delete'), true)).toBe(false);
    expect(shouldDeleteSelectedOnKey(event('Delete', { isComposing: true }), false)).toBe(false);
  });

  it('ignores keys that are not Delete/Backspace', () => {
    expect(shouldDeleteSelectedOnKey(event('Escape'), false)).toBe(false);
    expect(shouldDeleteSelectedOnKey(event('Enter'), false)).toBe(false);
    expect(shouldDeleteSelectedOnKey(event('x'), false)).toBe(false);
  });

  it('keeps Delete/Backspace for text editing inside inputs, textareas, and contenteditable', () => {
    expect(shouldDeleteSelectedOnKey(event('Delete', { target: { tagName: 'INPUT' } }), false)).toBe(false);
    expect(shouldDeleteSelectedOnKey(event('Backspace', { target: { tagName: 'TEXTAREA' } }), false)).toBe(false);
    expect(
      shouldDeleteSelectedOnKey(event('Delete', { target: { tagName: 'DIV', isContentEditable: true } }), false),
    ).toBe(false);
    expect(shouldDeleteSelectedOnKey(event('Delete', { target: null }), false)).toBe(true);
  });
});

describe('frameFromMediaTime', () => {
  it('keeps the playback frame inside the project frame range at media end', () => {
    expect(frameFromMediaTime(10, 30, 300)).toBe(299);
  });

  it('rounds an in-range media time and clamps negative values', () => {
    expect(frameFromMediaTime(1.02, 30, 300)).toBe(31);
    expect(frameFromMediaTime(-1, 30, 300)).toBe(0);
  });

  it('keeps a Player frame index unchanged instead of re-scaling it as media seconds', () => {
    // Regression: getCurrentFrame() is already a frame number. Treating frame 1
    // as "1 second" and multiplying by fps made playback jump to the timeline end.
    expect(frameFromPlayerFrame(1, 623)).toBe(1);
    expect(frameFromPlayerFrame(30, 623)).toBe(30);
    expect(frameFromPlayerFrame(622, 623)).toBe(622);
    expect(frameFromPlayerFrame(9999, 623)).toBe(622);
    expect(frameFromPlayerFrame(-4, 623)).toBe(0);
  });

  it('clamps a scrubber seek, pauses playback, and synchronizes the reference media', () => {
    const setPlaying = vi.fn();
    const setCurrentFrame = vi.fn();
    const media = { currentTime: 0 };

    const frame = seekPlaybackFrame(999, 30, 300, setPlaying, setCurrentFrame, media);

    expect(frame).toBe(299);
    expect(setPlaying).toHaveBeenCalledOnce();
    expect(setPlaying).toHaveBeenCalledWith(false);
    expect(setCurrentFrame).toHaveBeenCalledWith(299);
    expect(media.currentTime).toBeCloseTo(299 / 30);
  });

  it('renders always-visible stage overlay controls with an icon toggle, time, and frame', () => {
    const markup = renderToStaticMarkup(React.createElement(StagePlaybackControls, {
      isPlaying: false,
      currentFrame: 42,
      durationInFrames: 300,
      fps: 30,
      canvasWidth: 1920,
      canvasHeight: 1080,
      isProjectEmpty: true,
      referenceVideoName: null,
      onToggle: () => undefined,
    }));

    expect(markup).toContain('data-stage-playback-overlay');
    expect(markup).toContain('空工程 · 无参考视频 | 1920×1080 · 30fps');
    expect(markup).toContain('00:01 / 00:10');
    expect(markup).toContain('42 / 299 帧');
    expect(markup).toContain('data-playback-icon="play"');
    expect(markup).toContain('aria-label="播放"');
  });

  it('orders status, centered toggle, and right-aligned time group for the stage toolbar', () => {
    const markup = renderToStaticMarkup(React.createElement(StagePlaybackControls, {
      isPlaying: false,
      currentFrame: 42,
      durationInFrames: 300,
      fps: 30,
      canvasWidth: 1920,
      canvasHeight: 1080,
      isProjectEmpty: true,
      referenceVideoName: null,
      onToggle: () => undefined,
    }));

    const statusIndex = markup.indexOf('stage-project-status');
    const toggleIndex = markup.indexOf('stage-playback-toggle');
    const rightIndex = markup.indexOf('stage-playback-right');
    expect(rightIndex).toBeGreaterThan(-1);
    expect(statusIndex).toBeLessThan(toggleIndex);
    expect(toggleIndex).toBeLessThan(rightIndex);
  });

  it('swaps the play icon for a pause icon and never renders a scrubber', () => {
    const playing = renderToStaticMarkup(React.createElement(StagePlaybackControls, {
      isPlaying: true,
      currentFrame: 42,
      durationInFrames: 300,
      fps: 30,
      canvasWidth: 1920,
      canvasHeight: 1080,
      isProjectEmpty: false,
      referenceVideoName: 'demo.mp4',
      onToggle: () => undefined,
    }));
    const paused = renderToStaticMarkup(React.createElement(StagePlaybackControls, {
      isPlaying: false,
      currentFrame: 42,
      durationInFrames: 300,
      fps: 30,
      canvasWidth: 1920,
      canvasHeight: 1080,
      isProjectEmpty: false,
      referenceVideoName: 'demo.mp4',
      onToggle: () => undefined,
    }));

    expect(playing).toContain('data-playback-icon="pause"');
    expect(playing).toContain('aria-label="暂停"');
    expect(paused).toContain('data-playback-icon="play"');
    expect(playing).not.toContain('type="range"');
    expect(paused).not.toContain('type="range"');
  });

  it('stops playback on Player ended and removes stale listeners when the Player is replaced', () => {
    const first = playerEmitter();
    const second = playerEmitter();
    const setPlaying = vi.fn();

    const disconnectFirst = connectPlayerEnded(first.player, setPlaying);
    disconnectFirst();
    connectPlayerEnded(second.player, setPlaying);
    first.end();
    second.end();

    expect(first.player.removeEventListener).toHaveBeenCalledOnce();
    expect(setPlaying).toHaveBeenCalledTimes(1);
    expect(setPlaying).toHaveBeenCalledWith(false);
  });

  it('restarts the Player at frame zero with one play action after it ended', () => {
    const emitter = playerEmitter();
    const setCurrentFrame = vi.fn();

    playPlayerFromFrame(emitter.player, 299, 300, setCurrentFrame);

    expect(emitter.player.seekTo).toHaveBeenCalledWith(0);
    expect(setCurrentFrame).toHaveBeenCalledWith(0);
    expect(emitter.player.play).toHaveBeenCalledOnce();
  });

  it('starts both side panes collapsed only in the recoverable narrow-window range', () => {
    expect(shouldStartCollapsed(800)).toBe(true);
    expect(shouldStartCollapsed(959)).toBe(true);
    expect(shouldStartCollapsed(960)).toBe(false);
  });
});

describe('timeline resize math', () => {
  it('clamps separator dragging between 140px and 60% of the workspace', () => {
    expect(timelineHeightFromPointer(220, 500, 900, 1000)).toBe(140);
    expect(timelineHeightFromPointer(220, 500, 0, 1000)).toBe(600);
    expect(timelineHeightFromPointer(220, 500, 430, 1000)).toBe(290);
    expect(clampTimelineHeight(Number.NaN, 1000)).toBe(220);
  });
});

describe('readProjectFile', () => {
  it('returns a readable error without changing the current project when file reading rejects', async () => {
    const store = createEditorStore();
    const before = store.getState().project;
    const file = { text: () => Promise.reject(new Error('disk unavailable')) };

    const result = await readProjectFile(file, store.getState().openProject);

    expect(result).toEqual({
      ok: false,
      code: 'read_failed',
      message: '无法读取工程文件：disk unavailable',
    });
    expect(store.getState().project).toBe(before);
  });
});

describe('importSubtitleFile', () => {
  it('parses an SRT file and replaces cues without requiring a video', async () => {
    const setCues = vi.fn();

    const result = await importSubtitleFile({
      text: () => Promise.resolve('1\n00:00:00,000 --> 00:00:01,000\n第一句'),
    }, setCues);

    expect(result).toEqual({ ok: true, message: '已导入 1 条字幕。' });
    expect(setCues).toHaveBeenCalledWith([
      { cueId: 'cue-1', startMs: 0, endMs: 1000, text: '第一句' },
    ]);
  });
});

describe('importAgentSequenceFile', () => {
  it('atomically replaces formal effects for a valid Agent JSON file', async () => {
    const draft: AgentDraft = {
      kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
      scenes: [{
        sceneId: 'scene', sourceCueIds: ['cue-two-component-scene'],
        components: [{
          componentId: 't1-05', componentVersion: 1, role: 'title',
          content: { titleText: '新标题', descText: '新说明' },
        }],
      }],
    };
    const replaceEffects = vi.fn();

    const result = await importAgentSequenceFile(
      { text: () => Promise.resolve(JSON.stringify(draft)) },
      twoComponentSceneProject,
      replaceEffects,
    );

    expect(result.ok).toBe(true);
    expect(replaceEffects).toHaveBeenCalledOnce();
    expect(replaceEffects.mock.calls[0][0]).toHaveLength(1);
  });

  it('reports all hard errors and does not replace formal effects', async () => {
    const draft: AgentDraft = {
      kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
      scenes: [{
        sceneId: 'bad-scene', sourceCueIds: ['cue-two-component-scene'],
        components: [
          { componentId: 'unknown-1', componentVersion: 1, role: 'title', content: {} },
          { componentId: 'unknown-2', componentVersion: 1, role: 'body', content: {} },
        ],
      }],
    };
    const replaceEffects = vi.fn();

    const result = await importAgentSequenceFile(
      { text: () => Promise.resolve(JSON.stringify(draft)) },
      twoComponentSceneProject,
      replaceEffects,
    );

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Unknown component: unknown-1');
    expect(result.message).toContain('Unknown component: unknown-2');
    expect(replaceEffects).not.toHaveBeenCalled();
  });
});
