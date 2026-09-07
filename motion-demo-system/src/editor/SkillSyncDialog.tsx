import React, { useEffect, useState } from 'react';
import { pickDirectory, type NativeBridge } from '../tauri/bridge';
import {
  buildSkillProposal,
  summarizeSkillDiff,
  type ComponentSkillDiff,
  type SkillAiProposal,
  type SkillComponentChange,
  type SkillComponentStatus,
} from '../skill/sync';

export interface SkillSyncDialogProps {
  open: boolean;
  onClose: () => void;
  diff: ComponentSkillDiff | null;
  bridge: NativeBridge | null;
  onApplied?: () => void;
}

const STATUS_LABEL: Record<SkillComponentStatus, string> = {
  added: '新增',
  changed: '变更',
  removed: '移除',
  unregistered: '未注册（缺少审核元数据）',
  unchanged: '无变化',
};

const STATUS_ORDER: SkillComponentStatus[] = ['added', 'changed', 'removed', 'unregistered', 'unchanged'];

const describeChange = (change: SkillComponentChange): string => {
  if (change.status === 'changed') return `v${change.previousVersion} → v${change.version} · ${change.changedFields.join('、')}`;
  if (change.status === 'added') return `v${change.version} · 首次进入组件 Skill`;
  if (change.status === 'removed') return `v${change.version} · 注册表中已不存在`;
  if (change.status === 'unregistered') return change.reason ?? '';
  return `v${change.version}`;
};

const aiFieldLabel = (field: SkillAiProposal['field']): string => (
  field === 'summary' ? '简介' : field === 'suitableFor' ? '适用场景' : '不适用描述'
);

/** Builds the initial selection: safe additions/updates are pre-checked, removals and AI proposals never are. */
export function initialSkillSelection(diff: ComponentSkillDiff): {
  componentIds: string[];
  removeComponentIds: string[];
  aiProposalIds: string[];
} {
  return {
    componentIds: diff.components
      .filter((change) => change.status === 'added' || change.status === 'changed')
      .map((change) => change.componentId),
    removeComponentIds: [],
    aiProposalIds: [],
  };
}

export const SkillSyncDialog: React.FC<SkillSyncDialogProps> = ({
  open,
  onClose,
  diff,
  bridge,
  onApplied,
}) => {
  const [selection, setSelection] = useState(() => (diff ? initialSkillSelection(diff) : {
    componentIds: [], removeComponentIds: [], aiProposalIds: [],
  }));
  const [editedProposals, setEditedProposals] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [status, setStatus] = useState('');
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [keyState, setKeyState] = useState<'unknown' | 'missing' | 'present' | 'saving' | 'saved' | 'error'>('unknown');
  const [keyMessage, setKeyMessage] = useState('');

  useEffect(() => {
    if (!open || !bridge) return;
    let active = true;
    void bridge.hasApiKey()
      .then((present) => { if (active) setKeyState(present ? 'present' : 'missing'); })
      .catch(() => { if (active) setKeyState('unknown'); });
    return () => { active = false; };
  }, [open, bridge]);

  const saveKey = async () => {
    if (!bridge || apiKeyDraft.trim().length === 0) return;
    setKeyState('saving');
    setKeyMessage('');
    try {
      await bridge.saveApiKey(apiKeyDraft.trim());
      setApiKeyDraft('');
      setKeyState('saved');
      setKeyMessage('已写入系统凭据管理器，界面不再保留明文。');
    } catch (error) {
      setKeyState('error');
      setKeyMessage(error instanceof Error ? error.message : '保存失败');
    }
  };

  const exportSkill = async () => {
    if (!bridge) return;
    const destination = await pickDirectory('选择组件 Skill 导出目录');
    if (!destination) return;
    setPhase('running');
    setStatus('正在导出 Skill…');
    try {
      const count = await bridge.exportComponentSkill(destination);
      setPhase('done');
      setStatus(`已导出 ${count} 个文件到 ${destination}`);
    } catch (error) {
      setPhase('error');
      setStatus(`导出失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  if (!open) return null;

  const counts = diff ? summarizeSkillDiff(diff) : null;

  const toggle = (key: 'componentIds' | 'removeComponentIds' | 'aiProposalIds', id: string) => {
    setSelection((previous) => {
      const current = new Set(previous[key]);
      if (current.has(id)) current.delete(id);
      else current.add(id);
      return { ...previous, [key]: [...current] };
    });
  };

  const apply = async () => {
    if (!bridge || !diff || phase === 'running') return;
    const proposal = buildSkillProposal(diff, selection);
    const withEdits = {
      ...proposal,
      aiProposals: proposal.aiProposals.map((item) => ({
        ...item,
        proposed: (editedProposals[item.proposalId] ?? item.proposed.join('；')).split('；').map((part) => part.trim()).filter(Boolean),
      })),
    };
    setPhase('running');
    setStatus('正在应用：写入临时文件 → 校验 → 原子替换…');
    try {
      await bridge.applyComponentSkill(withEdits);
      setPhase('done');
      setStatus(`已应用 ${withEdits.componentIds.length} 个组件、${withEdits.removeComponentIds.length} 项移除、${withEdits.aiProposals.length} 条元数据建议。`);
      onApplied?.();
    } catch (error) {
      setPhase('error');
      setStatus(`应用失败，已保留原有生成产物：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const groups = STATUS_ORDER
    .map((status) => ({ status, items: diff?.components.filter((change) => change.status === status) ?? [] }))
    .filter(({ items }) => items.length > 0);

  return (
    <div className="dialog-overlay" data-skill-sync-dialog>
      <div className="dialog-panel" role="dialog" aria-label="同步组件 Skill">
        <header className="dialog-header">
          <strong>同步组件 Skill</strong>
          <button type="button" className="dialog-close" aria-label="关闭同步组件 Skill" onClick={onClose}>×</button>
        </header>
        <div className="dialog-body">
          {!diff && <p className="dialog-warning" role="status">正在扫描组件 Skill 差异…</p>}
          {diff && counts && (
            <>
              <p className="dialog-meta" data-skill-sync-meta>
                组件库版本 {diff.libraryVersion} · 新增 {counts.added} · 变更 {counts.changed} · 移除 {counts.removed} · 未注册 {counts.unregistered} · 无变化 {counts.unchanged}
              </p>
              {!bridge && (
                <p className="dialog-warning" role="status">
                  当前为浏览器模式，无法写入本地 Skill 文件；桌面端（Tauri）下可应用变更。
                </p>
              )}
              <div className="skill-sync-groups">
                {groups.map(({ status, items }) => (
                  <section key={status} className="skill-sync-group" data-skill-group={status}>
                    <h4>{STATUS_LABEL[status]}（{items.length}）</h4>
                    {items.map((change) => {
                      const removable = change.status === 'removed';
                      const locked = change.status === 'unregistered' || change.status === 'unchanged';
                      const key = removable ? 'removeComponentIds' : 'componentIds';
                      const checked = locked
                        ? false
                        : (selection[key] ?? []).includes(change.componentId);
                      return (
                        <label key={change.componentId} className="skill-sync-item">
                          <input
                            type="checkbox"
                            disabled={locked}
                            checked={checked}
                            onChange={() => toggle(key, change.componentId)}
                          />
                          <span>
                            <strong>{change.componentId}</strong> {change.name}
                            <em>{describeChange(change)}</em>
                          </span>
                        </label>
                      );
                    })}
                  </section>
                ))}
                {diff.aiProposals.length > 0 && (
                  <section className="skill-sync-group" data-skill-group="ai">
                    <h4>AI 元数据建议（{diff.aiProposals.length}）· 默认不勾选</h4>
                    {diff.aiProposals.map((item) => (
                      <label key={item.proposalId} className="skill-sync-item">
                        <input
                          type="checkbox"
                          checked={selection.aiProposalIds.includes(item.proposalId)}
                          onChange={() => toggle('aiProposalIds', item.proposalId)}
                        />
                        <span>
                          <strong>{item.componentId}</strong> {aiFieldLabel(item.field)}
                          <input
                            className="skill-sync-edit"
                            value={editedProposals[item.proposalId] ?? item.proposed.join('；')}
                            aria-label={`编辑 ${item.componentId} 的${aiFieldLabel(item.field)}建议`}
                            onChange={(event) => setEditedProposals((previous) => ({ ...previous, [item.proposalId]: event.target.value }))}
                          />
                        </span>
                      </label>
                    ))}
                  </section>
                )}
              </div>
            </>
          )}
          {status && <pre className={`dialog-status ${phase}`} role="status" data-skill-sync-status>{status}</pre>}

          {bridge && (
            <section className="skill-sync-key" data-skill-sync-key>
              <h4>模型 API Key</h4>
              <p className="dialog-meta">
                仅保存在系统凭据管理器（Windows 凭据管理器），界面只显示是否已配置，永远不会写入工程文件或 Skill 产物。
              </p>
              <div className="skill-sync-key-row">
                <input
                  type="password"
                  autoComplete="off"
                  aria-label="模型 API Key"
                  placeholder={keyState === 'present' ? '已配置（输入新的 Key 可覆盖）' : '粘贴 OpenAI 兼容 API Key'}
                  value={apiKeyDraft}
                  onChange={(event) => setApiKeyDraft(event.target.value)}
                />
                <button
                  type="button"
                  aria-label="保存模型 API Key"
                  disabled={keyState === 'saving' || apiKeyDraft.trim().length === 0}
                  onClick={() => void saveKey()}
                >
                  {keyState === 'saving' ? '保存中…' : '保存'}
                </button>
              </div>
              {keyMessage && <p className="dialog-meta" role="status" data-skill-sync-key-status>{keyMessage}</p>}
            </section>
          )}
        </div>
        <footer className="dialog-actions">
          <button
            type="button"
            aria-label="导出组件 Skill"
            disabled={!bridge || phase === 'running'}
            onClick={() => void exportSkill()}
          >
            导出 Skill…
          </button>
          <button
            type="button"
            aria-label="应用组件 Skill 变更"
            disabled={!bridge || !diff || phase === 'running'}
            onClick={() => void apply()}
          >
            {phase === 'running' ? '应用中…' : '应用变更'}
          </button>
        </footer>
      </div>
    </div>
  );
};
