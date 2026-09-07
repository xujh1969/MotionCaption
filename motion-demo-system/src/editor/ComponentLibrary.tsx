import React, { useMemo, useState } from 'react';
import { effectRegistry } from '../effects/registry';
import type { EffectDefinition } from '../effects/types';
import { CATEGORIES } from '../remotion/catalog';
import { useEditorStore, type EditorStoreState } from '../store/editorStore';

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

interface ComponentLibraryProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onAddError?: (message: string) => void;
}

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ collapsed = false, onToggle, onAddError }) => {
  const definitions = useMemo(() => effectRegistry.list(), []);
  const [query, setQuery] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const groups = groupEffectDefinitions(definitions, query);

  const add = (componentId: string) => {
    const added = addComponentWithFeedback(componentId, (message) => {
      setAddError(message);
      onAddError?.(message);
    });
    if (added) setAddError(null);
  };

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
                <button
                  type="button"
                  data-component-id={definition.id}
                  key={definition.id}
                  onClick={() => add(definition.id)}
                >
                  <span>{definition.id}</span>
                  <span>{definition.name}</span>
                </button>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </aside>
  );
};
