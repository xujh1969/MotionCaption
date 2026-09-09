#!/usr/bin/env node
/**
 * bake-style-defaults.mjs —— 把编辑器导出的「用户默认样式」JSON 固化进代码。
 *
 * 用法：
 *   node scripts/bake-style-defaults.mjs <motioncaption-style-defaults.json> [--config <config.ts路径>] [--dry]
 *
 * 输入 JSON：编辑器「导出默认样式」按钮产物：
 *   { version: 1, exportedAt, styleDefaults: { componentId: { styleKey: value } } }
 * （也兼容裸的 Record<componentId, styleValues>。）
 *
 * 固化范围（两层同时改，保持一致）：
 *   1. CONFIGS：mkNum / mkColor / mkText 的默认值参数；
 *   2. DEFAULTS：对应组件块里的标量键值。
 * 不触碰：数组内容（mkList 默认数据 / items）、布局键若 JSON 里没有则不动、
 * 代码里不存在的键会警告跳过。
 *
 * 文案内容（mkText 声明的键，如 titleText / subText / items 文案）默认**跳过**：
 * 导出的快照里带的是上一个工程的具体句子，写进代码默认会让之后每个新组件
 * 都顶着旧文案。确实要连文案一起固化时加 `--with-content`。
 */

import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
if (!args.length) {
  console.error('用法: node scripts/bake-style-defaults.mjs <style-defaults.json> [--config src/remotion/config.ts] [--dry]');
  process.exit(1);
}
const jsonPath = args[0];
const configIdx = args.indexOf('--config');
const configPath = configIdx >= 0 ? args[configIdx + 1] : 'src/remotion/config.ts';
const isDry = args.includes('--dry');
const withContent = args.includes('--with-content');

const raw = JSON.parse(readFileSync(jsonPath, 'utf8'));
const styleDefaults = raw?.styleDefaults && typeof raw.styleDefaults === 'object'
  ? raw.styleDefaults
  : raw;
if (!styleDefaults || typeof styleDefaults !== 'object') {
  console.error('JSON 结构不对：需要 { styleDefaults: { componentId: { key: value } } }');
  process.exit(1);
}

const src = readFileSync(configPath, 'utf8');
const lines = src.split('\n');

const quote = (v) => `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** 在 [start,end) 行区间内替换标量 `key: value`，跳过 JSON.stringify 数据区。 */
function replaceScalarInDefaults(start, end, key, value, hits, noops) {
  let inJson = false;
  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (line.includes('JSON.stringify(')) inJson = true;
    if (inJson) {
      if (/^\s*\]\),?\s*$/.test(line)) inJson = false;
      continue;
    }
    if (line.includes('JSON.stringify')) continue;
    let re;
    if (typeof value === 'number') {
      re = new RegExp(`\\b${key}:\\s*-?\\d+(?:\\.\\d+)?`);
    } else {
      re = new RegExp(`\\b${key}:\\s*'[^']*'`);
    }
    if (!re.test(line)) continue;
    const next = line.replace(re, typeof value === 'number' ? `${key}: ${value}` : `${key}: ${quote(value)}`);
    if (next !== line) { lines[i] = next; hits.push(i + 1); }
    else noops.push(i + 1);
  }
}

/** 在 CONFIGS 块内替换 mkNum/mkColor/mkText 的默认值参数。 */
function replaceMkDefault(start, end, key, value, hits, noops) {
  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (typeof value === 'number' || /^-?\d+(\.\d+)?$/.test(String(value))) {
      const num = Number(value);
      const re = new RegExp(`^(\\s*mkNum\\('${key}',\\s*'[^']*',\\s*)(-?[\\d.]+)(,.*)$`);
      if (!re.test(line)) continue;
      const next = line.replace(re, `$1${num}$3`);
      if (next !== line) { lines[i] = next; hits.push(i + 1); }
      else noops.push(i + 1);
      continue;
    }
    const colorRe = new RegExp(`^(\\s*mkColor\\('${key}',\\s*'[^']*',\\s*)'[^']*'(.*)$`);
    if (colorRe.test(line)) {
      const next = line.replace(colorRe, `$1${quote(value)}$2`);
      if (next !== line) { lines[i] = next; hits.push(i + 1); }
      else noops.push(i + 1);
      continue;
    }
    const textRe = new RegExp(`^(\\s*mkText\\('${key}',\\s*'[^']*',\\s*)'(?:[^'\\\\]|\\\\.)*'(.*)$`);
    if (textRe.test(line)) {
      const next = line.replace(textRe, `$1${quote(value)}$2`);
      if (next !== line) { lines[i] = next; hits.push(i + 1); }
      else noops.push(i + 1);
    }
  }
}

/** 找 `'id': {`（DEFAULTS）或 `'id': [`（CONFIGS）块，返回 [start, endExclusive)。 */
function findBlock(id, closer) {
  const openCh = closer === '}' ? '\\{' : '\\[';
  const open = new RegExp(`^\\s*'${id}':\\s*${openCh}\\s*$`);
  const closeRe = closer === '}' ? /^\s*\},?\s*$/ : /^\s*\],?\s*$/;
  for (let i = 0; i < lines.length; i++) {
    if (!open.test(lines[i])) continue;
    let depth = closer === '}' ? 1 : 1;
    for (let j = i + 1; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (closer === '}' && ch === '{') depth++;
        else if (closer === ']' && ch === '[') depth++;
        else if (ch === closer) depth--;
      }
      if (depth <= 0 && closeRe.test(lines[j])) return [i + 1, j];
    }
    return [i + 1, lines.length];
  }
  return null;
}

const summary = [];
let changed = 0;
for (const [id, values] of Object.entries(styleDefaults)) {
  const defaultsBlock = findBlock(id, '}');
  const configsBlock = findBlock(id, ']');
  if (!defaultsBlock && !configsBlock) {
    summary.push(`  ⚠ ${id}: config.ts 里没有该组件，跳过`);
    continue;
  }
  // 识别 mkText 声明的内容键（文案）。默认不固化；--with-content 才写入。
  const contentKeys = new Set();
  if (configsBlock) {
    for (let i = configsBlock[0]; i < configsBlock[1]; i++) {
      const m = lines[i].match(/^\s*mkText\('([^']+)'/);
      if (m) contentKeys.add(m[1]);
    }
  }
  const hits = [];
  const noops = [];
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'object') { summary.push(`  ⚠ ${id}.${key}: 非标量值，跳过`); continue; }
    if (typeof value === 'string' && /^\s*\[/.test(value)) {
      summary.push(`  · ${id}.${key}: 数组内容键，跳过（条目数据不固化）`);
      continue;
    }
    if (!withContent && contentKeys.has(key)) {
      summary.push(`  · ${id}.${key}: 文案内容键，跳过（需连文案固化时加 --with-content）`);
      continue;
    }
    let done = 0;
    if (defaultsBlock) {
      const before = hits.length;
      const beforeNoop = noops.length;
      replaceScalarInDefaults(defaultsBlock[0], defaultsBlock[1], key, value, hits, noops);
      if (hits.length > before) done++;
      else if (noops.length > beforeNoop) done++;
    }
    if (configsBlock) {
      const before = hits.length;
      const beforeNoop = noops.length;
      replaceMkDefault(configsBlock[0], configsBlock[1], key, value, hits, noops);
      if (hits.length > before) done++;
      else if (noops.length > beforeNoop) done++;
    }
    if (!done) summary.push(`  ⚠ ${id}.${key}: 在 config.ts 里没找到对应位置，跳过`);
  }
  const uniq = [...new Set(hits)].sort((a, b) => a - b);
  if (uniq.length) {
    changed++;
    summary.push(`  ✔ ${id}: ${Object.keys(values).join(', ')}（行 ${uniq.join(', ')}）`);
  } else {
    summary.push(`  · ${id}: 无改动`);
  }
}

if (isDry) {
  console.log('[dry] 未写盘。将改动：');
  console.log(summary.join('\n'));
  process.exit(0);
}

writeFileSync(configPath, lines.join('\n'), 'utf8');
console.log(`已固化 ${changed} 个组件的默认样式到 ${configPath}`);
console.log(summary.join('\n'));
console.log('\n后续步骤: npx tsc --noEmit && npx vitest run（确认无回归）');
