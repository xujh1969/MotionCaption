import React, { useEffect, useMemo, useState } from 'react';
import type { ConfigState, ListField, PropDef } from '../remotion/config';
import { alphaOf, hexOf, withAlpha } from '../remotion/components/shared';
import { effectRegistry } from '../effects/registry';
import { toLegacyPropDefs } from '../effects/legacyAdapter';

interface Props {
  componentId: string;
  config: ConfigState;
  onChange: (key: string, value: number | string) => void;
  /** 嵌入到统一编辑器属性面板时隐藏自带标题栏，并去掉浮层定位 */
  embedded?: boolean;
  /** 由宿主接管的属性（例如统一编辑器用 transform 管理 posX/posY/scale） */
  hiddenKeys?: readonly string[];
  onReset?: () => void;
  onClose?: () => void;
}

// 解析 list 条目：接受 JSON 字符串或数组，出错时返回空数组
const parseList = (raw: unknown): Record<string, string>[] => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j)) return j;
    } catch {
      /* 忽略解析错误 */
    }
  }
  return [];
};

const COLOR_PALETTE = [
  '#4CC9F0', '#F72585', '#06D6A0', '#C77DFF',
  '#FFFFFF', '#E6E6E6', '#9AA7C4', '#0A0F1E',
  '#3B82F6', '#F59E0B', '#10B981', '#EF4444',
];

export const panelDefinitionsFor = (componentId: string): PropDef[] => {
  try {
    return toLegacyPropDefs(effectRegistry.get(componentId));
  } catch {
    return [];
  }
};

const ColorPopover: React.FC<{
  value: string;
  anchor: HTMLElement;
  onChange: (v: string) => void;
  onClose: () => void;
}> = ({ value, anchor, onChange, onClose }) => {
  const rect = anchor.getBoundingClientRect();
  const top = Math.min(rect.bottom + 6, window.innerHeight - 200);
  const isHex = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <div className="prop-pop" style={{ left: rect.left, top }}>
      <div className="prop-pop-caption">常用颜色</div>
      <div className="prop-pop-grid">
        {COLOR_PALETTE.map((c) => (
          <button
            type="button"
            key={c}
            className="prop-pop-swatch"
            style={{ background: c }}
            title={c}
            onClick={() => { onChange(c); onClose(); }}
          />
        ))}
      </div>
      <div className="prop-pop-free">
        <span>自由选择</span>
        <input
          type="color"
          value={isHex ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
};

/* 数字控件：滑杆 + 数字输入（聚焦后支持滚轮微调） */
const NumField: React.FC<{
  d: PropDef;
  value: number | string;
  onChange: (v: number) => void;
}> = ({ d, value, onChange }) => {
  const [focus, setFocus] = useState(false);
  const setNum = (raw: string) => {
    let v = Number(raw);
    if (Number.isNaN(v)) v = d.default as number;
    if (d.min !== undefined) v = Math.max(d.min, v);
    if (d.max !== undefined) v = Math.min(d.max, v);
    onChange(v);
  };
  const onWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (!focus) return;
    e.preventDefault();
    const step = d.step ?? 1;
    const delta = e.deltaY > 0 ? -step : step;
    let v = Number(value ?? d.default) + delta;
    if (d.min !== undefined) v = Math.max(d.min, v);
    if (d.max !== undefined) v = Math.min(d.max, v);
    onChange(Math.round(v * 100) / 100);
  };
  return (
    <div className="prop-num">
      <input
        type="range"
        min={d.min}
        max={d.max}
        step={d.step ?? 1}
        value={value as number}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <input
        type="number"
        className="prop-numval"
        value={value as number}
        min={d.min}
        max={d.max}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onWheel={onWheel}
        onChange={(e) => setNum(e.target.value)}
      />
      {d.unit && <span className="prop-unit">{d.unit}</span>}
    </div>
  );
};

/* 颜色控件：色块 + hex 输入(仅#RRGGBB) + 透明度(滚轮) 排成一行 */
const ColorField: React.FC<{
  cid: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  open: boolean;
  anchor: HTMLElement | null;
  onToggle: (id: string, anchor: HTMLElement) => void;
  onClose: () => void;
}> = ({ cid, label, value, onChange, open, anchor, onToggle, onClose }) => {
  const [txt, setTxt] = useState(hexOf(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => { setTxt(hexOf(value)); }, [value]);
  const alpha = Math.round(alphaOf(value) * 100);
  const setAlpha = (a: number) => {
    const v = Math.max(0, Math.min(100, Math.round(a)));
    onChange(withAlpha(hexOf(value), v / 100));
  };
  const onHex = (raw: string) => {
    setTxt(raw);
    if (/^#[0-9a-f]{6}$/i.test(raw) || /^#[0-9a-f]{3}$/i.test(raw)) {
      onChange(withAlpha(raw, alpha / 100));
    }
  };
  return (
    <div className="prop-color">
      <button
        type="button"
        className="prop-swatch"
        style={{ background: value }}
        onClick={(e) => onToggle(cid, e.currentTarget)}
        title="打开/选择常用颜色"
      />
      <div className="prop-hex-col">
        <span className="prop-color-label">{label}</span>
        <input
          type="text"
          value={txt}
          onChange={(e) => onHex(e.target.value)}
          onBlur={() => setTxt(hexOf(value))}
          spellCheck={false}
          placeholder="#RRGGBB"
        />
      </div>
      <div className="prop-alpha">
        <span className="prop-alpha-label">透明度</span>
        <div className="prop-alpha-row">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={alpha}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            onWheel={(e) => {
              if (!focus) return;
              e.preventDefault();
              setAlpha(alpha + (e.deltaY > 0 ? -1 : 1));
            }}
            onChange={(e) => setAlpha(Number(e.target.value))}
            title="透明度（聚焦后可用滚轮调整）"
          />
          <span>%</span>
        </div>
      </div>
      {open && anchor && (
        <ColorPopover value={value} anchor={anchor} onChange={onChange} onClose={onClose} />
      )}
    </div>
  );
};

export const PropertyPanel: React.FC<Props> = (
  { componentId, config, onChange, embedded = false, hiddenKeys, onReset, onClose },
) => {
  const hidden = useMemo(() => new Set(hiddenKeys ?? []), [hiddenKeys]);
  const defs = useMemo(
    () => panelDefinitionsFor(componentId).filter((d) => !hidden.has(d.key)),
    [componentId, hidden],
  );
  const [openColor, setOpenColor] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [openT, setOpenT] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!openColor) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.prop-pop')) setOpenColor(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openColor]);

  // 所有被文本引用的字号/颜色 key → 一级面板隐藏，仅通过 T 展开显示
  const secondaryKeys = useMemo(() => {
    const s = new Set<string>();
    for (const d of defs) {
      if (d.kind === 'text') {
        if (d.sizeKey) s.add(d.sizeKey);
        if (d.colorKey) s.add(d.colorKey);
        if (d.hlColorKey) s.add(d.hlColorKey);
        if (d.hlSizeKey) s.add(d.hlSizeKey);
      }
      if (d.kind === 'list') {
        for (const f of d.listFields ?? []) {
          if (f.sizeKey) s.add(f.sizeKey);
          if (f.colorKey) s.add(f.colorKey);
        }
      }
    }
    return s;
  }, [defs]);

  const defByKey = useMemo(() => {
    const m: Record<string, PropDef> = {};
    for (const d of defs) m[d.key] = d;
    return m;
  }, [defs]);

  const toggleColor = (id: string, anchor: HTMLElement) => {
    setOpenColor(openColor?.id === id ? null : { id, anchor });
  };

  const toggleT = (id: string) => {
    setOpenT((o) => ({ ...o, [id]: !o[id] }));
  };

  // 更新某条目某字段
  const setListField = (d: PropDef, i: number, field: ListField, value: string) => {
    const arr = parseList(config[d.key] ?? d.default);
    const item = { ...(arr[i] ?? {}), [field.key]: value };
    const next = [...arr];
    next[i] = item;
    onChange(d.key, JSON.stringify(next));
  };

  // 添加到条目末尾
  const addListItem = (d: PropDef) => {
    const arr = parseList(config[d.key] ?? d.default);
    const item: Record<string, string> = {};
    (d.listFields ?? []).forEach((f) => { item[f.key] = f.default ?? ''; });
    onChange(d.key, JSON.stringify([...arr, item]));
  };

  // 删除条目
  const delListItem = (d: PropDef, i: number) => {
    const arr = parseList(config[d.key] ?? d.default);
    onChange(d.key, JSON.stringify(arr.filter((_, idx) => idx !== i)));
  };

  return (
    <div className={embedded ? 'prop-panel embedded' : 'prop-panel'}>
      {!embedded && (
        <div className="prop-head">
          <div className="prop-head-row">
            <span className="prop-title">属性设置</span>
            {onClose && (
              <button className="prop-close" onClick={onClose} title="收起属性面板">×</button>
            )}
          </div>
          <span className="prop-hint">文本旁的 T 可展开字号与颜色 · 数字/透明度聚焦后滚动鼠标微调</span>
          {(onReset || onClose) && (
            <div className="prop-tools">
              {onReset && <button className="prop-reset" onClick={onReset}>重置默认</button>}
            </div>
          )}
        </div>
      )}
      {defs.length === 0 ? (
        <div className="prop-empty">该组件暂无可调属性</div>
      ) : (
        <div className="prop-scroll">
          {defs.map((d) => {
            if (secondaryKeys.has(d.key)) return null; // 二级属性：仅由文本 T 展开
            const val = config[d.key] ?? d.default;
            const key = d.key.includes('::') ? d.key.split('::').pop()! : d.key;
            const items = d.kind === 'list' ? parseList(config[d.key] ?? d.default) : [];
            // 文本二级属性：T 展开的字号/颜色定义（可选）
            const sizeDef = d.sizeKey ? defByKey[d.sizeKey] : undefined;
            const colorDef = d.colorKey ? defByKey[d.colorKey] : undefined;
            const hlColorDef = d.hlColorKey ? defByKey[d.hlColorKey] : undefined;
            const hlSizeDef = d.hlSizeKey ? defByKey[d.hlSizeKey] : undefined;
            return (
              <div className="prop-item" key={d.key}>
                {d.kind !== 'color' && <label className="prop-label">{d.label}</label>}
                {d.kind === 'number' && (
                  <NumField
                    d={d}
                    value={val}
                    onChange={(v) => onChange(d.key, v)}
                  />
                )}
                {d.kind === 'color' && (
                  <ColorField
                    cid={`top:${d.key}`}
                    label={d.label}
                    value={val as string}
                    onChange={(v) => onChange(d.key, v)}
                    open={openColor?.id === `top:${d.key}`}
                    anchor={openColor?.id === `top:${d.key}` ? openColor.anchor : null}
                    onToggle={toggleColor}
                    onClose={() => setOpenColor(null)}
                  />
                )}
                {d.kind === 'text' && (
                  <div className="prop-text-wrap">
                    <div className="prop-text-row">
                      <input
                        type="text"
                        className="prop-text"
                        value={val as string}
                        onChange={(e) => onChange(d.key, e.target.value)}
                      />
                      <button
                        type="button"
                        className={'prop-t' + (openT[d.key] ? ' active' : '')}
                        onClick={() => toggleT(d.key)}
                        title="展开/收起 字号与颜色"
                      >T</button>
                    </div>
                    {d.note && <div className="prop-note">{d.note}</div>}
                    {openT[d.key] && (
                      <div className="prop-text-sub">
                        {sizeDef && (
                          <div className="prop-sub-row">
                            <span className="prop-sub-label">{sizeDef.label}</span>
                            <NumField
                              d={sizeDef}
                              value={config[sizeDef.key] ?? sizeDef.default}
                              onChange={(v) => onChange(sizeDef.key, v)}
                            />
                          </div>
                        )}
                        {colorDef && (
                          <div className="prop-sub-row">
                            <ColorField
                              cid={`sub:${d.key}`}
                              label={colorDef.label}
                              value={(config[colorDef.key] ?? colorDef.default) as string}
                              onChange={(v) => onChange(colorDef.key, v)}
                              open={openColor?.id === `sub:${d.key}`}
                              anchor={openColor?.id === `sub:${d.key}` ? openColor.anchor : null}
                              onToggle={toggleColor}
                              onClose={() => setOpenColor(null)}
                            />
                          </div>
                        )}
                        {hlSizeDef && (
                          <div className="prop-sub-row">
                            <span className="prop-sub-label">{hlSizeDef.label}</span>
                            <NumField
                              d={hlSizeDef}
                              value={config[hlSizeDef.key] ?? hlSizeDef.default}
                              onChange={(v) => onChange(hlSizeDef.key, v)}
                            />
                          </div>
                        )}
                        {hlColorDef && (
                          <div className="prop-sub-row">
                            <ColorField
                              cid={`subhl:${d.key}`}
                              label={hlColorDef.label}
                              value={(config[hlColorDef.key] ?? hlColorDef.default) as string}
                              onChange={(v) => onChange(hlColorDef.key, v)}
                              open={openColor?.id === `subhl:${d.key}`}
                              anchor={openColor?.id === `subhl:${d.key}` ? openColor.anchor : null}
                              onToggle={toggleColor}
                              onClose={() => setOpenColor(null)}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {d.kind === 'list' && (
                  <div className="prop-list">
                    {items.map((item, i) => (
                      <div className="prop-list-item" key={i}>
                        <div className="prop-list-head">
                          <span className="prop-list-idx">#{i + 1}</span>
                          <button
                            type="button"
                            className="prop-list-del"
                            title="删除该条目"
                            aria-label="删除该条目"
                            onClick={() => delListItem(d, i)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" />
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </button>
                        </div>
                        {(d.listFields ?? []).map((f) => {
                          const fid = `${d.key}#${i}#${f.key}`;
                          const fsizeDef = f.sizeKey ? defByKey[f.sizeKey] : undefined;
                          const fcolorDef = f.colorKey ? defByKey[f.colorKey] : undefined;
                          return (
                            <div className="prop-list-field" key={f.key}>
                              {f.kind !== 'color' && <span className="prop-list-flabel">{f.label}</span>}
                              {f.kind === 'color' ? (
                                <ColorField
                                  cid={fid}
                                  label={f.label}
                                  value={item[f.key] || '#000000'}
                                  onChange={(v) => setListField(d, i, f, v)}
                                  open={openColor?.id === fid}
                                  anchor={openColor?.id === fid ? openColor.anchor : null}
                                  onToggle={toggleColor}
                                  onClose={() => setOpenColor(null)}
                                />
                              ) : (
                                <div className="prop-text-wrap">
                                  <div className="prop-text-row">
                                    {f.multiline ? (
                                      <textarea
                                        rows={2}
                                        className="prop-textarea"
                                        placeholder={f.placeholder}
                                        value={item[f.key] ?? ''}
                                        onChange={(e) => setListField(d, i, f, e.target.value)}
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        className="prop-text"
                                        placeholder={f.placeholder}
                                        value={item[f.key] ?? ''}
                                        onChange={(e) => setListField(d, i, f, e.target.value)}
                                      />
                                    )}
                                    {(f.sizeKey || f.colorKey) && (
                                      <button
                                        type="button"
                                        className={'prop-t' + (openT[fid] ? ' active' : '')}
                                        onClick={() => toggleT(fid)}
                                        title="展开/收起 字号与颜色"
                                      >T</button>
                                    )}
                                  </div>
                                  {f.note && <div className="prop-note">{f.note}</div>}
                                  {(f.sizeKey || f.colorKey) && openT[fid] && (
                                    <div className="prop-text-sub">
                                      {fsizeDef && (
                                        <div className="prop-sub-row">
                                          <span className="prop-sub-label">{fsizeDef.label}</span>
                                          <NumField
                                            d={fsizeDef}
                                            value={config[fsizeDef.key] ?? fsizeDef.default}
                                            onChange={(v) => onChange(fsizeDef.key, v)}
                                          />
                                        </div>
                                      )}
                                      {fcolorDef && (
                                        <div className="prop-sub-row">
                                          <ColorField
                                            cid={`list:${fid}`}
                                            label={fcolorDef.label}
                                            value={(config[fcolorDef.key] ?? fcolorDef.default) as string}
                                            onChange={(v) => onChange(fcolorDef.key, v)}
                                            open={openColor?.id === `list:${fid}`}
                                            anchor={openColor?.id === `list:${fid}` ? openColor.anchor : null}
                                            onToggle={toggleColor}
                                            onClose={() => setOpenColor(null)}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <button type="button" className="prop-list-add" onClick={() => addListItem(d)}>
                      + 添加条目
                    </button>
                  </div>
                )}
                {d.kind !== 'list' && d.kind !== 'text' && <code className="prop-code">{key}</code>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
