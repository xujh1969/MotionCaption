#!/usr/bin/env node
/**
 * 渲染一致性检查：预览路径（Remotion Player 真实 DOM 截图）vs 导出路径（renderStillOnWeb 重绘）。
 *
 * 背景：透明视频导出用 @remotion/web-renderer 的 renderStillOnWeb，它不是截图，而是把 DOM
 * 重新手绘到 canvas。部分 CSS / SVG 特性支持不全，会出现「预览正常、导出走样」：
 *   - 浏览器原生折行（white-space:normal + 多内联元素）→ 断行位置漂移（t1-08）
 *   - SVG stroke-dasharray 圆弧 → 弧段大面积丢失（t7-03 / t7-06）
 *   - box-shadow inset → 直接被跳过（内发光丢失）
 *   - 依赖运行时 measure 的视觉状态 → 两条链路各自测量，状态漂移（t4-01 / t6-07）
 * 本脚本对同一工程分别走两条路径渲染同一帧并逐像素 diff，把差异量化到单个组件。
 *
 * 用法：
 *   npm run check:parity                       # 检查全部组件
 *   npm run check:parity -- t1-08 t5-04        # 只检查指定组件（新增/修改后必跑）
 *   npm run check:parity -- --update-baseline  # 刷新基线（组件视觉调整后）
 *   npm run check:parity -- --frames=45,75 --gate=7
 *
 * 判定：
 *   - 新组件（不在基线中）差异 > gate            → 失败（退出码 1）
 *   - 基线内组件差异 > 基线值 + 2                 → 失败（回归）
 *   - 基线内组件超 gate 但没恶化                  → 提示 KNOWN，不阻断
 */
import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BASE = 'http://127.0.0.1:8011/';
const BASELINE_PATH = join(projectRoot, 'scripts', 'render-parity-baseline.json');
const COLS = 5;
const ROWS = 4;
const CELL_W = 384;
const CELL_H = 270;
const FALLBACK_CHROME = 'C:\\Users\\AYOU\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1234\\chrome-headless-shell-win64\\chrome-headless-shell.exe';

const argv = process.argv.slice(2);
const updateBaseline = argv.includes('--update-baseline');
const frameArg = argv.find((a) => a.startsWith('--frames='));
const gateArg = argv.find((a) => a.startsWith('--gate='));
const idsArg = argv.filter((a) => !a.startsWith('--'));
// 110 帧用于覆盖「按剪辑长度计算的末段淡出」类差异（如 t6-07），否则这类问题会被漏掉
const FRAMES = (frameArg ? frameArg.slice(9) : '45,75,110').split(',').map((v) => Number(v.trim())).filter(Number.isFinite);
// 判定用平均色差（保守：宁可多报也不漏报）。差异像素占比（面积%）只作为诊断信息输出，
// 用来区分差异性质：面积高且散布在文字边缘 = 重绘器文字抗锯齿的固有精度差异（肉眼不可见）；
// 面积低但集中在某片区域 = 元素丢失/透明度失效这类结构性缺陷。
const GATE = gateArg ? Number(gateArg.slice(7)) : 7;
const CHROME = process.env.MOTION_CHROME ?? process.env.PLAYWRIGHT_CHROMIUM ?? FALLBACK_CHROME;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function portOpen(url) {
  return new Promise((done) => {
    const req = http.get(url, (res) => {
      res.resume();
      done(true);
    });
    req.on('error', () => done(false));
    req.setTimeout(800, () => {
      req.destroy();
      done(false);
    });
  });
}

async function loadChromium() {
  const candidates = [
    'playwright-core',
    pathToFileURL(join(projectRoot, '.superpowers/sdd/node_modules/playwright-core/index.mjs')).href,
  ];
  for (const spec of candidates) {
    try {
      const mod = await import(spec);
      const pw = mod.chromium ?? mod.default?.chromium;
      if (pw) return pw;
    } catch {
      /* 试下一个候选 */
    }
  }
  throw new Error('未找到 playwright-core，请先执行：npm i -D playwright-core');
}

async function ensureDevServer() {
  if (await portOpen(BASE)) return null;
  process.stdout.write(`dev server 未运行，启动 vite :8011 …\n`);
  const child = spawn('npx', ['vite', '--port', '8011', '--strictPort', '--host', '127.0.0.1'], {
    cwd: projectRoot,
    shell: true,
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i += 1) {
    await sleep(500);
    if (await portOpen(BASE)) return child;
  }
  throw new Error('dev server 启动超时，请手动运行 npm run dev 后重试');
}

function killTree(pid) {
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(-pid);
    }
  } catch {
    /* 已退出 */
  }
}

const chromium = await loadChromium();
const devServer = await ensureDevServer();
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 2000, height: 1160 } });
  page.on('pageerror', (e) => process.stdout.write(`[pageerror] ${String(e)}\n`));
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);

  await page.evaluate(async () => {
    const React = (await import('/@id/react')).default;
    const rdc = await import('/@id/react-dom/client');
    const playerMod = await import('/@id/@remotion/player');
    window.__React = React;
    window.__createRoot = rdc.createRoot ?? rdc.default?.createRoot;
    window.__Player = playerMod.Player ?? playerMod.default?.Player;
    window.__wr = await import('/@id/@remotion/web-renderer');
    window.__ProjectComposition = (await import('/@fs/C:/Users/AYOU/Desktop/MotionCaption/motion-demo-system/src/composition/ProjectComposition.tsx')).ProjectComposition;
    window.__registry = (await import('/@fs/C:/Users/AYOU/Desktop/MotionCaption/motion-demo-system/src/effects/registry.ts')).effectRegistry;
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    document.body.style.background = 'transparent';
  });

  const allIds = await page.evaluate(() => window.__registry.list().map((d) => d.id));
  const ids = idsArg.length > 0 ? idsArg : allIds;
  const unknown = ids.filter((id) => !allIds.includes(id));
  if (unknown.length > 0) throw new Error(`未知组件 id：${unknown.join(', ')}`);

  const worst = new Map(ids.map((id) => [id, { avg: 0, pct: 0 }]));
  const perFrame = new Map(ids.map((id) => [id, {}]));

  for (let batch = 0; batch < Math.ceil(ids.length / (COLS * ROWS)); batch += 1) {
    const batchIds = ids.slice(batch * COLS * ROWS, (batch + 1) * COLS * ROWS);
    const footprints = await page.evaluate((list) => window.__registry.get && list.map((id) => {
      const d = window.__registry.get(id);
      return { id, w: d.layout.footprint.width, h: d.layout.footprint.height };
    }), batchIds);

    const effects = footprints.map((f, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const fit = Math.min((CELL_W * 0.85) / f.w, (CELL_H * 0.7) / f.h, 1);
      return {
        instanceId: `parity-${f.id}`,
        sceneId: 'parity',
        componentId: f.id,
        componentVersion: 1,
        sourceCueIds: [],
        startFrame: 0,
        durationInFrames: 120,
        track: 0,
        zIndex: i + 1,
        props: {},
        transform: {
          x: col * CELL_W + (CELL_W - f.w * fit) / 2,
          y: row * CELL_H + (CELL_H - f.h * fit) / 2,
          scale: fit,
          rotation: 0,
        },
      };
    });
    const project = {
      kind: 'captionforge.project',
      schemaVersion: 1,
      video: { width: 1920, height: 1080, fps: 30, durationInFrames: 120 },
      cues: [],
      effects,
    };

    for (const frame of FRAMES) {
      // 预览路径：Player 真实 DOM
      await page.evaluate(async ({ project, frame }) => {
        const React = window.__React;
        document.body.innerHTML = '<div id="pv" style="position:fixed;left:0;top:0;width:1920px;height:1080px;"></div>';
        const root = window.__createRoot(document.getElementById('pv'));
        const ref = React.createRef();
        root.render(React.createElement(window.__Player, {
          ref,
          component: window.__ProjectComposition,
          inputProps: { project },
          durationInFrames: 120,
          compositionWidth: 1920,
          compositionHeight: 1080,
          fps: 30,
          autoPlay: false,
          controls: false,
          style: { width: 1920, height: 1080 },
        }));
        await new Promise((r) => setTimeout(r, 600));
        ref.current.seekTo(frame);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 400));
      }, { project, frame });

      const shotB64 = (await page.locator('#pv').screenshot({ omitBackground: true })).toString('base64');

      // 导出路径：renderStillOnWeb
      const exportB64 = await page.evaluate(async ({ project, frame }) => {
        const still = await window.__wr.renderStillOnWeb({
          frame,
          composition: {
            id: 'P',
            component: window.__ProjectComposition,
            width: 1920,
            height: 1080,
            fps: 30,
            durationInFrames: 120,
            defaultProps: { project },
          },
          inputProps: { project },
        });
        const blob = await still.blob({ format: 'png' });
        const buf = new Uint8Array(await blob.arrayBuffer());
        let bin = '';
        const CH = 0x8000;
        for (let i = 0; i < buf.length; i += CH) bin += String.fromCharCode(...buf.subarray(i, i + CH));
        return btoa(bin);
      }, { project, frame });

      const cellStats = await page.evaluate(async ({ shotB64, exportB64, footprints }) => {
        const load = async (b64) => createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
        const [a, b] = await Promise.all([load(shotB64), load(exportB64)]);
        const w = Math.min(a.width, b.width);
        const h = Math.min(a.height, b.height);
        const ma = new OffscreenCanvas(w, h);
        const mb = new OffscreenCanvas(w, h);
        ma.getContext('2d').drawImage(a, 0, 0);
        mb.getContext('2d').drawImage(b, 0, 0);
        const da = ma.getContext('2d').getImageData(0, 0, w, h).data;
        const db = mb.getContext('2d').getImageData(0, 0, w, h).data;
        return footprints.map((f, i) => {
          const x0 = (i % 5) * 384;
          const y0 = Math.floor(i / 5) * 270;
          let sum = 0;
          let n = 0;
          let diffPx = 0;
          for (let y = y0; y < Math.min(y0 + 270, h); y += 2) {
            for (let x = x0; x < Math.min(x0 + 384, w); x += 2) {
              const k = (y * w + x) * 4;
              const aa = da[k + 3] / 255;
              const ab = db[k + 3] / 255;
              const d = (Math.abs(da[k] * aa - db[k] * ab)
                + Math.abs(da[k + 1] * aa - db[k + 1] * ab)
                + Math.abs(da[k + 2] * aa - db[k + 2] * ab)) / 3
                + Math.abs(da[k + 3] - db[k + 3]);
              sum += d;
              n += 1;
              if (d > 30) diffPx += 1;
            }
          }
          return { id: f.id, avg: +(sum / n).toFixed(1), pct: +((diffPx / n) * 100).toFixed(2) };
        });
      }, { shotB64, exportB64, footprints });

      for (const s of cellStats) {
        perFrame.get(s.id)[frame] = s.avg;
        const cur = worst.get(s.id);
        if (s.avg > cur.avg) cur.avg = s.avg;
        if (s.pct > cur.pct) cur.pct = s.pct;
      }
    }
    process.stdout.write(`batch ${batch + 1}/${Math.ceil(ids.length / (COLS * ROWS))} 完成\n`);
  }

  const rawBaseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : {};
  const baseOf = (id) => {
    const v = rawBaseline[id];
    if (v === undefined) return null;
    return typeof v === 'number' ? { avg: v, pct: null } : v;
  };
  const rows = ids
    .map((id) => {
      const w = worst.get(id);
      return { id, avg: w.avg, pct: w.pct, base: baseOf(id) };
    })
    .sort((p, q) => q.avg - p.avg || q.pct - p.pct);

  const overGate = (r) => r.avg > GATE;
  let failed = 0;
  process.stdout.write(`\n组件      帧(${FRAMES.join('/')})        最大   面积%   状态\n`);
  for (const r of rows) {
    const frames = FRAMES.map((f) => String(perFrame.get(r.id)[f] ?? '-').padStart(5)).join(' ');
    let status;
    if (updateBaseline) {
      status = overGate(r) ? `写入基线（avg ${r.avg} / 面积 ${r.pct}%，记为待观察）` : '写入基线';
    } else if (overGate(r) && !r.base) {
      status = `FAIL  新组件超阈值（avg ${r.avg} > ${GATE}，差异面积 ${r.pct}%）`;
      failed += 1;
    } else if (r.base && (r.avg > r.base.avg + 2 || (r.base.pct !== null && r.pct > r.base.pct + 1))) {
      status = `FAIL  回归（基线 avg ${r.base.avg} / 面积 ${r.base.pct ?? '-'}% → ${r.avg} / ${r.pct}%）`;
      failed += 1;
    } else if (overGate(r)) {
      status = `KNOWN 基线 avg ${r.base.avg}（未恶化）`;
    } else {
      status = 'OK';
    }
    process.stdout.write(`${r.id.padEnd(9)} ${frames}  ${String(r.avg).padStart(5)}   ${String(r.pct).padStart(6)}%   ${status}\n`);
  }

  if (updateBaseline) {
    const next = {};
    for (const r of rows) next[r.id] = { avg: r.avg, pct: r.pct };
    for (const k of Object.keys(rawBaseline)) if (!(k in next)) next[k] = rawBaseline[k];
    writeFileSync(BASELINE_PATH, `${JSON.stringify(Object.fromEntries(Object.keys(next).sort().map((k) => [k, next[k]])), null, 2)}\n`);
    process.stdout.write(`\n基线已更新：scripts/render-parity-baseline.json\n`);
  }

  process.stdout.write(`\n${failed === 0 ? '渲染一致性检查通过' : `渲染一致性检查失败：${failed} 个组件`}\n`);
  if (failed > 0 && !updateBaseline) process.exitCode = 1;
} finally {
  await browser.close();
  if (devServer) killTree(devServer.pid);
}
