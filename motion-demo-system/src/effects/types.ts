import type React from 'react';
import type { PropDef } from '../remotion/config';

export type PropRole = 'content' | 'style' | 'layout';
export type SemanticRole = 'title' | 'body' | 'label' | 'metric' | 'items';
export type PlacementPreset =
  | 'auto'
  | 'left-top'
  | 'left-center'
  | 'left-bottom'
  | 'right-top'
  | 'right-center'
  | 'right-bottom'
  | 'full-width';

export interface ComponentDef {
  id: string;
  name: string;
  category: string;
  component: React.FC;
}

export interface EffectPropDefinition {
  type: 'text' | 'number' | 'color' | 'list';
  label: string;
  default: unknown;
  required: boolean;
  role: PropRole;
  agentEditable: boolean;
  semanticRole?: SemanticRole;
  /** Reviewed list-item content keys. Omitted list-item keys remain locked. */
  agentEditableItemFields?: string[];
  min?: number;
  max?: number;
  /** Compatibility metadata for the frozen property-panel controls. */
  legacy: PropDef;
}

export interface EffectDefinition {
  id: string;
  version: number;
  name: string;
  category: string;
  component: React.FC;
  /** Ordered legacy descriptors; preserves duplicate keys until the panel protocol migrates. */
  legacyProps: PropDef[];
  selection: {
    summary: string;
    suitableFor: string[];
    avoidFor: string[];
    semanticFamilies: string[];
    minItems?: number;
    maxItems?: number;
  };
  props: Record<string, EffectPropDefinition>;
  layout: {
    roles: string[];
    preferredZones: PlacementPreset[];
    footprint: { width: number; height: number };
    exclusive: boolean;
  };
}

export type SelectionDraft = EffectDefinition['selection'] & {
  contentRoles?: Partial<Record<string, SemanticRole>>;
};
