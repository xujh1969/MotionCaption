import React from 'react';
import { createRoot } from 'react-dom/client';
import { Player, type PlayerRef } from '@remotion/player';
import { effectRegistry } from '../effects/registry';
import { mergeUserStyleDefaults } from '../effects/stylePrefs';
import type { MotionEffectInstance } from '../project/types';
import { EffectInstanceFrame } from '../composition/EffectInstanceFrame';

/**
 * 渲染画布尺寸（16:9，2x 输出）。
 * 截图时只保留组件边界外扩的裁剪区，放大展示时仍清晰。
 */
export const THUMBNAIL_WIDTH = 960;
export const THUMBNAIL_HEIGHT = 540;

/** 裁剪区在组件边界外扩的留白（渲染像素）。 */
const CROP_PADDING = 48;

/** 与编辑器画布 preview-dark 一致的深色底。 */
const THUMBNAIL_BG = 'radial-gradient(120% 90% at 22% 12%, #0f2a52, #060c1c 72%)';

/**
 * 取临近结束前的画面——入场动画此时已完全落定。
 * 渲染时长给足 5 秒：t7 图表类是逐项入场（最后一项 ~84 帧才长完，
 * 用户自定义 at 还可能更晚），90 帧会截到半成品；留 0.4s 提前量避开收尾。
 */
const CAPTURE_LEAD_FRAMES = 12;
const THUMBNAIL_FPS = 30;
const THUMBNAIL_DURATION_FRAMES = THUMBNAIL_FPS * 5;

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

/** 与 editorStore.addEffect 同规则构造一个独立实例（不进入工程）。 */
export function buildThumbnailInstance(componentId: string): MotionEffectInstance {
  const definition = effectRegistry.get(componentId);
  const defaults = mergeUserStyleDefaults(
    componentId,
    structuredClone(Object.fromEntries(
      Object.entries(definition.props).map(([key, prop]) => [key, prop.default]),
    )),
    undefined,
    { definition },
  );
  const requestedScale = typeof defaults.scale === 'number' ? defaults.scale / 100 : 1;
  const scale = Math.max(0.05, Math.min(
    requestedScale,
    1920 / definition.layout.footprint.width,
    1080 / definition.layout.footprint.height,
  ));
  return {
    instanceId: `thumbnail-${componentId}`,
    componentId,
    componentVersion: definition.version,
    sourceCueIds: [],
    startFrame: 0,
    durationInFrames: THUMBNAIL_DURATION_FRAMES,
    track: 0,
    zIndex: 1,
    props: defaults,
    transform: {
      x: Math.min(Math.max(0, typeof defaults.posX === 'number' ? defaults.posX : 0), 1920),
      y: Math.min(Math.max(0, typeof defaults.posY === 'number' ? defaults.posY : 0), 1080),
      scale,
      rotation: 0,
    },
  };
}

const ThumbnailComposition: React.FC<{ effect: MotionEffectInstance }> = ({ effect }) => (
  <div data-effect-root="thumbnail" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    <EffectInstanceFrame effect={effect} />
  </div>
);

/** 把一个已渲染 DOM 子树序列化为 SVG data URL 并栅格化成 PNG dataURL。
 * crop：要保留的渲染画布区域（组件边界外扩），内容平移到 foreignObject 原点。
 */
async function rasterizeElement(
  host: HTMLElement,
  crop: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const clone = host.cloneNode(true) as HTMLElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  // host 为避免闪烁停在屏幕外（fixed; left:-10000px）——序列化后需重新定位：
  // 用负偏移把裁剪区平移到 foreignObject 原点，其余内容被视口裁掉。
  clone.style.position = 'absolute';
  clone.style.left = `${-crop.x}px`;
  clone.style.top = `${-crop.y}px`;
  // 关键：img 加载的 SVG 里任何资源引用（audio/video 的 src）都会让
  // foreignObject 整体光栅化为空白——必须先剔除媒体元素。
  clone.querySelectorAll('audio, video, iframe, object, embed').forEach((el) => el.remove());
  // 关键：outerHTML 序列化出的 <svg> 不带 xmlns，而 SVG 图片按 XML 解析，
  // 无命名空间的 <svg> 会被当成未知元素整体丢弃（t7 图表全灭）——必须补上。
  clone.querySelectorAll('svg').forEach((el) => {
    el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}">`
    + `<foreignObject width="100%" height="100%">${clone.outerHTML}</foreignObject></svg>`;
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  // 不用 image.decode()：对 SVG data URL 在部分环境会永久 pending。
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('thumbnail image load timeout')), 5000);
    image.onload = () => { clearTimeout(timer); resolve(); };
    image.onerror = () => { clearTimeout(timer); reject(new Error('thumbnail image load failed')); };
  });
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable.');
  context.drawImage(image, 0, 0, crop.width, crop.height);
  return canvas.toDataURL('image/png');
}

const fullCanvasCrop = (): { x: number; y: number; width: number; height: number } => ({
  x: 0, y: 0, width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT,
});

/**
 * 计算裁剪区：组件（data-effect-root 下所有可见元素）的实际边界外扩
 * CROP_PADDING，钳制在渲染画布内；找不到可见内容时退回整张画布。
 * 全程用 host 本地坐标——host 停在屏幕外（left:-10000px），视口坐标的
 * right/bottom 是负数，直接参与 min 会把宽度算成负值而误回退全画布。
 * 导出供调试/测试复用。
 */
export function measureCropRect(host: HTMLElement): { x: number; y: number; width: number; height: number } {
  const hostRect = host.getBoundingClientRect();
  const root = host.querySelector<HTMLElement>('[data-effect-root]');
  if (!root) return fullCanvasCrop();
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  root.querySelectorAll<HTMLElement>('*').forEach((node) => {
    const bounds = node.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    left = Math.min(left, bounds.left - hostRect.left);
    top = Math.min(top, bounds.top - hostRect.top);
    right = Math.max(right, bounds.right - hostRect.left);
    bottom = Math.max(bottom, bounds.bottom - hostRect.top);
  });
  if (!Number.isFinite(left)) return fullCanvasCrop();
  const x = Math.max(0, left - CROP_PADDING);
  const y = Math.max(0, top - CROP_PADDING);
  const width = Math.min(THUMBNAIL_WIDTH, right + CROP_PADDING) - x;
  const height = Math.min(THUMBNAIL_HEIGHT, bottom + CROP_PADDING) - y;
  if (width <= 0 || height <= 0) return fullCanvasCrop();
  return { x, y, width, height };
}

const nextPaint = () => new Promise<void>((resolve) => {
  // 不用 requestAnimationFrame：headless/后台环境下 rAF 可能永不触发。
  setTimeout(resolve, 150);
});

/** 轮询等待 Player ref 就绪（React 18 createRoot 的 commit 是异步的）。 */
const waitForPlayerRef = async (holder: { current: PlayerRef | null }, timeoutMs = 3000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (!holder.current && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

/** 离屏渲染组件到目标帧，返回宿主容器（调用方负责 cleanup）。导出供调试/测试复用。 */
export async function renderOffscreenThumb(
  componentId: string,
): Promise<{ host: HTMLDivElement; cleanup: () => void }> {
  const effect = buildThumbnailInstance(componentId);
  const targetFrame = Math.max(1, THUMBNAIL_DURATION_FRAMES - CAPTURE_LEAD_FRAMES);
  const host = document.createElement('div');
  host.style.cssText = [
    'position:fixed', 'left:-10000px', 'top:0',
    `width:${THUMBNAIL_WIDTH}px`, `height:${THUMBNAIL_HEIGHT}px`,
    'overflow:hidden', 'pointer-events:none',
  ].join(';');
  document.body.appendChild(host);
  const holder: { current: PlayerRef | null } = { current: null };
  const root = createRoot(host);
  root.render(
    <div
      style={{
        position: 'absolute', left: 0, top: 0,
        width: 1920, height: 1080,
        transform: `scale(${THUMBNAIL_WIDTH / 1920})`,
        transformOrigin: 'top left',
        background: THUMBNAIL_BG,
        overflow: 'hidden',
      }}
    >
      <Player
        ref={(instance: PlayerRef | null) => { holder.current = instance; }}
        component={ThumbnailComposition}
        inputProps={{ effect }}
        durationInFrames={THUMBNAIL_DURATION_FRAMES}
        fps={THUMBNAIL_FPS}
        compositionWidth={1920}
        compositionHeight={1080}
        controls={false}
        loop={false}
        autoPlay={false}
        acknowledgeRemotionLicense
        style={{ width: 1920, height: 1080 }}
      />
    </div>,
  );
  await waitForPlayerRef(holder);
  holder.current?.seekTo(targetFrame);
  await nextPaint();
  return {
    host,
    cleanup: () => {
      root.unmount();
      host.remove();
    },
  };
}

async function captureThumbnail(componentId: string): Promise<string> {
  const { host, cleanup } = await renderOffscreenThumb(componentId);
  try {
    return await rasterizeElement(host, measureCropRect(host));
  } finally {
    cleanup();
  }
}

/**
 * 取组件缩略图（深色底、临近结束前 1 秒的真实渲染帧）。
 * 结果按组件缓存；同一组件的并发请求共享同一次生成。
 */
export function getComponentThumbnail(componentId: string): Promise<string> {
  const cached = cache.get(componentId);
  if (cached) return Promise.resolve(cached);
  const inFlight = pending.get(componentId);
  if (inFlight) return inFlight;
  const task = captureThumbnail(componentId)
    .then((dataUrl) => {
      cache.set(componentId, dataUrl);
      return dataUrl;
    })
    .finally(() => { pending.delete(componentId); });
  pending.set(componentId, task);
  return task;
}

let prewarming = false;
/** 空闲时段逐个预生成缩略图，让悬停即时命中缓存。重复调用安全。 */
export function startThumbnailPrewarm(componentIds: readonly string[]): void {
  if (prewarming) return;
  prewarming = true;
  const queue = [...componentIds];
  const step = () => {
    const next = queue.shift();
    if (!next) {
      prewarming = false;
      return;
    }
    if (!cache.has(next)) void getComponentThumbnail(next).catch(() => undefined);
    setTimeout(step, 120);
  };
  const kick = () => step();
  if (typeof requestIdleCallback === 'function') requestIdleCallback(kick, { timeout: 2000 });
  else setTimeout(kick, 1500);
}

/** 测试辅助：清空缓存。 */
export function clearThumbnailCache(): void {
  cache.clear();
  pending.clear();
}
