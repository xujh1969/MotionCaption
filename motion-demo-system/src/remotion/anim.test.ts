import { describe, expect, it } from 'vitest';
import { easeOutExpo, useCount } from './anim';

describe('easeOutExpo 端点收敛', () => {
  it('t=1 时精确为 1（Remotion 的 Easing.out(Easing.exp) 只有 0.99902）', () => {
    expect(easeOutExpo(1)).toBe(1);
    expect(easeOutExpo(1.5)).toBe(1);
  });

  it('t<1 时符合 1 - 2^(-10t) 标准曲线', () => {
    expect(easeOutExpo(0.5)).toBeCloseTo(1 - Math.pow(2, -5), 12);
    expect(easeOutExpo(0)).toBe(0);
  });
});

describe('useCount 最终值精确', () => {
  it('4 位数回归：9876 停在 9876，而不是 9866', () => {
    expect(useCount(20 + 34, 9876, 20, 34)).toBe(9876);
    expect(useCount(999, 9876, 20, 34)).toBe(9876);
  });

  it('各量级数值动画结束后都精确到达目标', () => {
    expect(useCount(999, 120, 14, 32)).toBe(120);
    expect(useCount(999, 505, 20, 34)).toBe(505);
    expect(useCount(999, 999, 14, 32)).toBe(999);
    expect(useCount(999, 50, 20, 34)).toBe(50);
  });
});
