import type { MotionEffectInstance } from '../project/types';

export const PROJECT_SIZE = { width: 1920, height: 1080 } as const;
export const MIN_SCALE = 0.05;

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FittedProjectRect extends Rect {
  scale: number;
}

export interface InstanceRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Footprint {
  width: number;
  height: number;
}

export interface ProjectSize {
  width: number;
  height: number;
}

export type ResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type EffectTransform = MotionEffectInstance['transform'];

const finiteOr = (value: number, fallback: number): number => Number.isFinite(value) ? value : fallback;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function fitProjectToRect(rect: Rect, projectSize: ProjectSize = PROJECT_SIZE): FittedProjectRect {
  const width = Math.max(0, finiteOr(rect.width, 0));
  const height = Math.max(0, finiteOr(rect.height, 0));
  const projectWidth = Math.max(1, finiteOr(projectSize.width, PROJECT_SIZE.width));
  const projectHeight = Math.max(1, finiteOr(projectSize.height, PROJECT_SIZE.height));
  const scale = Math.min(width / projectWidth, height / projectHeight);
  const fittedWidth = projectWidth * scale;
  const fittedHeight = projectHeight * scale;
  return {
    left: finiteOr(rect.left, 0) + (width - fittedWidth) / 2,
    top: finiteOr(rect.top, 0) + (height - fittedHeight) / 2,
    width: fittedWidth,
    height: fittedHeight,
    scale,
  };
}

export function screenPointToProject(
  point: Point,
  fitted: FittedProjectRect,
  projectSize: ProjectSize = PROJECT_SIZE,
): Point {
  if (!(fitted.scale > 0) || !Number.isFinite(fitted.scale)) return { x: 0, y: 0 };
  return {
    x: clamp((finiteOr(point.x, fitted.left) - fitted.left) / fitted.scale, 0, projectSize.width),
    y: clamp((finiteOr(point.y, fitted.top) - fitted.top) / fitted.scale, 0, projectSize.height),
  };
}

export function projectPointToScreen(point: Point, fitted: FittedProjectRect): Point {
  return {
    x: fitted.left + finiteOr(point.x, 0) * fitted.scale,
    y: fitted.top + finiteOr(point.y, 0) * fitted.scale,
  };
}

export function clampTransformToProject(
  transform: EffectTransform,
  footprint: Footprint,
  projectSize: ProjectSize = PROJECT_SIZE,
): EffectTransform {
  const width = Math.max(1, finiteOr(footprint.width, 1));
  const height = Math.max(1, finiteOr(footprint.height, 1));
  const maxScale = Math.max(MIN_SCALE, Math.min(projectSize.width / width, projectSize.height / height));
  const scale = clamp(finiteOr(transform.scale, MIN_SCALE), MIN_SCALE, maxScale);
  return {
    x: clamp(finiteOr(transform.x, 0), 0, projectSize.width - width * scale),
    y: clamp(finiteOr(transform.y, 0), 0, projectSize.height - height * scale),
    scale,
    rotation: finiteOr(transform.rotation, 0),
  };
}

export function resizeTransformFromCorner(
  initial: EffectTransform,
  footprint: Footprint,
  corner: ResizeCorner,
  pointer: Point,
  projectSize: ProjectSize = PROJECT_SIZE,
): EffectTransform {
  const safeInitial = clampTransformToProject(initial, footprint, projectSize);
  const width = Math.max(1, finiteOr(footprint.width, 1));
  const height = Math.max(1, finiteOr(footprint.height, 1));
  const leftCorner = corner.includes('left');
  const topCorner = corner.includes('top');
  const anchor = {
    x: leftCorner ? safeInitial.x + width * safeInitial.scale : safeInitial.x,
    y: topCorner ? safeInitial.y + height * safeInitial.scale : safeInitial.y,
  };
  const direction = {
    x: leftCorner ? -width : width,
    y: topCorner ? -height : height,
  };
  const pointerX = finiteOr(pointer.x, anchor.x + direction.x * MIN_SCALE);
  const pointerY = finiteOr(pointer.y, anchor.y + direction.y * MIN_SCALE);
  const projectedScale = (
    (pointerX - anchor.x) * direction.x + (pointerY - anchor.y) * direction.y
  ) / (direction.x ** 2 + direction.y ** 2);
  const scale = Math.max(MIN_SCALE, finiteOr(projectedScale, MIN_SCALE));
  return clampTransformToProject({
    x: leftCorner ? anchor.x - width * scale : anchor.x,
    y: topCorner ? anchor.y - height * scale : anchor.y,
    scale,
    rotation: safeInitial.rotation,
  }, footprint, projectSize);
}
