import React from 'react';
import type { MotionEffectInstance } from '../project/types';
import type { EffectDefinition, EffectPropDefinition } from '../effects/types';
import { effectRegistry } from '../effects/registry';
import { MAX_TRACK_INDEX } from '../project/limits';
import { useEditorStore } from '../store/editorStore';
import type { ConfigState } from '../remotion/config';
import { PropertyPanel } from '../app/PropertyPanel';
import {
  PALETTE_SLOTS,
  PALETTE_SLOT_LABELS,
  slotFor,
  type PaletteSlot,
  type PaletteState,
} from '../effects/paletteSlots';
import {
  collectStyleValues,
  DEFAULT_PALETTE,
  loadPalette,
  mergeUserStyleDefaults,
  readUserStyleDefaults,
  savePalette,
  saveUserStyleDefaults,
  type StyleValues,
} from '../effects/stylePrefs';

/**
 * Agent 可写字段契约（内容类、注册表声明为 agentEditable）。
 * 属性面板本身按 legacy 定义渲染全部可调字段，这里只用于外部能力声明与测试。
 */
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

/** 统一编辑器用 transform 管理位置与缩放，属性面板不再重复暴露这三个键。 */
const HOST_MANAGED_KEYS = ['posX', 'posY', 'scale'];

/** 2.5 秒后自动清空的临时状态消息。 */
const useTransient = (): [string, (message: string) => void] => {
  const [message, setMessage] = React.useState('');
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = React.useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(''), 2600);
  }, []);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return [message, show];
};

const EffectInspector: React.FC<{ effect: MotionEffectInstance; definition: EffectDefinition }> = (
  { effect, definition },
) => {
  const updateEffect = useEditorStore((state) => state.updateEffect);
  const deleteEffect = useEditorStore((state) => state.deleteEffect);
  const applySameStyle = useEditorStore((state) => state.applySameStyle);
  const applyPaletteToProject = useEditorStore((state) => state.applyPaletteToProject);
  const sameTypeCount = useEditorStore((state) => (
    state.project.effects.filter((candidate) => (
      candidate.componentId === effect.componentId && candidate.instanceId !== effect.instanceId
    )).length
  ));
  const effectTotal = useEditorStore((state) => state.project.effects.length);

  const [message, showMessage] = useTransient();
  const [confirmingSame, setConfirmingSame] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [palette, setPaletteState] = React.useState<PaletteState>(
    () => loadPalette() ?? DEFAULT_PALETTE,
  );

  // 缺省值兜底：实例 props 未覆盖的键回落到注册表默认值
  const config = React.useMemo(() => {
    const values: Record<string, number | string> = {};
    for (const [key, prop] of Object.entries(definition.props)) {
      if (typeof prop.default === 'number' || typeof prop.default === 'string') {
        values[key] = prop.default;
      }
    }
    for (const [key, value] of Object.entries(effect.props)) {
      if (typeof value === 'number' || typeof value === 'string') values[key] = value;
      else if (Array.isArray(value)) values[key] = JSON.stringify(value);
    }
    return values as ConfigState;
  }, [definition, effect.props]);

  const setProp = React.useCallback((key: string, value: number | string) => {
    updateEffect(effect.instanceId, { props: { [key]: value } });
  }, [effect.instanceId, updateEffect]);

  const resetProps = React.useCallback(() => {
    const defaults: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(definition.props)) defaults[key] = prop.default;
    // 重置 = 还原到当前生效默认：内容回内置，样式键回用户全局默认（若有）
    updateEffect(effect.instanceId, { props: mergeUserStyleDefaults(effect.componentId, defaults) });
    showMessage('已还原默认样式');
  }, [definition, effect.instanceId, effect.componentId, updateEffect, showMessage]);

  const saveAsDefault = React.useCallback(() => {
    const styles = collectStyleValues(definition, config);
    if (!Object.keys(styles).length) {
      showMessage('该组件没有可保存的样式项');
      return;
    }
    const next = { ...readUserStyleDefaults(), [effect.componentId]: styles };
    saveUserStyleDefaults(next);
    showMessage(`已将 ${definition.id} 当前样式存为本机默认`);
  }, [definition, config, effect.componentId, showMessage]);

  const handleApplySame = React.useCallback(() => {
    if (confirmingSame) {
      setConfirmingSame(false);
      const updated = applySameStyle(effect.instanceId);
      showMessage(updated > 0 ? `已同步样式到 ${updated} 个同类组件` : '同类组件样式已一致');
    } else {
      setConfirmingSame(true);
      setTimeout(() => setConfirmingSame(false), 3000);
    }
  }, [confirmingSame, applySameStyle, effect.instanceId, showMessage]);

  const setPaletteSlot = React.useCallback((slot: PaletteState[keyof PaletteState] extends never ? never : keyof PaletteState & string, value: string) => {
    setPaletteState((previous) => {
      const next = { ...previous, [slot]: value };
      savePalette(next);
      return next;
    });
  }, []);

  const extractFromSelection = React.useCallback(() => {
    let picked = 0;
    const seen = new Set<string>();
    const next = { ...palette };
    for (const key of Object.keys(definition.props)) {
      const slot = slotFor(effect.componentId, key);
      if (!slot || seen.has(slot)) continue;
      const value = config[key];
      if (typeof value !== 'string') continue;
      next[slot] = value;
      seen.add(slot);
      picked += 1;
    }
    savePalette(next);
    setPaletteState(next);
    showMessage(picked > 0 ? `已从 ${definition.id} 提取 ${picked} 个槽位配色` : '该组件没有可提取的配色槽');
  }, [palette, definition, effect.componentId, config, showMessage]);

  const applyPalette = React.useCallback(() => {
    const updated = applyPaletteToProject(palette);
    showMessage(updated > 0 ? `调色板已应用到 ${updated} 个组件` : '工程内没有需要更新的组件');
  }, [palette, applyPaletteToProject, showMessage]);

  const paletteMappedCount = React.useMemo(() => (
    Object.keys(definition.props).filter((key) => slotFor(effect.componentId, key)).length
  ), [definition.props, effect.componentId]);

  return (
    <>
      <div className="inspector-title">
        <span>{definition.id}</span>
        <strong>{definition.name}</strong>
      </div>
      <div className="inspector-actions">
        <button
          type="button"
          className="prop-btn"
          data-action="save-default"
          title="把当前字号/颜色/透明度等样式保存为本机全局默认：今后新建或 AI 导入该组件都直接用这份样式"
          onClick={saveAsDefault}
        >
          存为默认样式
        </button>
        <button
          type="button"
          className="prop-btn"
          data-action="apply-same"
          disabled={sameTypeCount === 0}
          title="把当前组件的样式键覆盖到工程内所有同类组件（不改变各自的文字内容与位置）"
          onClick={handleApplySame}
        >
          {confirmingSame
            ? `再次点击确认同步 ${sameTypeCount} 个`
            : sameTypeCount > 0 ? `同步到同类组件 (${sameTypeCount})` : '无同类组件'}
        </button>
        <button
          type="button"
          className="prop-btn"
          data-action="reset"
          title="把本组件的字号/颜色等还原为当前生效默认（存过全局默认则还原到它，否则还原内置默认）"
          onClick={resetProps}
        >
          重置默认
        </button>
      </div>
      {message && <p className="inspector-status" role="status">{message}</p>}
      <section className="inspector-section">
        <h3>内容与样式</h3>
        <p className="inspector-hint">文本行右侧的 T 可展开该行文字详情：字号、颜色、透明度与重点文字样式</p>
        <PropertyPanel
          embedded
          componentId={effect.componentId}
          config={config}
          onChange={setProp}
          onReset={resetProps}
          hiddenKeys={HOST_MANAGED_KEYS}
        />
      </section>
      <section className="inspector-section">
        <button
          type="button"
          className="palette-heading"
          data-palette-toggle
          onClick={() => setPaletteOpen((open) => !open)}
          aria-expanded={paletteOpen}
        >
          <span>调色板 · 统一全片配色</span>
          <span className="palette-chevron">{paletteOpen ? '−' : '+'}</span>
        </button>
        {paletteOpen && (
          <div className="palette-body" data-palette-body>
            <p className="inspector-hint">
              按语义槽统一整套组件配色。改槽色后点「应用到全工程」；也可先从当前组件提取它的配色作为基底。
            </p>
            <div className="palette-grid">
              {PALETTE_SLOTS.map((slot) => (
                <label className="palette-slot" key={slot}>
                  <span className="palette-swatch" style={{ background: palette[slot] }} />
                  <span className="palette-slot-label">{PALETTE_SLOT_LABELS[slot]}</span>
                  <input
                    className="palette-input"
                    data-palette-input={slot}
                    aria-label={`palette-${slot}`}
                    value={palette[slot]}
                    spellCheck={false}
                    onChange={(event) => setPaletteSlot(slot, event.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="palette-actions">
              <button type="button" className="prop-btn" data-palette-extract disabled={paletteMappedCount === 0} onClick={extractFromSelection}>
                从当前组件提取
              </button>
              <button type="button" className="prop-btn" data-palette-apply disabled={effectTotal === 0} onClick={applyPalette}>
                应用到全工程 ({effectTotal})
              </button>
            </div>
          </div>
        )}
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
  );
};

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ collapsed = false, onToggle }) => {
  const selectedId = useEditorStore((state) => state.selectedInstanceId);
  const effect = useEditorStore((state) => state.project.effects.find(({ instanceId }) => instanceId === selectedId));
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
          <EffectInspector effect={effect} definition={definition} />
        )}
      </div>
    </aside>
  );
};
