import { describe, expect, it } from 'vitest';
import {
  PROJECT_SIZE,
  clampTransformToProject,
  fitProjectToRect,
  projectPointToScreen,
  resizeTransformFromCorner,
  screenPointToProject,
} from './coordinates';

describe('editor coordinate conversion', () => {
  it('maps a fitted 16:9 preview to 1920x1080 project coordinates', () => {
    const fitted = fitProjectToRect({ left: 100, top: 50, width: 960, height: 540 });

    expect(fitted).toEqual({ left: 100, top: 50, width: 960, height: 540, scale: 0.5 });
    expect(screenPointToProject({ x: 580, y: 320 }, fitted)).toEqual({ x: 960, y: 540 });
    expect(projectPointToScreen({ x: 1920, y: 1080 }, fitted)).toEqual({ x: 1060, y: 590 });
  });

  it('removes horizontal and vertical letterboxing before mapping the pointer', () => {
    const wide = fitProjectToRect({ left: 10, top: 20, width: 1200, height: 600 });
    const tall = fitProjectToRect({ left: 30, top: 40, width: 600, height: 600 });

    expect(wide).toEqual({ left: 76.66666666666663, top: 20, width: 1066.6666666666667, height: 600, scale: 5 / 9 });
    expect(screenPointToProject({ x: wide.left, y: wide.top }, wide)).toEqual({ x: 0, y: 0 });
    expect(screenPointToProject({ x: wide.left + wide.width, y: wide.top + wide.height }, wide)).toEqual({
      x: PROJECT_SIZE.width, y: PROJECT_SIZE.height,
    });

    expect(tall).toEqual({ left: 30, top: 171.25, width: 600, height: 337.5, scale: 0.3125 });
    expect(screenPointToProject({ x: 330, y: 340 }, tall)).toEqual({ x: 960, y: 540 });
  });

  it('uses the current fitted scale after the player resizes', () => {
    const before = fitProjectToRect({ left: 0, top: 0, width: 960, height: 540 });
    const after = fitProjectToRect({ left: 0, top: 0, width: 480, height: 270 });

    expect(screenPointToProject({ x: 240, y: 135 }, before)).toEqual({ x: 480, y: 270 });
    expect(screenPointToProject({ x: 240, y: 135 }, after)).toEqual({ x: 960, y: 540 });
  });

  it('uses the active project dimensions instead of assuming 1920x1080', () => {
    const fitted = fitProjectToRect(
      { left: 0, top: 0, width: 1000, height: 1000 },
      { width: 1000, height: 1000 },
    );

    expect(fitted).toEqual({ left: 0, top: 0, width: 1000, height: 1000, scale: 1 });
    expect(screenPointToProject({ x: 500, y: 500 }, fitted, { width: 1000, height: 1000 })).toEqual({ x: 500, y: 500 });
  });

  it('clamps placement from the declared planning footprint and scale', () => {
    const footprint = { width: 700, height: 540 };

    expect(clampTransformToProject({ x: 1800, y: -50, scale: 1, rotation: 12 }, footprint)).toEqual({
      x: 1220, y: 0, scale: 1, rotation: 12,
    });
    expect(clampTransformToProject({ x: 10, y: 10, scale: 10, rotation: 0 }, footprint)).toEqual({
      x: 10, y: 0, scale: 2, rotation: 0,
    });
  });

  it.each(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const)(
    'resizes proportionally from the %s corner while keeping the opposite corner fixed',
    (corner) => {
      const initial = { x: 900, y: 400, scale: 1, rotation: 0 };
      const footprint = { width: 400, height: 200 };
      const opposite = {
        x: corner.includes('left') ? initial.x + 400 : initial.x,
        y: corner.includes('top') ? initial.y + 200 : initial.y,
      };
      const pointer = {
        x: opposite.x + (corner.includes('left') ? -800 : 800),
        y: opposite.y + (corner.includes('top') ? -400 : 400),
      };

      const resized = resizeTransformFromCorner(initial, footprint, corner, pointer);
      expect(resized.scale).toBe(2);
      expect(corner.includes('left') ? resized.x + footprint.width * resized.scale : resized.x).toBe(opposite.x);
      expect(corner.includes('top') ? resized.y + footprint.height * resized.scale : resized.y).toBe(opposite.y);
    },
  );

  it('never returns negative or non-finite values when a corner crosses its anchor', () => {
    const resized = resizeTransformFromCorner(
      { x: 300, y: 200, scale: 1, rotation: 0 },
      { width: 400, height: 200 },
      'top-left',
      { x: Number.NaN, y: Number.POSITIVE_INFINITY },
    );

    expect(resized.scale).toBeGreaterThan(0);
    expect(Object.values(resized).every(Number.isFinite)).toBe(true);
  });
});
