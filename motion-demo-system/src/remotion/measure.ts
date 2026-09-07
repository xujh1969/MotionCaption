import { FONT_STACK } from './theme';

// 字重映射（供 canvas measureText 使用）
const WEIGHT_MAP: Record<string, number> = {
  Heavy: 900,
  Black: 900,
  Bold: 700,
  Regular: 400,
};

let measureCtx: CanvasRenderingContext2D | null = null;
function getCtx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const c = document.createElement('canvas');
    measureCtx = c.getContext('2d')!;
  }
  return measureCtx;
}

export const measureText = (
  text: string,
  fontSize: number,
  weight: 'Heavy' | 'Bold' | 'Regular' | 'Black' = 'Heavy',
): number => {
  const ctx = getCtx();
  ctx.font = `${WEIGHT_MAP[weight] ?? 700} ${fontSize}px ${FONT_STACK}`;
  return ctx.measureText(text).width;
};

export function weightNum(weight: string): number {
  return WEIGHT_MAP[weight] ?? 700;
}