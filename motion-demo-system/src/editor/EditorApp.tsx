import React, { useEffect, useRef, useState } from 'react';
import type { PlayerRef } from '@remotion/player';
import { importAgentSequence } from '../agent/importAgentSequence';
import { AgentDraftSchema } from '../project/schema';
import { serializeProject, type ParseProjectResult } from '../project/serialize';
import type { MotionEffectInstance, MotionProject, SubtitleCue } from '../project/types';
import { parseSRT } from '../subtitle/parse';
import { useEditorStore } from '../store/editorStore';
import { AiOrchestrationDialog, readLlmRuntime } from './AiOrchestrationDialog';
import { ComponentLibrary } from './ComponentLibrary';
import { InspectorPanel } from './InspectorPanel';
import { Timeline } from './Timeline';
import { Toolbar } from './Toolbar';
import { VideoStage, type VideoSource } from './VideoStage';

export const frameFromMediaTime = (
  currentTime: number,
  fps: number,
  durationInFrames: number,
): number => Math.min(
  Math.max(0, durationInFrames - 1),
  Math.max(0, Math.round(currentTime * fps)),
);

type EndedEventSource = {
  addEventListener: (name: 'ended', listener: () => void) => void;
  removeEventListener: (name: 'ended', listener: () => void) => void;
};

export function connectPlayerEnded(
  player: EndedEventSource | null | undefined,
  setPlaying: (playing: boolean) => void,
): () => void {
  if (!player) return () => undefined;
  const onEnded = () => setPlaying(false);
  player.addEventListener('ended', onEnded);
  return () => player.removeEventListener('ended', onEnded);
}

type PlayerPlayback = {
  play: () => void;
  seekTo: (frame: number) => void;
};

export function playPlayerFromFrame(
  player: PlayerPlayback,
  currentFrame: number,
  durationInFrames: number,
  setCurrentFrame: (frame: number) => void,
): void {
  if (currentFrame >= Math.max(0, durationInFrames - 1)) {
    player.seekTo(0);
    setCurrentFrame(0);
  }
  player.play();
}

export const shouldStartCollapsed = (viewportWidth: number): boolean => viewportWidth < 960;

/** Escape clears the component selection, unless a modal dialog should consume it. */
export const shouldDeselectOnKey = (key: string, dialogOpen: boolean): boolean => key === 'Escape' && !dialogOpen;

export const DEFAULT_TIMELINE_HEIGHT = 220;

export function clampTimelineHeight(requestedHeight: number, workspaceHeight: number): number {
  const fallback = DEFAULT_TIMELINE_HEIGHT;
  const requested = Number.isFinite(requestedHeight) ? requestedHeight : fallback;
  const maximum = Math.max(140, Math.floor(Math.max(0, workspaceHeight) * 0.6));
  return Math.round(Math.min(maximum, Math.max(140, requested)));
}

export function timelineHeightFromPointer(
  startHeight: number,
  startY: number,
  pointerY: number,
  workspaceHeight: number,
): number {
  return clampTimelineHeight(startHeight + startY - pointerY, workspaceHeight);
}

export function seekPlaybackFrame(
  requestedFrame: number,
  fps: number,
  durationInFrames: number,
  setPlaying: (playing: boolean) => void,
  setCurrentFrame: (frame: number) => void,
  media: Pick<HTMLVideoElement, 'currentTime'> | null,
): number {
  const frame = Math.min(
    Math.max(0, durationInFrames - 1),
    Math.max(0, Math.round(Number.isFinite(requestedFrame) ? requestedFrame : 0)),
  );
  setPlaying(false);
  setCurrentFrame(frame);
  if (media) media.currentTime = frame / fps;
  return frame;
}

const formatPlaybackTime = (frame: number, fps: number): string => {
  const seconds = Math.max(0, Math.floor(frame / fps));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

export const PlaybackToggleIcon: React.FC<{ playing: boolean }> = ({ playing }) => (
  <svg
    className="stage-playback-icon"
    data-playback-icon={playing ? 'pause' : 'play'}
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    {playing
      ? <path d="M4.4 2.6h2.7v10.8H4.4zM8.9 2.6h2.7v10.8H8.9z" />
      : <path d="M4.2 2.4 13.2 8l-9 5.6z" />}
  </svg>
);

interface StagePlaybackControlsProps {
  isPlaying: boolean;
  currentFrame: number;
  durationInFrames: number;
  fps: number;
  canvasWidth: number;
  canvasHeight: number;
  isProjectEmpty: boolean;
  referenceVideoName: string | null;
  onToggle: () => void;
}

export const StagePlaybackControls: React.FC<StagePlaybackControlsProps> = ({
  isPlaying,
  currentFrame,
  durationInFrames,
  fps,
  canvasWidth,
  canvasHeight,
  isProjectEmpty,
  referenceVideoName,
  onToggle,
}) => {
  const lastFrame = Math.max(0, durationInFrames - 1);
  const disabled = durationInFrames <= 1;

  return (
    <div className="stage-playback-overlay" data-stage-playback-overlay>
      <span className="stage-project-status">
        {isProjectEmpty ? '空工程' : '工程'} · {referenceVideoName ? `参考视频 ${referenceVideoName}` : '无参考视频'}
        {' | '}{canvasWidth}×{canvasHeight} · {fps}fps
      </span>
      <button
        type="button"
        className="stage-playback-toggle"
        disabled={disabled}
        aria-label={isPlaying ? '暂停' : '播放'}
        aria-pressed={isPlaying}
        onClick={onToggle}
      >
        <PlaybackToggleIcon playing={isPlaying} />
      </button>
      <span className="stage-playback-right">
        <span className="stage-playback-time">
          {formatPlaybackTime(currentFrame, fps)} / {formatPlaybackTime(durationInFrames, fps)}
        </span>
        <span className="stage-playback-frame">{currentFrame} / {lastFrame} 帧</span>
      </span>
    </div>
  );
};

type ProjectFileReadResult = ParseProjectResult | {
  ok: false;
  code: 'read_failed';
  message: string;
};

export async function readProjectFile(
  file: Pick<File, 'text'>,
  openProject: (serialized: string) => ParseProjectResult,
): Promise<ProjectFileReadResult> {
  try {
    return openProject(await file.text());
  } catch (error) {
    const detail = error instanceof Error ? error.message : '未知错误';
    return { ok: false, code: 'read_failed', message: `无法读取工程文件：${detail}` };
  }
}

export async function importSubtitleFile(
  file: Pick<File, 'text'>,
  setCues: (cues: SubtitleCue[]) => void,
): Promise<{ ok: boolean; message: string }> {
  try {
    const cues = parseSRT(await file.text());
    setCues(cues);
    return { ok: true, message: `已导入 ${cues.length} 条字幕。` };
  } catch (error) {
    const detail = error instanceof Error ? error.message : '未知错误';
    return { ok: false, message: `字幕导入失败：${detail}` };
  }
}

export async function importAgentSequenceFile(
  file: Pick<File, 'text'>,
  project: MotionProject,
  replaceEffects: (effects: readonly MotionEffectInstance[]) => void,
): Promise<{ ok: boolean; message: string }> {
  try {
    const parsed = AgentDraftSchema.safeParse(JSON.parse(await file.text()));
    if (!parsed.success) {
      return {
        ok: false,
        message: `Agent JSON 格式无效：\n${parsed.error.issues.map((issue) => issue.message).join('\n')}`,
      };
    }
    const result = importAgentSequence(project, parsed.data);
    if (!result.ok) {
      return {
        ok: false,
        message: `Agent JSON 导入失败：\n${result.errors.map((error) => error.message).join('\n')}`,
      };
    }
    replaceEffects(result.project.effects);
    const warningText = result.warnings.length
      ? `\n警告：\n${result.warnings.map((warning) => warning.message).join('\n')}`
      : '';
    return { ok: true, message: `Agent JSON 已导入并替换全部动效。${warningText}` };
  } catch (error) {
    const detail = error instanceof Error ? error.message : '未知错误';
    return { ok: false, message: `Agent JSON 导入失败：${detail}` };
  }
}

const downloadText = (filename: string, contents: string): void => {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const EditorApp: React.FC = () => {
  const [videoSource, setVideoSource] = useState<VideoSource | null>(null);
  const [message, setMessage] = useState('');
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [llmRuntime, setLlmRuntime] = useState<{ provider: import('../llm/provider').LlmProvider; profileName: string } | null>(null);
  const [libraryCollapsed, setLibraryCollapsed] = useState(() => (
    typeof window !== 'undefined' && shouldStartCollapsed(window.innerWidth)
  ));
  const [inspectorCollapsed, setInspectorCollapsed] = useState(() => (
    typeof window !== 'undefined' && shouldStartCollapsed(window.innerWidth)
  ));
  const [timelineHeight, setTimelineHeight] = useState(DEFAULT_TIMELINE_HEIGHT);
  const workspaceRef = useRef<HTMLElement>(null);
  const timelineResizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    const cancelTimelineResize = () => { timelineResizeRef.current = null; };
    window.addEventListener('blur', cancelTimelineResize);
    return () => {
      window.removeEventListener('blur', cancelTimelineResize);
      timelineResizeRef.current = null;
    };
  }, []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const effectsPlayerRef = useRef<PlayerRef>(null);
  const playbackAttemptRef = useRef(0);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const currentFrame = useEditorStore((state) => state.currentFrame);
  const fps = useEditorStore((state) => state.project.video.fps);
  const canvasWidth = useEditorStore((state) => state.project.video.width);
  const canvasHeight = useEditorStore((state) => state.project.video.height);
  const durationInFrames = useEditorStore((state) => state.project.video.durationInFrames);
  const isProjectEmpty = useEditorStore((state) => (
    state.project.cues.length === 0 && state.project.effects.length === 0
  ));
  const setPlaying = useEditorStore((state) => state.setPlaying);
  const setCurrentFrame = useEditorStore((state) => state.setCurrentFrame);
  const setVideoMetadata = useEditorStore((state) => state.setVideoMetadata);
  const setCues = useEditorStore((state) => state.setCues);
  const replaceEffects = useEditorStore((state) => state.replaceEffects);
  const openProject = useEditorStore((state) => state.openProject);
  const setPreviewBackground = useEditorStore((state) => state.setPreviewBackground);
  const project = useEditorStore((state) => state.project);
  const selectedInstanceId = useEditorStore((state) => state.selectedInstanceId);

  useEffect(() => () => {
    if (videoSource) URL.revokeObjectURL(videoSource.url);
  }, [videoSource]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shouldDeselectOnKey(event.key, aiDialogOpen)) return;
      useEditorStore.getState().selectInstance(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [aiDialogOpen]);

  useEffect(() => connectPlayerEnded(
    effectsPlayerRef.current as EndedEventSource | null,
    setPlaying,
  ), [setPlaying, videoSource]);

  useEffect(() => {
    const media = videoRef.current;
    const player = effectsPlayerRef.current;
    const attempt = ++playbackAttemptRef.current;
    let active = true;

    if (isPlaying) {
      if (player) playPlayerFromFrame(player, currentFrame, durationInFrames, setCurrentFrame);
      if (media) {
        if (
          media.ended
          || media.currentTime >= media.duration
          || currentFrame >= Math.max(0, durationInFrames - 1)
        ) media.currentTime = 0;
        void media.play().catch(() => {
          if (active && attempt === playbackAttemptRef.current && videoRef.current === media) {
            player?.pause();
            setPlaying(false);
            setMessage('浏览器未能开始播放视频。');
          }
        });
      }
    } else {
      player?.pause();
      media?.pause();
    }

    return () => {
      active = false;
    };
  }, [durationInFrames, isPlaying, setCurrentFrame, setPlaying, videoSource]);

  useEffect(() => {
    if (!isPlaying) return;
    let animationFrame = 0;
    const updateFrame = () => {
      const media = videoRef.current;
      const frame = media
        ? frameFromMediaTime(media.currentTime, fps, durationInFrames)
        : frameFromMediaTime(effectsPlayerRef.current?.getCurrentFrame() ?? 0, fps, durationInFrames);
      setCurrentFrame(frame);
      animationFrame = requestAnimationFrame(updateFrame);
    };
    animationFrame = requestAnimationFrame(updateFrame);
    return () => cancelAnimationFrame(animationFrame);
  }, [durationInFrames, fps, isPlaying, setCurrentFrame]);

  const loadVideo = (file: File | undefined) => {
    if (!file) return;
    setPlaying(false);
    setCurrentFrame(0);
    setVideoSource({ name: file.name, url: URL.createObjectURL(file) });
    setPreviewBackground('video');
    setMessage('视频已载入；文件本身不会写入工程文件。');
  };

  const readProject = async (file: File | undefined) => {
    if (!file) return;
    const result = await readProjectFile(file, openProject);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setVideoSource(null);
    setPreviewBackground('checkerboard');
    setMessage('工程已打开。参考视频需重新选择。');
  };

  const readSubtitle = async (file: File | undefined) => {
    if (!file) return;
    const result = await importSubtitleFile(file, setCues);
    setMessage(result.message);
  };

  const readAgentSequence = async (file: File | undefined) => {
    if (!file) return;
    const result = await importAgentSequenceFile(file, useEditorStore.getState().project, replaceEffects);
    setMessage(result.message);
  };

  const saveProject = () => {
    try {
      downloadText('captionforge-project.json', serializeProject(useEditorStore.getState().project));
      setMessage('工程已保存。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '工程保存失败。');
    }
  };

  const syncVideoFrame = (media: HTMLVideoElement) => {
    const frame = frameFromMediaTime(media.currentTime, fps, durationInFrames);
    setCurrentFrame(frame);
  };

  return (
    <main
      ref={workspaceRef}
      className={`editor-workspace${libraryCollapsed ? ' library-collapsed' : ''}${inspectorCollapsed ? ' inspector-collapsed' : ''}`}
      style={{ '--timeline-height': `${timelineHeight}px` } as React.CSSProperties}
    >
      <Toolbar
        videoName={videoSource?.name ?? null}
        onLoadVideo={loadVideo}
        onImportSubtitle={(file) => void readSubtitle(file)}
        onOpenProject={(file) => void readProject(file)}
        onSaveProject={saveProject}
        onImportAgent={(file) => void readAgentSequence(file)}
        onOpenAiOrchestration={() => {
          setLlmRuntime(readLlmRuntime());
          setAiDialogOpen(true);
        }}
      />
      {message && <div className="workspace-notice" role="status">{message}</div>}
      <ComponentLibrary
        collapsed={libraryCollapsed}
        onToggle={() => setLibraryCollapsed((value) => !value)}
        onAddError={setMessage}
      />
      <section className="workspace-stage" aria-label="合成画布">
        <div className="stage-viewport">
          <VideoStage
            playerRef={effectsPlayerRef}
            videoRef={videoRef}
            videoSource={videoSource}
            onVideoMetadata={(media) => setVideoMetadata({
              width: media.videoWidth,
              height: media.videoHeight,
              fps,
              durationInFrames: Math.max(1, Math.round(media.duration * fps)),
            })}
            onVideoTimeChange={syncVideoFrame}
            onVideoEnded={() => setPlaying(false)}
          />
        </div>
        <div className="stage-toolbar" aria-label="播放控制栏">
          <StagePlaybackControls
            isPlaying={isPlaying}
            currentFrame={currentFrame}
            durationInFrames={durationInFrames}
            fps={fps}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            isProjectEmpty={isProjectEmpty}
            referenceVideoName={videoSource?.name ?? null}
            onToggle={() => setPlaying(!isPlaying)}
          />
        </div>
      </section>
      <InspectorPanel collapsed={inspectorCollapsed} onToggle={() => setInspectorCollapsed((value) => !value)} />
      {(() => {
        return (
          <AiOrchestrationDialog
            open={aiDialogOpen}
            onClose={() => setAiDialogOpen(false)}
            provider={llmRuntime?.provider ?? null}
            modelLabel={llmRuntime?.profileName ?? '未配置'}
            project={project}
            selectedInstanceId={selectedInstanceId}
            replaceEffects={replaceEffects}
          />
        );
      })()}
      <section className="workspace-timeline" aria-label="时间轴区域">
        <div
          className="timeline-resizer"
          role="separator"
          aria-label="调整时间轴高度"
          aria-orientation="horizontal"
          aria-valuemin={140}
          aria-valuemax={Math.floor((workspaceRef.current?.getBoundingClientRect().height ?? 1000) * 0.6)}
          aria-valuenow={timelineHeight}
          onDoubleClick={() => setTimelineHeight(clampTimelineHeight(
            DEFAULT_TIMELINE_HEIGHT,
            workspaceRef.current?.getBoundingClientRect().height ?? window.innerHeight,
          ))}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            timelineResizeRef.current = { startY: event.clientY, startHeight: timelineHeight };
          }}
          onPointerMove={(event) => {
            const resize = timelineResizeRef.current;
            if (!resize) return;
            setTimelineHeight(timelineHeightFromPointer(
              resize.startHeight,
              resize.startY,
              event.clientY,
              workspaceRef.current?.getBoundingClientRect().height ?? window.innerHeight,
            ));
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            timelineResizeRef.current = null;
          }}
          onPointerCancel={() => { timelineResizeRef.current = null; }}
          onLostPointerCapture={() => { timelineResizeRef.current = null; }}
        />
        <Timeline
          onSeek={(frame) => seekPlaybackFrame(
            frame,
            fps,
            durationInFrames,
            setPlaying,
            setCurrentFrame,
            videoRef.current,
          )}
        />
      </section>
    </main>
  );
};
