import { Easing, interpolate } from 'remotion';

// 规范 0.4：按文档加载的浏览器无法联机时可回退。入场用极致缓出(EaseOutExpo)
export const easeOutExpo = Easing.out(Easing.exp);

// 呼吸动画：正弦韵律 1.5s（InOutSine 无限往复）
export function useBreath(frame: number, speed = 1, base = 1, amp = 0.04): number {
  const t = (frame / 45) * speed; // 1.5s周期 => 45帧@30fps
  const phase = Math.PI * 2 * t;
  return base + amp * Math.sin(phase);
}

// 条目级出现时机：row.at（秒，相对组件在时间轴上的起点）→ 入场帧（30fps）。
// at 缺失/空串/非法时回退到组件原有的均匀节奏（base + i * step 帧），保证旧数据行为不变。
export function atFrames(row: unknown, i: number, base: number, step: number): number {
  const raw = (row as { at?: unknown } | null)?.at;
  const empty = raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');
  if (!empty) {
    const at = Number(raw);
    if (Number.isFinite(at) && at >= 0) return Math.max(0, Math.round(at * 30));
  }
  return base + i * step;
}

// 入场：EaseOutExpo 缓出淡入（透明 -> 不透明）
export function useEnterOpacity(frame: number, delay = 0, duration = 32): number {
  return interpolate(frame, [delay, delay + duration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

// 入场：弹性缩放入场（scale 0 -> 1）
export function useEnterScale(frame: number, delay = 0, duration = 36): number {
  return interpolate(frame, [delay, delay + duration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export interface EnterMotion {
  opacity: number;
  scale: number;
  translateY: number;
}

// 组合入场：透明度 + 缩放 + 上移，EaseOutExpo
export function useEnter(
  frame: number,
  delay = 0,
  duration = 30,
  rise = 26,
): EnterMotion {
  const p = interpolate(frame, [delay, delay + duration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return {
    opacity: p,
    scale: interpolate(frame, [delay, delay + duration], [0.92, 1], {
      easing: easeOutExpo,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    translateY: (1 - p) * rise,
  };
}

// 行/条从底部向上生长（0 - 1）
export function useGrow(frame: number, delay = 0, duration = 36): number {
  return interpolate(frame, [delay, delay + duration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

// 线条从中心向两端生长（用于横向中线、双线）
export function useGrowCenter(frame: number, delay = 0, duration = 34): number {
  return interpolate(frame, [delay, delay + duration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

// 从顶部向下生长（竖向线 / 轨道）
export function useGrowDown(frame: number, delay = 0, duration = 36): number {
  return interpolate(frame, [delay, delay + duration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

// 数字滚动/计数动画
export function useCount(frame: number, target: number, delay = 20, duration = 34): number {
  const p = interpolate(frame, [delay, delay + duration], [0, 1], {
    easing: easeOutExpo,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return Math.round(target * p);
}

// 扫描光 135° 斜向掠过（用于数字组件）
export function useScan(frame: number, w = 400, period = 75): number {
  const cycle = frame % period;
  const pos = interpolate(cycle, [0, period], [-w, 720], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return pos;
}

// 扫描光沿指定宽度 `w` 全宽掠过（光束从左侧进入、右侧完全移出，覆盖整个组件）
export function useScanAcross(frame: number, w: number, period = 85, beamRatio = 0.4): number {
  const cycle = frame % period;
  const beam = Math.max(140, w * beamRatio);
  return interpolate(cycle, [0, period], [-beam, w], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}