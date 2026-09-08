import { describe, expect, it } from 'vitest';
import { convertCnNumerals } from './cnNumbers';

describe('convertCnNumerals', () => {
  it('converts plain integer Chinese numerals', () => {
    expect(convertCnNumerals('一百五十')).toBe('150');
    expect(convertCnNumerals('三十')).toBe('30');
    expect(convertCnNumerals('十五')).toBe('15');
    expect(convertCnNumerals('二百零五')).toBe('205');
    expect(convertCnNumerals('二百五十')).toBe('250');
    expect(convertCnNumerals('三千二百零八')).toBe('3208');
    expect(convertCnNumerals('十五万')).toBe('150000');
    expect(convertCnNumerals('三百二十万')).toBe('3200000');
    expect(convertCnNumerals('一亿五千万')).toBe('150000000');
  });

  it('converts decimals through 点', () => {
    expect(convertCnNumerals('八点五')).toBe('8.5');
    expect(convertCnNumerals('零点五')).toBe('0.5');
    expect(convertCnNumerals('十点二五')).toBe('10.25');
  });

  it('converts 百分之 to percent form', () => {
    expect(convertCnNumerals('百分之二十')).toBe('20%');
    expect(convertCnNumerals('百分之十')).toBe('10%');
    expect(convertCnNumerals('提升了百分之三')).toBe('提升了3%');
  });

  it('keeps surrounding text intact', () => {
    expect(convertCnNumerals('做出一百五十种不好看的特效')).toBe('做出150种不好看的特效');
    expect(convertCnNumerals('对比一百五十种与十种特效')).toBe('对比150种与10种特效');
    expect(convertCnNumerals('每帧耗时零点五秒')).toBe('每帧耗时0.5秒');
  });

  it('leaves single numerals without a counting quantifier untouched', () => {
    expect(convertCnNumerals('第二')).toBe('第二');
    expect(convertCnNumerals('三思而后行')).toBe('三思而后行');
    expect(convertCnNumerals('两人合作')).toBe('两人合作');
    expect(convertCnNumerals('十分感谢')).toBe('十分感谢');
  });

  it('converts single numerals followed by a counting quantifier', () => {
    expect(convertCnNumerals('五个方案')).toBe('5个方案');
    expect(convertCnNumerals('与十种特效对比')).toBe('与10种特效对比');
  });

  it('leaves time-like expressions alone', () => {
    expect(convertCnNumerals('八点五十分开会')).toBe('八点五十分开会');
    expect(convertCnNumerals('三点半')).toBe('三点半');
  });

  it('leaves existing Arabic numerals and ASCII untouched', () => {
    expect(convertCnNumerals('视频150帧每秒')).toBe('视频150帧每秒');
    expect(convertCnNumerals('fx-05 tags')).toBe('fx-05 tags');
  });

  it('handles empty/edge input', () => {
    expect(convertCnNumerals('')).toBe('');
    expect(convertCnNumerals(undefined as unknown as string)).toBe(undefined);
  });
});
