import type { EffectDefinition } from '../effects/types';

export type SkillComponentStatus = 'added' | 'removed' | 'changed' | 'unchanged' | 'unregistered';

export type SkillMetadataField = 'summary' | 'suitableFor' | 'avoidFor';

export type SkillAiProposalStatus = 'pending' | 'approved' | 'rejected';

export interface SkillAiProposal {
  proposalId: string;
  componentId: string;
  field: SkillMetadataField;
  current: string[];
  proposed: string[];
  status: SkillAiProposalStatus;
  note?: string;
}

/** Flattened, serializable view of one registered component for skill diffing. */
export interface SkillComponentDescriptor {
  id: string;
  version: number;
  name: string;
  category: string;
  summary: string;
  suitableFor: string[];
  avoidFor: string[];
  /** Signature of the Agent-editable content contract, keyed by prop name. */
  content: Record<string, string>;
  /** A component without reviewed selection metadata cannot enter the skill yet. */
  registered: boolean;
}

export interface SkillManifestComponent {
  id: string;
  componentVersion: number;
  name: string;
  category: string;
  selectionSummary: string;
  suitableFor: string[];
  avoidFor: string[];
  content: Record<string, unknown>;
}

export interface ComponentManifest {
  libraryVersion: number;
  components: SkillManifestComponent[];
}

export interface SkillComponentChange {
  componentId: string;
  name: string;
  status: SkillComponentStatus;
  version: number;
  previousVersion?: number;
  changedFields: string[];
  reason?: string;
}

export interface ComponentSkillDiff {
  libraryVersion: number;
  components: SkillComponentChange[];
  /** Only unreviewed proposals reach the UI; approved and rejected ones do not. */
  aiProposals: SkillAiProposal[];
}

export interface ApprovedSkillProposal {
  componentIds: string[];
  removeComponentIds: string[];
  aiProposals: SkillAiProposal[];
}

const compareText = (left: string, right: string): number => left.localeCompare(right, 'en');
const sortedEntries = (record: Record<string, unknown>): Array<[string, unknown]> => Object
  .entries(record)
  .sort(([left], [right]) => compareText(left, right));

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${sortedEntries(value as Record<string, unknown>)
      .map(([key, child]) => `${key}:${stableStringify(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
};

const listText = (values: readonly string[]): string => values.join('|');

/** Deterministic signature of the Agent-editable content contract. */
export function contentSignature(content: Record<string, unknown>): string {
  return stableStringify(Object.fromEntries(sortedEntries(content)));
}

export function describeSkillComponent(definition: EffectDefinition): SkillComponentDescriptor {
  const content = Object.fromEntries(
    Object.entries(definition.props)
      .filter(([, prop]) => prop.agentEditable)
      .map(([key, prop]) => [key, [
        prop.type,
        prop.required ? 'required' : 'optional',
        prop.semanticRole ?? '-',
        stableStringify(prop.default),
      ].join(':')]),
  );
  return {
    id: definition.id,
    version: definition.version,
    name: definition.name,
    category: definition.category,
    summary: definition.selection.summary,
    suitableFor: definition.selection.suitableFor,
    avoidFor: definition.selection.avoidFor,
    content,
    registered: definition.selection.suitableFor.length > 0 && definition.selection.avoidFor.length > 0,
  };
}

const changedFieldsOf = (
  descriptor: SkillComponentDescriptor,
  manifestEntry: SkillManifestComponent,
): string[] => {
  const changed: string[] = [];
  if (descriptor.version !== manifestEntry.componentVersion) changed.push('version');
  const manifestContent = Object.fromEntries(
    Object.entries(manifestEntry.content).map(([key, prop]) => {
      const source = (prop ?? {}) as Record<string, unknown>;
      return [key, [
        source.type ?? '-',
        source.required ? 'required' : 'optional',
        source.semanticRole ?? '-',
        stableStringify(source.default ?? null),
      ].join(':')];
    }),
  );
  const registryKeys = Object.keys(descriptor.content).sort(compareText);
  const manifestKeys = Object.keys(manifestContent).sort(compareText);
  const keyDiff = [
    ...registryKeys.filter((key) => !manifestKeys.includes(key)),
    ...manifestKeys.filter((key) => !registryKeys.includes(key)),
  ].sort(compareText);
  if (keyDiff.length) changed.push(`content:${keyDiff.join(',')}`);
  else if (contentSignature(descriptor.content) !== contentSignature(manifestContent)) {
    changed.push('content');
  }
  const metadataChanged = descriptor.summary !== manifestEntry.selectionSummary
    || listText(descriptor.suitableFor) !== listText(manifestEntry.suitableFor ?? [])
    || listText(descriptor.avoidFor) !== listText(manifestEntry.avoidFor ?? []);
  if (metadataChanged) changed.push('selection');
  return changed;
};

export function diffComponentSkill(
  descriptors: readonly SkillComponentDescriptor[],
  manifest: ComponentManifest | null,
  aiProposals: readonly SkillAiProposal[] = [],
): ComponentSkillDiff {
  const entries = new Map((manifest?.components ?? []).map((component) => [component.id, component]));
  const components: SkillComponentChange[] = descriptors.map((descriptor) => {
    const entry = entries.get(descriptor.id);
    if (!descriptor.registered) {
      return {
        componentId: descriptor.id,
        name: descriptor.name,
        status: 'unregistered',
        version: descriptor.version,
        changedFields: [],
        reason: '缺少审核过的组件选择元数据（suitableFor / avoidFor）',
      };
    }
    if (!entry) {
      return {
        componentId: descriptor.id,
        name: descriptor.name,
        status: 'added',
        version: descriptor.version,
        changedFields: [],
      };
    }
    const changedFields = changedFieldsOf(descriptor, entry);
    return {
      componentId: descriptor.id,
      name: descriptor.name,
      status: changedFields.length ? 'changed' : 'unchanged',
      version: descriptor.version,
      previousVersion: entry.componentVersion,
      changedFields,
    };
  });

  for (const [id, entry] of entries) {
    if (descriptors.some((descriptor) => descriptor.id === id)) continue;
    components.push({
      componentId: id,
      name: entry.name,
      status: 'removed',
      version: entry.componentVersion,
      changedFields: [],
    });
  }

  components.sort((left, right) => compareText(left.componentId, right.componentId));

  return {
    libraryVersion: manifest?.libraryVersion ?? 1,
    components,
    aiProposals: aiProposals
      .filter((proposal) => proposal.status === 'pending')
      .map((proposal) => ({ ...proposal }))
      .sort((left, right) => compareText(left.componentId, right.componentId)
        || compareText(left.field, right.field)),
  };
}

export function summarizeSkillDiff(diff: ComponentSkillDiff): Record<SkillComponentStatus, number> & { aiProposals: number } {
  const counts = { added: 0, removed: 0, changed: 0, unchanged: 0, unregistered: 0, aiProposals: diff.aiProposals.length };
  for (const change of diff.components) counts[change.status] += 1;
  return counts;
}

export interface SkillSyncSelection {
  componentIds?: readonly string[];
  removeComponentIds?: readonly string[];
  aiProposalIds?: readonly string[];
}

/**
 * Builds the payload that the native side is allowed to apply. Nothing outside
 * the confirmed selection reaches the proposal, so an unchecked AI suggestion
 * or an unregistered component can never be written into the generated skill.
 */
export function buildSkillProposal(
  diff: ComponentSkillDiff,
  selection: SkillSyncSelection = {},
): ApprovedSkillProposal {
  const confirmed = new Set(selection.componentIds ?? []);
  const confirmedRemovals = new Set(selection.removeComponentIds ?? []);
  const confirmedProposals = new Set(selection.aiProposalIds ?? []);

  return {
    componentIds: diff.components
      .filter((change) => change.status !== 'unregistered'
        && change.status !== 'removed'
        && confirmed.has(change.componentId))
      .map((change) => change.componentId),
    removeComponentIds: diff.components
      .filter((change) => change.status === 'removed' && confirmedRemovals.has(change.componentId))
      .map((change) => change.componentId),
    aiProposals: diff.aiProposals
      .filter((proposal) => proposal.status === 'pending' && confirmedProposals.has(proposal.proposalId))
      .map((proposal) => ({ ...proposal })),
  };
}
