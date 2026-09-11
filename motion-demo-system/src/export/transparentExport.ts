/**
 * 桌面端透明视频导出（Tauri + 原生 ffmpeg）。
 *
 * 背景：Chromium/WebView2 的 WebCodecs VideoEncoder 至今不支持 alpha 编码
 * （`alpha: 'keep'` 一律 NotSupportedError: Alpha encoding is not currently
 * supported），因此浏览器与 WebView2 内都编不出透明视频。
 * 桌面端方案：web 侧用 `renderStillOnWeb` 逐帧渲染出**带 alpha 的 PNG**，
 * 经 Tauri IPC 写入临时目录，最后由 Rust 调内置 ffmpeg 合成
 * ProRes 4444 MOV（`-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le
 * -alpha_bits 8`）。
 *
 * 为什么不是 WebM：透明 WebM（VP8/VP9 + yuva420p）在 Chrome / VLC / mpv 里
 * 能正常显示透明，但实测在剪映中被当成不透明素材，因此改用剪辑软件普遍
 * 支持的 ProRes 4444。
 */
import { renderStillOnWeb } from '@remotion/web-renderer';
import type { ComponentType } from 'react';
import {
  ProjectComposition,
  type ProjectCompositionProps,
} from '../composition/ProjectComposition';
import type { MotionProject } from '../project/types';
import type { NativeBridge } from '../tauri/bridge';

export interface TransparentExportProgress {
  frame: number;
  totalFrames: number;
  phase: 'rendering' | 'encoding' | 'done';
}

/** 分块 btoa：直接 String.fromCharCode(...bytes) 大数组会栈溢出。 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** 用户主动取消导出时抛出；UI 据此显示"已取消"而不是"失败"。 */
export class TransparentExportCancelledError extends Error {
  constructor() {
    super('透明导出已取消。');
    this.name = 'TransparentExportCancelledError';
  }
}

/**
 * Renders every frame to PNG and hands the muxing to the native ffmpeg
 * (async on the Rust side, so the window stays responsive). `signal.aborted`
 * can be flipped at any time: mid-render it stops the loop and cleans up;
 * mid-encode the caller kills the native ffmpeg process via
 * `abortTransparentEncode` and the pending promise rejects — an aborted
 * signal must be surfaced as "cancelled", not "failed".
 */
export async function exportTransparentMov(
  project: MotionProject,
  bridge: Pick<
    NativeBridge,
    | 'beginTransparentExport'
    | 'writeTransparentFrame'
    | 'finishTransparentExport'
    | 'abortTransparentEncode'
    | 'cancelTransparentExport'
  >,
  destination: string,
  onProgress?: (progress: TransparentExportProgress) => void,
  signal?: { aborted: boolean },
): Promise<void> {
  const { width, height, fps, durationInFrames } = project.video;
  const dir = await bridge.beginTransparentExport();
  const cancel = async (): Promise<never> => {
    await bridge.abortTransparentEncode(dir).catch(() => undefined);
    await bridge.cancelTransparentExport(dir).catch(() => undefined);
    throw new TransparentExportCancelledError();
  };
  try {
    for (let frame = 0; frame < durationInFrames; frame += 1) {
      if (signal?.aborted) await cancel();
      const still = await renderStillOnWeb({
        frame,
        composition: {
          id: 'ProjectComposition',
          component: ProjectComposition as ComponentType<
            ProjectCompositionProps & Record<string, unknown>
          >,
          width,
          height,
          fps,
          durationInFrames,
          defaultProps: { project },
        },
        inputProps: { project },
      });
      const blob = await still.blob({ format: 'png' });
      const buffer = await blob.arrayBuffer();
      await bridge.writeTransparentFrame(dir, frame, bytesToBase64(new Uint8Array(buffer)));
      onProgress?.({ frame: frame + 1, totalFrames: durationInFrames, phase: 'rendering' });
      // Every few frames, yield a real macrotask so the webview message pump
      // keeps servicing input/paint — long exports no longer look "frozen".
      if (frame % 8 === 7) {
        await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
      }
    }
    onProgress?.({ frame: durationInFrames, totalFrames: durationInFrames, phase: 'encoding' });
    if (signal?.aborted) await cancel();
    await bridge.finishTransparentExport(dir, String(fps), destination, durationInFrames / fps);
    onProgress?.({ frame: durationInFrames, totalFrames: durationInFrames, phase: 'done' });
  } catch (error) {
    // 中途失败：尽力清理临时帧目录，不掩盖原始错误
    await bridge.cancelTransparentExport(dir).catch(() => undefined);
    throw error;
  }
}
