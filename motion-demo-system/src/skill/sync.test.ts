import { describe, expect, it } from 'vitest';
import type { SkillComponentDescriptor, SkillManifestComponent } from './sync';
import {
  buildSkillProposal,
  describeSkillComponent,
  diffComponentSkill,
  summarizeSkillDiff,
} from './sync';

const descriptor = (
  overrides: Partial<SkillComponentDescriptor> = {},
): SkillComponentDescriptor => ({
  id: 't1-01',
  version: 1,
  name: '标题组件',
  category: 'title',
  summary: '用于开场标题',
  suitableFor: ['适合开场'],
  avoidFor: ['不适合正文'],
  content: { contentText: 'text:required:title:"标题"' },
  registered: true,
  ...overrides,
});

const manifestEntry = (
  overrides: Partial<SkillManifestComponent> = {},
): SkillManifestComponent => ({
  id: 't1-01',
  componentVersion: 1,
  name: '标题组件',
  category: 'title',
  selectionSummary: '用于开场标题',
  suitableFor: ['适合开场'],
  avoidFor: ['不适合正文'],
  content: {
    contentText: { type: 'text', required: true, semanticRole: 'title', default: '标题' },
  },
  ...overrides,
});

const manifest = (components: SkillManifestComponent[]) => ({ libraryVersion: 1, components });

const statusOf = (
  descriptors: SkillComponentDescriptor[],
  components: SkillManifestComponent[],
  componentId: string,
) => diffComponentSkill(descriptors, manifest(components))
  .components.find((change) => change.componentId === componentId)?.status;

describe('diffComponentSkill', () => {
  it('reports a source component that is not in the manifest as added', () => {
    expect(statusOf([descriptor()], [], 't1-01')).toBe('added');
  });

  it('reports a manifest entry without a registry component as removed', () => {
    expect(statusOf([], [manifestEntry({ id: 't9-99' })], 't9-99')).toBe('removed');
  });

  it('reports a version bump and a props contract change as changed', () => {
    const bumped = statusOf([descriptor({ version: 2 })], [manifestEntry()], 't1-01');
    expect(bumped).toBe('changed');

    const propsChanged = diffComponentSkill(
      [descriptor({ content: { contentText: 'text:required:title:"标题"', subText: 'text:optional:body:""' } })],
      manifest([manifestEntry()]),
    ).components[0];
    expect(propsChanged.status).toBe('changed');
    expect(propsChanged.changedFields.join(' ')).toContain('content');
  });

  it('reports an identical component as unchanged and ignores key order', () => {
    expect(statusOf([descriptor()], [manifestEntry()], 't1-01')).toBe('unchanged');
    expect(statusOf(
      [descriptor({ content: { a: 'text:required:title:"a"', b: 'text:optional:body:"b"' } })],
      [manifestEntry({ content: {
        b: { type: 'text', required: false, semanticRole: 'body', default: 'b' },
        a: { type: 'text', required: true, semanticRole: 'title', default: 'a' },
      } })],
      't1-01',
    )).toBe('unchanged');
  });

  it('flags a component without reviewed selection metadata as unregistered', () => {
    const change = diffComponentSkill(
      [descriptor({ registered: false, suitableFor: [] })],
      manifest([manifestEntry()]),
    ).components[0];

    expect(change.status).toBe('unregistered');
    expect(change.reason).toBeTruthy();
  });

  it('surfaces only pending AI metadata proposals', () => {
    const diff = diffComponentSkill([descriptor()], manifest([manifestEntry()]), [
      { proposalId: 'p1', componentId: 't1-01', field: 'summary', current: ['旧'], proposed: ['新'], status: 'pending' },
      { proposalId: 'p2', componentId: 't1-01', field: 'avoidFor', current: ['旧'], proposed: ['新'], status: 'rejected' },
      { proposalId: 'p3', componentId: 't1-01', field: 'suitableFor', current: ['旧'], proposed: ['新'], status: 'approved' },
    ]);

    expect(diff.aiProposals.map(({ proposalId }) => proposalId)).toEqual(['p1']);
  });
});

describe('buildSkillProposal', () => {
  const diff = diffComponentSkill(
    [
      descriptor({ id: 'added-1' }),
      descriptor({ id: 'same-1' }),
      descriptor({ id: 'unregistered-1', registered: false, suitableFor: [] }),
      descriptor({ id: 'changed-1', version: 2 }),
    ],
    manifest([manifestEntry({ id: 'same-1' }), manifestEntry({ id: 'changed-1' }), manifestEntry({ id: 'gone-1' })]),
    [{ proposalId: 'p1', componentId: 'added-1', field: 'summary', current: ['旧'], proposed: ['新'], status: 'pending' }],
  );

  it('only carries confirmed components, removals and AI proposals', () => {
    const proposal = buildSkillProposal(diff, {
      componentIds: ['added-1', 'changed-1', 'unregistered-1'],
      removeComponentIds: ['gone-1'],
      aiProposalIds: ['p1'],
    });

    expect(proposal.componentIds).toEqual(['added-1', 'changed-1']);
    expect(proposal.removeComponentIds).toEqual(['gone-1']);
    expect(proposal.aiProposals.map(({ proposalId }) => proposalId)).toEqual(['p1']);
  });

  it('drops everything when nothing is confirmed', () => {
    expect(buildSkillProposal(diff)).toEqual({ componentIds: [], removeComponentIds: [], aiProposals: [] });
    expect(buildSkillProposal(diff, { aiProposalIds: ['p1'] }).aiProposals).toHaveLength(1);
  });
});

describe('summarizeSkillDiff', () => {
  it('counts every status and the pending AI proposals', () => {
    const counts = summarizeSkillDiff(diffComponentSkill(
      [descriptor({ id: 'a' }), descriptor({ id: 'b', registered: false }), descriptor({ id: 'c', version: 2 })],
      manifest([manifestEntry({ id: 'c' }), manifestEntry({ id: 'd' }), manifestEntry({ id: 'e' })]),
      [{ proposalId: 'p1', componentId: 'a', field: 'summary', current: [], proposed: ['x'], status: 'pending' }],
    ));

    expect(counts).toEqual({
      added: 1, changed: 1, unchanged: 0, removed: 2, unregistered: 1, aiProposals: 1,
    });
  });
});

describe('describeSkillComponent', () => {
  it('reduces a registry definition to its agent-editable contract', () => {
    const described = describeSkillComponent({
      id: 't1-01',
      version: 3,
      name: '标题组件',
      category: 'title',
      component: () => null,
      legacyProps: [],
      selection: { summary: 's', suitableFor: ['a'], avoidFor: ['b'], semanticFamilies: ['title'] },
      props: {
        contentText: {
          type: 'text', label: '文本', default: '标题', required: true, role: 'content',
          agentEditable: true, semanticRole: 'title', legacy: { key: 'contentText', label: '文本', kind: 'text', default: '标题' },
        },
        color: {
          type: 'color', label: '颜色', default: '#fff', required: false, role: 'style',
          agentEditable: false, legacy: { key: 'color', label: '颜色', kind: 'color', default: '#fff' },
        },
      },
      layout: { roles: ['title'], preferredZones: ['auto'], footprint: { width: 100, height: 40 }, exclusive: false },
    });

    expect(described).toMatchObject({
      id: 't1-01',
      version: 3,
      registered: true,
      content: { contentText: 'text:required:title:"标题"' },
    });
  });
});
