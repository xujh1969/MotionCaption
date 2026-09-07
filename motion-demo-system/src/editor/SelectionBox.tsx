import React, { useRef } from 'react';
import type { MotionEffectInstance } from '../project/types';
import {
  clampTransformToProject,
  fitProjectToRect,
  resizeTransformFromCorner,
  screenPointToProject,
  type FittedProjectRect,
  type Footprint,
  type InstanceRect,
  type Point,
  type ProjectSize,
  type ResizeCorner,
} from './coordinates';

interface SelectionBoxProps {
  effect: MotionEffectInstance;
  footprint: Footprint;
  measuredRect?: InstanceRect | null;
  fittedRect: FittedProjectRect;
  projectSize: ProjectSize;
  selected: boolean;
  stackRank?: number;
  stackCount?: number;
  editorMode: boolean;
  onSelect: (instanceId: string) => void;
  onTransform: (instanceId: string, transform: MotionEffectInstance['transform']) => void;
}

interface PointerSession {
  mode: 'move' | ResizeCorner;
  start: Point;
  initial: MotionEffectInstance['transform'];
  rect: InstanceRect;
  measured: boolean;
}

const corners: ResizeCorner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export function selectionOverlayZIndex(
  selected: boolean,
  stackRank: number,
  stackCount: number,
): number {
  return selected ? Math.max(1, stackCount + 1) : Math.max(1, stackRank + 1);
}

const usableRect = (rect: InstanceRect | null | undefined): boolean => (
  !!rect && rect.width > 0 && rect.height > 0
);

const pointerInProject = (event: React.PointerEvent<HTMLElement>, projectSize: ProjectSize): Point => {
  const layer = event.currentTarget.closest('[data-selection-layer]');
  if (!(layer instanceof HTMLElement)) return { x: 0, y: 0 };
  const bounds = layer.getBoundingClientRect();
  return screenPointToProject(
    { x: event.clientX, y: event.clientY },
    fitProjectToRect(bounds, projectSize),
    projectSize,
  );
};

/**
 * Scales the measured box around the fixed resize corner and maps the visual
 * scale change back onto the instance transform.
 */
export function measuredResizeTransform(
  initial: MotionEffectInstance['transform'],
  rect: InstanceRect,
  corner: ResizeCorner,
  pointer: Point,
  projectSize: ProjectSize,
): MotionEffectInstance['transform'] {
  const leftCorner = corner.includes('left');
  const topCorner = corner.includes('top');
  const anchor = {
    x: leftCorner ? rect.left + rect.width : rect.left,
    y: topCorner ? rect.top + rect.height : rect.top,
  };
  const diagonal = {
    x: leftCorner ? rect.left - anchor.x : rect.left + rect.width - anchor.x,
    y: topCorner ? rect.top - anchor.y : rect.top + rect.height - anchor.y,
  };
  const denominator = diagonal.x ** 2 + diagonal.y ** 2;
  const pointerVector = { x: pointer.x - anchor.x, y: pointer.y - anchor.y };
  const ratio = denominator > 0
    ? (pointerVector.x * diagonal.x + pointerVector.y * diagonal.y) / denominator
    : 1;
  const bounded = Math.max(0.05, ratio);
  // Keep the scaled box inside the project bounds.
  const widthAt = (t: number) => rect.width * t;
  const heightAt = (t: number) => rect.height * t;
  const leftAt = (t: number) => (leftCorner ? anchor.x - widthAt(t) : anchor.x);
  const topAt = (t: number) => (topCorner ? anchor.y - heightAt(t) : anchor.y);
  let t = bounded;
  if (leftAt(t) < 0) t = Math.max(0.05, (leftCorner ? anchor.x : projectSize.width - anchor.x) / Math.max(1, rect.width));
  if (topAt(t) < 0) t = Math.min(t, Math.max(0.05, (topCorner ? anchor.y : projectSize.height - anchor.y) / Math.max(1, rect.height)));
  if (!leftCorner && leftAt(t) + widthAt(t) > projectSize.width) {
    t = Math.min(t, Math.max(0.05, (projectSize.width - anchor.x) / Math.max(1, rect.width)));
  }
  if (!topCorner && topAt(t) + heightAt(t) > projectSize.height) {
    t = Math.min(t, Math.max(0.05, (projectSize.height - anchor.y) / Math.max(1, rect.height)));
  }
  // The visual offset between posX/posY and the box origin scales with t.
  const offsetLeft = rect.left - initial.x;
  const offsetTop = rect.top - initial.y;
  return {
    x: Math.min(Math.max(0, leftAt(t) - offsetLeft * t), projectSize.width),
    y: Math.min(Math.max(0, topAt(t) - offsetTop * t), projectSize.height),
    scale: initial.scale * t,
    rotation: initial.rotation,
  };
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  effect,
  footprint,
  measuredRect = null,
  fittedRect,
  projectSize,
  selected,
  stackRank = 0,
  stackCount = 1,
  editorMode,
  onSelect,
  onTransform,
}) => {
  const pointerSession = useRef<PointerSession | null>(null);
  if (!editorMode) return null;

  const measured = usableRect(measuredRect);
  const box = measured
    ? measuredRect!
    : {
      left: effect.transform.x,
      top: effect.transform.y,
      width: footprint.width * effect.transform.scale,
      height: footprint.height * effect.transform.scale,
    };

  const startPointer = (
    event: React.PointerEvent<HTMLElement>,
    mode: PointerSession['mode'],
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(effect.instanceId);
    pointerSession.current = {
      mode,
      start: pointerInProject(event, projectSize),
      initial: { ...effect.transform },
      rect: { ...box },
      measured,
    };
  };

  const movePointer = (event: React.PointerEvent<HTMLElement>) => {
    const session = pointerSession.current;
    if (!session) return;
    const point = pointerInProject(event, projectSize);
    let transform: MotionEffectInstance['transform'];
    if (session.mode === 'move') {
      const deltaX = point.x - session.start.x;
      const deltaY = point.y - session.start.y;
      if (session.measured) {
        const minX = session.initial.x - session.rect.left;
        const maxX = projectSize.width - session.rect.width + minX;
        const minY = session.initial.y - session.rect.top;
        const maxY = projectSize.height - session.rect.height + minY;
        transform = {
          ...session.initial,
          x: Math.min(maxX, Math.max(minX, session.initial.x + deltaX)),
          y: Math.min(maxY, Math.max(minY, session.initial.y + deltaY)),
        };
      } else {
        transform = clampTransformToProject({
          ...session.initial,
          x: session.initial.x + deltaX,
          y: session.initial.y + deltaY,
        }, footprint, projectSize);
      }
    } else if (session.measured) {
      transform = measuredResizeTransform(session.initial, session.rect, session.mode, point, projectSize);
    } else {
      transform = resizeTransformFromCorner(session.initial, footprint, session.mode, point, projectSize);
    }
    onTransform(effect.instanceId, transform);
  };

  const endPointer = (event: React.PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pointerSession.current = null;
  };

  const left = fittedRect.left + box.left * fittedRect.scale;
  const top = fittedRect.top + box.top * fittedRect.scale;
  const width = box.width * fittedRect.scale;
  const height = box.height * fittedRect.scale;

  return (
    <div
      data-selection-box={effect.instanceId}
      data-selection-box-size={`${Math.round(box.width)}x${Math.round(box.height)}`}
      aria-label={`选择 ${effect.componentId}`}
      role="button"
      tabIndex={0}
      onPointerDown={(event) => startPointer(event, 'move')}
      onPointerMove={movePointer}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      style={{
        position: 'absolute', left, top, width, height,
        border: selected ? '2px solid #4cc9f0' : '1px solid transparent',
        background: selected ? 'rgba(76, 201, 240, 0.06)' : 'transparent',
        cursor: 'move', touchAction: 'none', pointerEvents: 'auto',
        zIndex: selectionOverlayZIndex(selected, stackRank, stackCount),
      }}
    >
      {selected && corners.map((corner) => (
        <span
          key={corner}
          data-resize-corner={corner}
          role="button"
          aria-label={`缩放 ${corner}`}
          onPointerDown={(event) => startPointer(event, corner)}
          onPointerMove={movePointer}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          style={{
            position: 'absolute',
            left: corner.includes('left') ? -6 : undefined,
            right: corner.includes('right') ? -6 : undefined,
            top: corner.includes('top') ? -6 : undefined,
            bottom: corner.includes('bottom') ? -6 : undefined,
            width: 12, height: 12, borderRadius: 2,
            background: '#eef2ff', border: '2px solid #4cc9f0',
            cursor: corner === 'top-left' || corner === 'bottom-right' ? 'nwse-resize' : 'nesw-resize',
            touchAction: 'none',
          }}
        />
      ))}
    </div>
  );
};
