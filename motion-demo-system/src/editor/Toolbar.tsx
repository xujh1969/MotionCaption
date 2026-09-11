import React from 'react';
import { useEditorStore } from '../store/editorStore';

/**
 * 应用版本号：由 vite.config.ts 从 package.json 的 version 注入。
 * 桌面端（src-tauri/tauri.conf.json）同样引用 package.json，改版本只改那一处。
 */
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

/**
 * 「同步组件 Skill」入口暂时隐藏：该功能只在桌面端可用，且打包产物里的 Skill 目录尚未
 * 补齐 `scripts/`（分发说明见 COMPONENT_DEVELOPMENT.md 第 10 步）。功能代码全部保留，
 * 需要重新开放时把这里改回 true 即可。
 */
const SHOW_SKILL_SYNC = false;

interface ToolbarProps {
  videoName: string | null;
  onLoadVideo: (file: File | undefined) => void;
  onImportSubtitle?: (file: File | undefined) => void;
  onOpenProject: (file: File | undefined) => void;
  onSaveProject: () => void;
  onImportAgent: (file: File | undefined) => void;
  onOpenSkillSync?: () => void;
  onExportStyleDefaults: () => void;
  canExportTransparent?: boolean;
  onExportTransparent?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  videoName,
  onLoadVideo,
  onImportSubtitle,
  onOpenProject,
  onSaveProject,
  onImportAgent,
  onOpenSkillSync,
  onExportStyleDefaults,
  canExportTransparent,
  onExportTransparent,
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
          <span className="toolbar-version" data-app-version title="应用版本号（来自 package.json）">v{APP_VERSION}</span>
        </div>
        <div className="toolbar-actions">
          <label className="toolbar-button">载入视频<input data-testid="video-input" hidden type="file" accept="video/*" onChange={(event) => onLoadVideo(event.target.files?.[0])} /></label>
          <label className="toolbar-button">导入字幕<input hidden type="file" accept=".srt,text/plain" onChange={(event) => onImportSubtitle?.(event.target.files?.[0])} /></label>
          <label className="toolbar-button">导入 Agent JSON<input hidden type="file" accept="application/json,.json" onChange={(event) => onImportAgent(event.target.files?.[0])} /></label>
          <button
            type="button"
            aria-label="导出默认样式"
            title="把本机保存的全部默认样式导出为 JSON 文件；交给 AI 固化进 config.ts 成为代码级默认（先在各组件属性里点「存为默认样式」）"
            onClick={onExportStyleDefaults}
          >导出默认样式</button>
          {SHOW_SKILL_SYNC && (
            <button
              type="button"
              aria-label="同步组件 Skill"
              disabled={!onOpenSkillSync}
              title={onOpenSkillSync ? '对比注册表与已生成 Skill 的差异' : '当前环境不支持组件 Skill 同步'}
              onClick={() => onOpenSkillSync?.()}
            >同步组件 Skill</button>
          )}
          <label className="toolbar-button">打开工程<input hidden type="file" accept="application/json,.json" onChange={(event) => onOpenProject(event.target.files?.[0])} /></label>
          <button type="button" onClick={onSaveProject}>保存工程</button>
          <button type="button" disabled title="后续任务">工程设置</button>
          <button
            type="button"
            disabled={!canExportTransparent || !onExportTransparent}
            title={canExportTransparent
              ? '逐帧渲染 PNG（带透明通道）后由内置 ffmpeg 合成 ProRes 4444 MOV（可直接拖入剪映 / Premiere / AE 叠加）'
              : '透明导出仅桌面端可用：浏览器内核不支持透明视频编码'}
            onClick={() => onExportTransparent?.()}
          >导出透明字幕视频</button>
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
