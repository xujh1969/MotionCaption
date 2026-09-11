import React, { useEffect, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { ProjectComposition, sortEffectsForComposition } from '../composition/ProjectComposition';
import { EffectInstanceFrame } from '../composition/EffectInstanceFrame';
import { effectRegistry } from '../effects/registry';
import type { MotionEffectInstance, MotionProject, SubtitleCue } from '../project/types';
import { cueFrameInterval } from '../project/cueTiming';
import { useEditorStore } from '../store/editorStore';
import { fitProjectToRect } from './coordinates';
import { SelectionBox } from './SelectionBox';

export interface VideoSource {
  name: string;
  url: string;
}

/** 试播叠加层内容：单个临时实例，带 data-effect-root 供选择层/QA 探测。 */
export const PreviewOverlayComposition: React.FC<{ effect: MotionEffectInstance }> = ({ effect }) => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
    <div data-effect-root={effect.instanceId} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <EffectInstanceFrame effect={effect} />
    </div>
  </div>
);

export function editableEffectsAtFrame(
  effects: readonly MotionEffectInstance[],
  frame: number,
): MotionEffectInstance[] {
  return sortEffectsForComposition(effects).filter((effect) => (
    frame >= effect.startFrame && frame < effect.startFrame + effect.durationInFrames
  ));
}

export function projectForEditableSelection(
  project: MotionProject,
  hiddenTrackIds: readonly string[],
): MotionProject {
  const hidden = new Set(hiddenTrackIds);
  return {
    ...project,
    effects: project.effects.filter((effect) => !hidden.has(`effect-track-${effect.track}`)),
  };
}

export function subtitleCuesAtFrame(
  cues: readonly SubtitleCue[],
  frame: number,
  fps: number,
  durationInFrames: number,
): SubtitleCue[] {
  return cues.filter((cue) => {
    const interval = cueFrameInterval(cue, fps, durationInFrames);
    return interval !== null && frame >= interval.startFrame && frame < interval.endFrame;
  });
}

export interface InstanceRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Measures the union of the rendered DOM bounds of each effect instance
 * (elements under its data-effect-root wrapper), converted into project
 * coordinates. Animation frames change bounds continuously, so this runs on
 * every animation frame and only commits state when a rect actually moves.
 */
export function measureInstanceRects(
  stage: HTMLElement | null,
  fittedRect: { left: number; top: number; scale: number },
): Record<string, InstanceRect> {
  const rects: Record<string, InstanceRect> = {};
  if (!stage || !(fittedRect.scale > 0)) return rects;
  const stageBounds = stage.getBoundingClientRect();
  stage.querySelectorAll<HTMLElement>('[data-effect-root]').forEach((root) => {
    const instanceId = root.getAttribute('data-effect-root');
    if (!instanceId) return;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    root.querySelectorAll<HTMLElement>('*').forEach((node) => {
      const bounds = node.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      left = Math.min(left, bounds.left);
      top = Math.min(top, bounds.top);
      right = Math.max(right, bounds.right);
      bottom = Math.max(bottom, bounds.bottom);
    });
    if (!Number.isFinite(left)) return;
    rects[instanceId] = {
      left: (left - stageBounds.left - fittedRect.left) / fittedRect.scale,
      top: (top - stageBounds.top - fittedRect.top) / fittedRect.scale,
      width: (right - left) / fittedRect.scale,
      height: (bottom - top) / fittedRect.scale,
    };
  });
  return rects;
}

const serializeRects = (rects: Record<string, InstanceRect>): string => Object
  .entries(rects)
  .map(([id, rect]) => `${id}:${[rect.left, rect.top, rect.width, rect.height].map((value) => Math.round(value * 2) / 2).join(',')}`)
  .sort()
  .join('|');

interface VideoStageProps {
  playerRef: React.RefObject<PlayerRef>;
  videoRef: React.RefObject<HTMLVideoElement>;
  videoSource: VideoSource | null;
  editorMode?: boolean;
  onVideoMetadata: (video: HTMLVideoElement) => void;
  onVideoTimeChange: (video: HTMLVideoElement) => void;
  onVideoEnded: () => void;
}

export const VideoStage: React.FC<VideoStageProps> = ({
  playerRef,
  videoRef,
  videoSource,
  editorMode = true,
  onVideoMetadata,
  onVideoTimeChange,
  onVideoEnded,
}) => {
  const video = useEditorStore((state) => state.project.video);
  const cues = useEditorStore((state) => state.project.cues);
  const effects = useEditorStore((state) => state.project.effects);
  const currentFrame = useEditorStore((state) => state.currentFrame);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const background = useEditorStore((state) => state.previewBackground);
  const hiddenTrackIds = useEditorStore((state) => state.hiddenTimelineTrackIds);
  const selectedId = useEditorStore((state) => state.selectedInstanceId);
  const selectInstance = useEditorStore((state) => state.selectInstance);
  const updateEffect = useEditorStore((state) => state.updateEffect);
  const componentPreview = useEditorStore((state) => state.componentPreview);
  const clearComponentPreview = useEditorStore((state) => state.clearComponentPreview);
  const stageRef = useRef<HTMLDivElement>(null);
  const previewPlayerRef = useRef<PlayerRef>(null);
  const [stageSize, setStageSize] = useState({ width: video.width, height: video.height });
  const [instanceRects, setInstanceRects] = useState<Record<string, InstanceRect>>({});
  const project = { kind: 'captionforge.project' as const, schemaVersion: 1 as const, video, cues, effects };
  const projectSize = { width: video.width, height: video.height };
  const fittedRect = fitProjectToRect({ left: 0, top: 0, ...stageSize }, projectSize);
  const editableEffects = editableEffectsAtFrame(
    projectForEditableSelection(project, hiddenTrackIds).effects,
    currentFrame,
  );
  const visibleCues = subtitleCuesAtFrame(project.cues, currentFrame, video.fps, video.durationInFrames);
  const subtitlesDimmed = hiddenTrackIds.includes('subtitles');

  // While playing WITHOUT a reference video, the Player advances frames on its
  // own clock. Seeking it on every store frame would pause → seek → resume each
  // frame, resetting the playback time base and throttling playback to render
  // speed. So only seek from outside (scrubbing/stepping) or when a reference
  // video is present and drives the clock (the Player is paused then and simply
  // renders each media frame).
  useEffect(() => {
    if (!isPlaying || videoSource) playerRef.current?.seekTo(currentFrame);
  }, [currentFrame, isPlaying, playerRef, videoSource]);

  // 试播用独立叠加层播放器：自己的 3 秒时钟播完一遍即清除。
  // 主时间线完全不动——播放头、参考视频、isPlaying 都保持原状（静止演示）。
  useEffect(() => {
    const player = previewPlayerRef.current;
    if (!componentPreview || !player) return undefined;
    const onEnded = () => clearComponentPreview();
    player.addEventListener('ended', onEnded);
    void player.play();
    return () => player.removeEventListener('ended', onEnded);
  }, [clearComponentPreview, componentPreview]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const updateSize = () => {
      const bounds = stage.getBoundingClientRect();
      setStageSize({ width: bounds.width, height: bounds.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!editorMode) return;
    let raf = 0;
    let lastSignature = '';
    const measure = () => {
      const rects = measureInstanceRects(stageRef.current, fittedRect);
      const signature = serializeRects(rects);
      if (signature !== lastSignature) {
        lastSignature = signature;
        setInstanceRects(rects);
      }
      raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [editorMode, fittedRect.left, fittedRect.scale, fittedRect.top]);

  return (
    <div
      ref={stageRef}
      className={`video-stage preview-${background}`}
      data-video-stage
    >
      {videoSource && (
        <video
          ref={videoRef}
          key={videoSource.url}
          data-reference-video
          src={videoSource.url}
          playsInline
          className="reference-video"
          style={{ visibility: background === 'video' ? 'visible' : 'hidden' }}
          onLoadedMetadata={(event) => onVideoMetadata(event.currentTarget)}
          onTimeUpdate={(event) => onVideoTimeChange(event.currentTarget)}
          onSeeked={(event) => onVideoTimeChange(event.currentTarget)}
          onEnded={onVideoEnded}
        />
      )}
      <Player
        ref={playerRef}
        component={ProjectComposition}
        inputProps={{ project, editorMode: false, dimTrackIds: hiddenTrackIds }}
        durationInFrames={video.durationInFrames}
        fps={video.fps}
        compositionWidth={video.width}
        compositionHeight={video.height}
        controls={false}
        loop={false}
        acknowledgeRemotionLicense
        className="remotion-player stage-effects-layer"
        style={{ width: '100%', height: '100%' }}
      />
      {/* 组件试播叠加层：独立时钟在静止画面上演示组件动效，播完自动清除。 */}
      {componentPreview && (
        <Player
          ref={previewPlayerRef}
          component={PreviewOverlayComposition}
          inputProps={{ effect: componentPreview.effect }}
          durationInFrames={componentPreview.effect.durationInFrames}
          fps={video.fps}
          compositionWidth={video.width}
          compositionHeight={video.height}
          controls={false}
          loop={false}
          autoPlay
          acknowledgeRemotionLicense
          className="remotion-player component-preview-player"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />
      )}
      {editorMode && visibleCues.length > 0 && (
        <div
          className="editor-subtitle-layer"
          data-editor-subtitle-layer
          style={{
            left: fittedRect.left,
            top: fittedRect.top,
            width: fittedRect.width,
            height: fittedRect.height,
          }}
        >
          {visibleCues.map((cue) => <span key={cue.cueId}>{cue.text}</span>)}
        </div>
      )}
      {editorMode && (
        <div
          data-selection-layer
          className="selection-layer"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) selectInstance(null);
          }}
        >
          {editableEffects.map((effect, stackRank) => (
            <SelectionBox
              key={effect.instanceId}
              effect={effect}
              footprint={effectRegistry.get(effect.componentId).layout.footprint}
              measuredRect={instanceRects[effect.instanceId] ?? null}
              fittedRect={fittedRect}
              projectSize={projectSize}
              selected={selectedId === effect.instanceId}
              stackRank={stackRank}
              stackCount={editableEffects.length}
              editorMode
              onSelect={selectInstance}
              onTransform={(instanceId, transform) => updateEffect(instanceId, { transform })}
            />
          ))}
        </div>
      )}
    </div>
  );
};
