import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { effectRegistry } from '../effects/registry';
import type { EffectDefinition } from '../effects/types';
import { CATEGORIES } from '../remotion/catalog';
import { useEditorStore, type EditorStoreState } from '../store/editorStore';
import { getComponentThumbnail, startThumbnailPrewarm } from './componentThumbnail';

export interface EffectDefinitionGroup {
  id: string;
  label: string;
  definitions: EffectDefinition[];
}

export function groupEffectDefinitions(
  definitions: readonly EffectDefinition[],
  query: string,
): EffectDefinitionGroup[] {
  const normalized = query.trim().toLocaleLowerCase();
  return CATEGORIES.map((category) => ({
    ...category,
    definitions: definitions.filter((definition) => (
      definition.category === category.id
      && (!normalized || `${definition.id} ${definition.name}`.toLocaleLowerCase().includes(normalized))
    )),
  })).filter(({ definitions: matches }) => matches.length > 0);
}

export function addComponentAtCurrentFrame(
  componentId: string,
  addEffect: EditorStoreState['addEffect'] = useEditorStore.getState().addEffect,
): string {
  const currentFrame = useEditorStore.getState().currentFrame;
  return addEffect(componentId, currentFrame);
}

export function addComponentWithFeedback(
  componentId: string,
  reportError: (message: string) => void,
  addEffect: EditorStoreState['addEffect'] = useEditorStore.getState().addEffect,
): string | null {
  try {
    return addComponentAtCurrentFrame(componentId, addEffect);
  } catch (error) {
    reportError(error instanceof Error ? error.message : '无法添加组件。');
    return null;
  }
}

/** 点击组件 = 只试播一遍：临时实例在独立叠加层播放器里自播 3 秒，
 * 主时间线与参考视频保持原位静止（不播放、不重置播放头），不写入工程。 */
export function previewComponent(
  componentId: string,
  start = useEditorStore.getState().startComponentPreview,
): void {
  start(componentId);
}

/** 缩略图浮层展示尺寸：宽固定，高随裁剪比例自适应（loading 占位按 16:9）。 */
const POP_WIDTH = 320;
const POP_PLACEHOLDER_HEIGHT = Math.round(POP_WIDTH * 9 / 16);

interface ThumbPopupProps {
  anchor: DOMRect;
  src: string | null;
  failed: boolean;
  label: string;
}

/** 固定定位浮层，渲染进 body——不受组件库滚动容器裁剪，且始终出现在条目右侧外。 */
const ThumbnailPopup: React.FC<ThumbPopupProps> = ({ anchor, src, failed, label }) => {
  const viewportHeight = typeof window === 'undefined' ? 1080 : window.innerHeight;
  const top = Math.max(8, Math.min(anchor.top, viewportHeight - POP_PLACEHOLDER_HEIGHT - 16));
  return createPortal(
    <div
      className="component-thumb-pop"
      data-component-thumb-pop={failed ? 'failed' : src ? 'ready' : 'loading'}
      style={{ left: anchor.right + 8, top, width: POP_WIDTH }}
    >
      {src && <img className="component-thumb-img" src={src} alt={`${label} 效果预览`} />}
      {!src && !failed && <div className="component-thumb-loading" style={{ height: POP_PLACEHOLDER_HEIGHT }}>生成预览…</div>}
      {failed && <div className="component-thumb-loading" style={{ height: POP_PLACEHOLDER_HEIGHT }}>预览生成失败</div>}
    </div>,
    document.body,
  );
};

interface ComponentLibraryProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onAddError?: (message: string) => void;
}

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ collapsed = false, onToggle, onAddError }) => {
  const definitions = useMemo(() => effectRegistry.list(), []);
  const [query, setQuery] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [thumbFailures, setThumbFailures] = useState<Record<string, boolean>>({});
  const groups = groupEffectDefinitions(definitions, query);

  const add = (componentId: string) => {
    const added = addComponentWithFeedback(componentId, (message) => {
      setAddError(message);
      onAddError?.(message);
    });
    if (added) setAddError(null);
  };

  // 空闲时段预生成全部缩略图，让首次悬停即可命中缓存。
  useEffect(() => {
    startThumbnailPrewarm(definitions.map((definition) => definition.id));
  }, [definitions]);

  const requestThumbnail = useCallback((componentId: string) => {
    if (thumbnails[componentId] || thumbFailures[componentId]) return;
    getComponentThumbnail(componentId)
      .then((dataUrl) => setThumbnails((prev) => ({ ...prev, [componentId]: dataUrl })))
      .catch(() => setThumbFailures((prev) => ({ ...prev, [componentId]: true })));
  }, [thumbFailures, thumbnails]);

  const enterItem = useCallback((componentId: string, element: HTMLElement) => {
    setHoveredId(componentId);
    setHoverRect(element.getBoundingClientRect());
    requestThumbnail(componentId);
  }, [requestThumbnail]);

  // 收起浮层：移出条目，或点击条目（试播/插入）时主动收起——
  // 点击后指针仍停留在条目上，pointerLeave 不会触发，必须显式清除。
  const hidePopup = useCallback(() => {
    setHoveredId(null);
    setHoverRect(null);
  }, []);

  const leaveItem = useCallback(() => {
    hidePopup();
  }, [hidePopup]);

  // 页面滚动会使 fixed 定位的锚点失效——滚动时直接收起浮层。
  useEffect(() => {
    if (!hoveredId) return undefined;
    const close = () => {
      setHoveredId(null);
      setHoverRect(null);
    };
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [hoveredId]);

  return (
    <aside className={`workspace-pane component-library${collapsed ? ' collapsed' : ''}`} aria-label="组件库">
      <header className="workspace-pane-header">
        <strong>组件库</strong>
        <button type="button" onClick={onToggle} aria-label={collapsed ? '展开组件库' : '折叠组件库'}>
          {collapsed ? '›' : '‹'}
        </button>
      </header>
      <div className="workspace-pane-body component-library-body">
        <label className="workspace-field component-search">
          <span>搜索</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名称或编号" />
        </label>
        {addError && <div className="component-add-error" role="alert">{addError}</div>}
        <div className="component-list" role="list" aria-label="可用组件">
          {groups.map((group) => (
            <React.Fragment key={group.id}>
              <div
                className="component-category-separator"
                data-category-id={group.id}
                role="separator"
              >
                {group.label}
              </div>
              {group.definitions.map((definition) => (
                <div
                  key={definition.id}
                  className="component-item"
                  data-component-item={definition.id}
                  onPointerEnter={({ currentTarget }) => enterItem(definition.id, currentTarget)}
                  onPointerLeave={leaveItem}
                >
                  <button
                    type="button"
                    data-component-id={definition.id}
                    title={`试播 ${definition.id}`}
                    onClick={() => {
                      hidePopup();
                      previewComponent(definition.id);
                    }}
                  >
                    <span>{definition.id}</span>
                    <span>{definition.name}</span>
                  </button>
                  <button
                    type="button"
                    className="component-add-btn"
                    data-component-add={definition.id}
                    aria-label={`插入 ${definition.id}`}
                    title={`插入 ${definition.id} 到当前帧`}
                    onClick={() => {
                      hidePopup();
                      add(definition.id);
                    }}
                  >
                    +
                  </button>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      {hoveredId && hoverRect && (
        <ThumbnailPopup
          anchor={hoverRect}
          src={thumbnails[hoveredId] ?? null}
          failed={Boolean(thumbFailures[hoveredId])}
          label={hoveredId}
        />
      )}
    </aside>
  );
};
