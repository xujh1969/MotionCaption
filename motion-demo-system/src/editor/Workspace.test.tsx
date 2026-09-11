import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { effectRegistry } from '../effects/registry';
import { useEditorStore } from '../store/editorStore';
import {
  addComponentAtCurrentFrame,
  addComponentWithFeedback,
  ComponentLibrary,
  groupEffectDefinitions,
} from './ComponentLibrary';
import { InspectorPanel, inspectorDefinitions } from './InspectorPanel';
import { Toolbar } from './Toolbar';

describe('unified workspace panels', () => {
  it('groups all 61 registry entries with inline category separators', () => {
    const groups = groupEffectDefinitions(effectRegistry.list(), '');

    expect(groups.flatMap(({ definitions }) => definitions)).toHaveLength(62);
    expect(groups.map(({ label }) => label)).toEqual([
      '零、特效FX',
      '一、极简纯文字+细线条',
      '二、光晕阴影卡片风格',
      '三、数据展示',
      '四、流程轨道进度',
      '五、列表条目清单',
      '六、时间线·流向·轨道',
      '七、迷你图表可视化',
    ]);
  });

  it('keeps only category groups containing search matches', () => {
    const groups = groupEffectDefinitions(effectRegistry.list(), 't7-06');

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      id: 'mini-chart',
      label: '七、迷你图表可视化',
    });
    expect(groups[0].definitions.map(({ id }) => id)).toEqual(['t7-06']);
  });

  it('adds one component at the current frame and selects the new instance', () => {
    useEditorStore.getState().replaceEffects([]);
    useEditorStore.getState().setCurrentFrame(10);
    const addEffect = vi.fn(useEditorStore.getState().addEffect);
    const activate = () => addComponentAtCurrentFrame('t1-01', addEffect);

    useEditorStore.getState().setCurrentFrame(42);
    const instanceId = activate();

    expect(addEffect).toHaveBeenCalledTimes(1);
    expect(addEffect).toHaveBeenCalledWith('t1-01', 42);
    expect(useEditorStore.getState().project.effects).toHaveLength(1);
    expect(useEditorStore.getState().project.effects[0]).toMatchObject({ instanceId, startFrame: 42 });
    expect(useEditorStore.getState().selectedInstanceId).toBe(instanceId);
    useEditorStore.getState().replaceEffects([]);
  });

  it('surfaces a full-track add failure instead of letting it escape the component action', () => {
    const reportError = vi.fn();
    const addEffect = () => { throw new Error('No timeline track is available.'); };

    expect(addComponentWithFeedback('t1-01', reportError, addEffect)).toBeNull();
    expect(reportError).toHaveBeenCalledWith('No timeline track is available.');
  });

  it('renders dense action items without the old picker, preview, description, or add button', () => {
    const markup = renderToStaticMarkup(<ComponentLibrary />);
    const componentItems = markup.match(/data-component-id=/g) ?? [];

    expect(componentItems).toHaveLength(62);
    expect(markup).toContain('data-category-id="text-line"');
    expect(markup).toContain('placeholder="名称或编号"');
    expect(markup).not.toContain('<select');
    expect(markup).not.toContain('添加到当前时间');
    expect(markup).not.toContain('data-selected-component');
    expect(markup).not.toContain('规划范围');
    expect(markup.split(effectRegistry.get('t1-01').selection.summary)).toHaveLength(2);
  });

  it('renders only registry-declared agent-editable content fields in the inspector', () => {
    const definition = effectRegistry.get('t1-01');
    const fields = inspectorDefinitions(definition);

    expect(fields.length).toBeGreaterThan(0);
    expect(fields.every(([, field]) => field.agentEditable && field.role === 'content')).toBe(true);
    expect(renderToStaticMarkup(<InspectorPanel />)).toContain('未选择组件');
  });

  it('exposes project actions and preview backgrounds without editor/lab navigation', () => {
    const markup = renderToStaticMarkup(<Toolbar
      videoName={null}
      onLoadVideo={() => undefined}
      onOpenProject={() => undefined}
      onSaveProject={() => undefined}
      onExportStyleDefaults={() => undefined}
      onImportAgent={() => undefined}
    />);

    expect(markup).toContain('载入视频');
    expect(markup).toContain('导入 Agent JSON');
    // 编排改由外部 Agent + Skill 完成，工具栏不再提供应用内 AI 入口
    expect(markup).not.toContain('AI 编排');
    expect(markup).toContain('棋盘');
    expect(markup).toContain('toolbar-brand');
    expect(markup).toContain('MotionCaption');
    // 版本号来自 package.json（vite define 注入），格式固定为 vX.Y.Z
    expect(markup).toMatch(/>v\d+\.\d+\.\d+</);
    // 「同步组件 Skill」入口暂时隐藏（Toolbar 的 SHOW_SKILL_SYNC = false）
    expect(markup).not.toContain('同步组件 Skill');
    expect(markup).not.toContain('空工程 · 无参考视频');
    expect(markup).not.toContain('组件实验室');
  });
});
