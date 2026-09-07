import React from 'react';
import type { EffectDefinition, EffectPropDefinition } from '../effects/types';
import { effectRegistry } from '../effects/registry';
import { MAX_TRACK_INDEX } from '../project/limits';
import { useEditorStore } from '../store/editorStore';

export const inspectorDefinitions = (
  definition: EffectDefinition,
): Array<[string, EffectPropDefinition]> => Object.entries(definition.props).filter(([, field]) => (
  field.agentEditable && field.role === 'content'
));

interface InspectorPanelProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const numericValue = (raw: string, fallback: number): number => {
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
};

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ collapsed = false, onToggle }) => {
  const selectedId = useEditorStore((state) => state.selectedInstanceId);
  const effect = useEditorStore((state) => state.project.effects.find(({ instanceId }) => instanceId === selectedId));
  const updateEffect = useEditorStore((state) => state.updateEffect);
  const deleteEffect = useEditorStore((state) => state.deleteEffect);
  const definition = effect ? effectRegistry.get(effect.componentId) : null;

  return (
    <aside className={`workspace-pane inspector-panel${collapsed ? ' collapsed' : ''}`} aria-label="属性面板">
      <header className="workspace-pane-header">
        <button type="button" onClick={onToggle} aria-label={collapsed ? '展开属性面板' : '折叠属性面板'}>
          {collapsed ? '‹' : '›'}
        </button>
        <strong>属性</strong>
      </header>
      <div className="workspace-pane-body inspector-scroll">
        {!effect || !definition ? <p className="empty-hint">未选择组件</p> : (
          <>
            <div className="inspector-title">
              <span>{definition.id}</span>
              <strong>{definition.name}</strong>
            </div>
            <section className="inspector-section">
              <h3>内容</h3>
              {inspectorDefinitions(definition).map(([key, field]) => {
                const value = effect.props[key] ?? field.default;
                if (field.type === 'list') {
                  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
                  return (
                    <label className="workspace-field" key={key}>
                      <span>{field.label}</span>
                      <textarea
                        key={`${effect.instanceId}:${key}`}
                        defaultValue={text}
                        onBlur={(event) => {
                          try {
                            updateEffect(effect.instanceId, { props: { [key]: JSON.parse(event.target.value) } });
                          } catch {
                            // Keep formal project data valid until the JSON is complete.
                          }
                        }}
                      />
                    </label>
                  );
                }
                return (
                  <label className="workspace-field" key={key}>
                    <span>{field.label}</span>
                    <input
                      type={field.type === 'number' ? 'number' : field.type === 'color' ? 'color' : 'text'}
                      min={field.min}
                      max={field.max}
                      value={String(value)}
                      onChange={(event) => updateEffect(effect.instanceId, {
                        props: { [key]: field.type === 'number' ? Math.min(
                          field.max ?? Number.POSITIVE_INFINITY,
                          Math.max(field.min ?? Number.NEGATIVE_INFINITY, numericValue(event.target.value, Number(value))),
                        ) : event.target.value },
                      })}
                    />
                  </label>
                );
              })}
            </section>
            <section className="inspector-section inspector-grid">
              <h3>变换</h3>
              {(['x', 'y', 'scale', 'rotation'] as const).map((key) => (
                <label className="workspace-field" key={key}>
                  <span>{key}</span>
                  <input
                    aria-label={`transform-${key}`}
                    type="number"
                    step={key === 'scale' ? 0.05 : 1}
                    value={effect.transform[key]}
                    onChange={(event) => updateEffect(effect.instanceId, {
                      transform: { [key]: numericValue(event.target.value, effect.transform[key]) },
                    })}
                  />
                </label>
              ))}
            </section>
            <section className="inspector-section inspector-grid">
              <h3>时间与层级</h3>
              {([
                ['startFrame', '起始帧'], ['durationInFrames', '时长'], ['track', '轨道'], ['zIndex', 'zIndex'],
              ] as const).map(([key, label]) => (
                <label className="workspace-field" key={key}>
                  <span>{label}</span>
                  <input
                    aria-label={key}
                    type="number"
                    min={key === 'track' ? 1 : undefined}
                    max={key === 'track' ? MAX_TRACK_INDEX + 1 : undefined}
                    value={key === 'track' ? effect.track + 1 : effect[key]}
                    onChange={(event) => updateEffect(effect.instanceId, {
                      [key]: key === 'track'
                        ? Math.min(MAX_TRACK_INDEX, Math.max(0, numericValue(event.target.value, effect.track + 1) - 1))
                        : numericValue(event.target.value, effect[key]),
                    })}
                  />
                </label>
              ))}
            </section>
            <button type="button" className="danger-action" onClick={() => deleteEffect(effect.instanceId)}>删除组件</button>
          </>
        )}
      </div>
    </aside>
  );
};
