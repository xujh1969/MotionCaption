import React from 'react';
import { useEditorStore } from '../store/editorStore';

interface ToolbarProps {
  videoName: string | null;
  onLoadVideo: (file: File | undefined) => void;
  onImportSubtitle?: (file: File | undefined) => void;
  onOpenProject: (file: File | undefined) => void;
  onSaveProject: () => void;
  onImportAgent: (file: File | undefined) => void;
  onOpenAiOrchestration: () => void;
  onOpenSkillSync?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  videoName,
  onLoadVideo,
  onImportSubtitle,
  onOpenProject,
  onSaveProject,
  onImportAgent,
  onOpenAiOrchestration,
  onOpenSkillSync,
}) => {
  const background = useEditorStore((state) => state.previewBackground);
  const setBackground = useEditorStore((state) => state.setPreviewBackground);

  return (
    <header className="workspace-toolbar">
      <div className="toolbar-left">
        <div className="toolbar-brand" aria-label="MotionCaption">
          <svg className="toolbar-logo" viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id="toolbar-logo-gradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#4cc9f0" />
                <stop offset="1" stopColor="#7aa5ff" />
              </linearGradient>
            </defs>
            <rect x="1.5" y="1.5" width="21" height="21" rx="6.5" fill="url(#toolbar-logo-gradient)" />
            <path d="M9.6 7.4 16.8 12l-7.2 4.6z" fill="#fff" />
          </svg>
          <strong>MotionCaption</strong>
        </div>
        <div className="toolbar-actions">
          <label className="toolbar-button">载入视频<input data-testid="video-input" hidden type="file" accept="video/*" onChange={(event) => onLoadVideo(event.target.files?.[0])} /></label>
          <label className="toolbar-button">导入字幕<input hidden type="file" accept=".srt,text/plain" onChange={(event) => onImportSubtitle?.(event.target.files?.[0])} /></label>
          <label className="toolbar-button">导入 Agent JSON<input hidden type="file" accept="application/json,.json" onChange={(event) => onImportAgent(event.target.files?.[0])} /></label>
          <button type="button" aria-label="AI 编排" onClick={onOpenAiOrchestration}>AI 编排</button>
          <button
            type="button"
            aria-label="同步组件 Skill"
            disabled={!onOpenSkillSync}
            title={onOpenSkillSync ? '对比注册表与已生成 Skill 的差异' : '当前环境不支持组件 Skill 同步'}
            onClick={() => onOpenSkillSync?.()}
          >同步组件 Skill</button>
          <label className="toolbar-button">打开工程<input hidden type="file" accept="application/json,.json" onChange={(event) => onOpenProject(event.target.files?.[0])} /></label>
          <button type="button" onClick={onSaveProject}>保存工程</button>
          <button type="button" disabled title="后续任务">工程设置</button>
          <button type="button" disabled title="Task 14">透明导出</button>
        </div>
      </div>
      <div className="preview-backgrounds" aria-label="预览背景">
        <span>预览</span>
        {([
          ['checkerboard', '棋盘'], ['dark', '深色'], ['video', '视频'],
        ] as const).map(([mode, label]) => (
          <button
            type="button"
            key={mode}
            className={background === mode ? 'active' : ''}
            disabled={mode === 'video' && !videoName}
            onClick={() => setBackground(mode)}
          >{label}</button>
        ))}
      </div>
    </header>
  );
};
