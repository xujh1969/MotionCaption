import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ComponentSkillDiff } from '../skill/sync';
import { SkillSyncDialog, initialSkillSelection } from './SkillSyncDialog';

const diff: ComponentSkillDiff = {
  libraryVersion: 1,
  components: [
    { componentId: 't1-01', name: '标题组件', status: 'added', version: 1, changedFields: [] },
    { componentId: 't2-01', name: '卡片组件', status: 'changed', version: 2, previousVersion: 1, changedFields: ['version'] },
    { componentId: 't9-99', name: '旧组件', status: 'removed', version: 1, changedFields: [] },
    { componentId: 't8-01', name: '未审核组件', status: 'unregistered', version: 1, changedFields: [], reason: '缺少审核过的组件选择元数据' },
    { componentId: 't3-01', name: '稳定组件', status: 'unchanged', version: 1, changedFields: [] },
  ],
  aiProposals: [{
    proposalId: 'p1', componentId: 't1-01', field: 'summary',
    current: ['旧简介'], proposed: ['新简介'], status: 'pending',
  }],
};

const renderDialog = (bridge: unknown = null) => renderToStaticMarkup(
  React.createElement(SkillSyncDialog, {
    open: true, diff, bridge: bridge as never, onClose: () => {},
  }),
);

const checkboxes = (markup: string): string[] => markup.match(/<input type="checkbox"[^>]*>/g) ?? [];

describe('SkillSyncDialog', () => {
  it('groups every change status and lists AI proposals separately', () => {
    const markup = renderDialog();

    expect(markup).toContain('data-skill-group="added"');
    expect(markup).toContain('data-skill-group="changed"');
    expect(markup).toContain('data-skill-group="removed"');
    expect(markup).toContain('data-skill-group="unregistered"');
    expect(markup).toContain('data-skill-group="unchanged"');
    expect(markup).toContain('data-skill-group="ai"');
    expect(markup).toContain('默认不勾选');
  });

  it('pre-checks registry changes but never AI proposals or unregistered components', () => {
    const boxes = checkboxes(renderDialog());

    expect(boxes).toHaveLength(6); // 5 components + 1 AI proposal
    expect(boxes.filter((box) => box.includes('checked=""'))).toHaveLength(2); // added + changed
    expect(boxes.filter((box) => box.includes('disabled=""'))).toHaveLength(2); // unregistered + unchanged
  });

  it('disables applying when there is no native bridge', () => {
    const applyButton = renderDialog().match(/<button[^>]*aria-label="应用组件 Skill 变更"[^>]*>/)?.[0] ?? '';

    expect(applyButton).toContain('disabled=""');
  });

  it('summarizes counts in the header', () => {
    expect(renderDialog()).toContain('新增 1 · 变更 1 · 移除 1 · 未注册 1 · 无变化 1');
  });

  it('hides the API Key section and disables export outside the desktop shell', () => {
    const markup = renderDialog();

    expect(markup).not.toContain('data-skill-sync-key');
    const exportButton = markup.match(/<button[^>]*aria-label="导出组件 Skill"[^>]*>/)?.[0] ?? '';
    expect(exportButton).toContain('disabled=""');
  });

  it('offers a masked key input and an export action inside the desktop shell', () => {
    const bridge = {
      saveApiKey: async () => {},
      hasApiKey: async () => true,
      completeOpenAiCompatible: async () => '',
      scanComponentSkill: async () => diff,
      applyComponentSkill: async () => {},
      exportComponentSkill: async () => 3,
    };
    const markup = renderDialog(bridge);

    expect(markup).toContain('data-skill-sync-key');
    expect(markup).toContain('type="password"');
    expect(markup).toContain('aria-label="保存模型 API Key"');
    expect(markup).toContain('aria-label="导出组件 Skill"');
    expect(markup).not.toContain('sk-');
  });
});

describe('initialSkillSelection', () => {
  it('selects added and changed components only, never removals or AI proposals', () => {
    expect(initialSkillSelection(diff)).toEqual({
      componentIds: ['t1-01', 't2-01'],
      removeComponentIds: [],
      aiProposalIds: [],
    });
  });
});
