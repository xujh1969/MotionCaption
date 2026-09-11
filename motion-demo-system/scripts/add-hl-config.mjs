#!/usr/bin/env node
/**
 * add-hl-config.mjs —— 为指定组件的显示文本字段统一接入 {{重点文字}} 能力：
 *   1. CONFIGS: mkText(...) 追加 hlColorKey 参数（'hlColor'），并补 mkColor('hlColor', '重点文字颜色', DEF)
 *   2. DEFAULTS: 补 hlColor: '<DEF>'
 * 已有 hlColorKey/hlSizeKey 的字段跳过；excluded 里的数据/装饰字段不动。
 * 一次性脚本，跑完即删。
 */
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/remotion/config.ts';
const src = readFileSync(path, 'utf8');
const lines = src.split('\n');

const HL_COLOR = 'hlColor';
const DEF_DEFAULT = '#4CC9F0';
const DEF_OVERRIDES = { 'fx-03': '#FF6B6B', 'fx-09': '#8B7FD4' };
// 数据/装饰类字段不接入重点文字
const EXCLUDED_KEYS = new Set([
  'enText', 'unitText', 'xlText', 'tickLabels', 'wavePoints',
  'markA', 'markB', 'numText', 'plusText', 'centerUnit', 'kickerText',
]);
// 已有 hl 能力的组件跳过整个处理
const SKIP_IDS = new Set(['fx-01', 'fx-02', 'fx-05']);

/** 解析 mkText(...) 的顶层参数（引号感知） */
function parseArgs(line) {
  const start = line.indexOf('mkText(');
  if (start < 0) return null;
  let i = start + 'mkText('.length, depth = 1, inStr = false, cur = '', args = [];
  while (i < line.length && depth > 0) {
    const ch = line[i];
    if (inStr) {
      if (ch === '\\') { cur += ch + (line[i + 1] ?? ''); i += 2; continue; }
      if (ch === "'") inStr = false;
      cur += ch;
    } else if (ch === "'") { inStr = true; cur += ch; }
    else if (ch === '(') { depth++; cur += ch; }
    else if (ch === ')') { depth--; if (depth === 0) { args.push(cur.trim()); break; } cur += ch; }
    else if (ch === ',' && depth === 1) { args.push(cur.trim()); cur = ''; }
    else cur += ch;
    i++;
  }
  return args;
}

const targets = process.argv.slice(2);
if (!targets.length) { console.error('用法: node add-hl-config.mjs <componentId>...'); process.exit(1); }

let changed = 0;
const report = [];
for (const id of targets) {
  if (SKIP_IDS.has(id)) { report.push(`  · ${id}: 已有 hl 能力，跳过`); continue; }
  // 找 CONFIGS 块 'id': [
  const openRe = new RegExp(`^\\s*'${id}':\\s*\\[\\s*$`);
  let cs = -1;
  for (let i = 0; i < lines.length; i++) if (openRe.test(lines[i])) { cs = i; break; }
  if (cs < 0) { report.push(`  ⚠ ${id}: CONFIGS 块未找到`); continue; }
  let ce = cs + 1, depth = 1;
  for (; ce < lines.length; ce++) {
    for (const ch of lines[ce]) {
      if (ch === '[') depth++;
      else if (ch === ']') depth--;
    }
    if (depth <= 0) break;
  }
  // 找 DEFAULTS 块 'id': {
  const openRe2 = new RegExp(`^\\s*'${id}':\\s*\\{\\s*$`);
  let ds = -1;
  for (let i = 0; i < lines.length; i++) if (openRe2.test(lines[i])) { ds = i; break; }
  let de = ds + 1; depth = 1;
  for (; de < lines.length && ds >= 0; de++) {
    for (const ch of lines[de]) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    if (depth <= 0) break;
  }

  const edits = []; // {line, text} 从后往前按行号插入/替换
  const def = DEF_OVERRIDES[id] ?? DEF_DEFAULT;

  // 1) CONFIGS: mkText 追加参数；统计是否已有 mkColor('hlColor'
  let hasHlColor = false;
  const mkTextTargets = [];
  for (let i = cs + 1; i < ce; i++) {
    const line = lines[i];
    if (line.includes(`mkColor('${HL_COLOR}'`)) hasHlColor = true;
    const m = line.match(/^\s*mkText\('([^']+)'/);
    if (!m) continue;
    if (EXCLUDED_KEYS.has(m[1])) continue;
    if (line.includes(`'${HL_COLOR}'`) && !/^\s*mkColor/.test(line)) continue; // 已有 hlColorKey
    mkTextTargets.push(i);
  }
  for (const i of mkTextTargets) {
    const args = parseArgs(lines[i]);
    if (!args) continue;
    if (args.length >= 7) continue; // 已有 hl 参数
    let newline;
    if (args.length === 5) newline = lines[i].replace(/\)\s*,?\s*$/, ", undefined, 'hlColor'),");
    else if (args.length === 6) newline = lines[i].replace(/\)\s*,?\s*$/, ", 'hlColor'),");
    else continue;
    // 保留行尾逗号原状（原行若以 ',' 结尾已在 regex 里带回）
    if (!/, $/.test(newline) && !/,$/.test(newline)) newline = newline.replace(/\)\s*$/, '),');
    edits.push({ line: i, replace: newline });
  }
  // 2) CONFIGS: 插入 mkColor('hlColor')（放在 posX 行前）
  if (!hasHlColor) {
    const px = lines.findIndex((l, i) => i > cs && i < ce && /^\s*mkNum\('posX'/.test(l));
    if (px >= 0) edits.push({ line: px, insertBefore: `    mkColor('${HL_COLOR}', '重点文字颜色', '${def}'),` });
  }
  // 3) DEFAULTS: 插入 hlColor
  if (ds >= 0) {
    let hasDef = false, py = -1;
    for (let i = ds + 1; i < de; i++) {
      if (/^\s*hlColor:/.test(lines[i])) hasDef = true;
      if (py < 0 && /^\s*posX:/.test(lines[i])) py = i;
    }
    if (!hasDef && py >= 0) edits.push({ line: py, insertBefore: `    hlColor: '${def}',` });
  }

  edits.sort((a, b) => b.line - a.line);
  for (const e of edits) {
    if (e.replace) lines[e.line] = e.replace;
    else lines.splice(e.line, 0, e.insertBefore);
  }
  changed++;
  report.push(`  ✔ ${id}: mkText 补参 ${mkTextTargets.length} 处${edits.some((e) => e.insertBefore?.includes('mkColor')) ? ' + mkColor' : ''}${edits.some((e) => e.insertBefore?.includes('hlColor:')) ? ' + DEFAULTS' : ''}`);
}

writeFileSync(path, lines.join('\n'), 'utf8');
console.log(`已处理 ${changed} 个组件`);
console.log(report.join('\n'));
