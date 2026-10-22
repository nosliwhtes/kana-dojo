import { describe, expect, it } from 'vitest';
import { parseColor, getContrastRatio } from './colorUtils';
import { parseOklch } from '../data/themes/themeColors';

describe('theme OKLCH contrast calculations', () => {
  it.each([
    ['oklch(0% 0 0)', { r: 0, g: 0, b: 0 }],
    ['oklch(100% 0 0)', { r: 255, g: 255, b: 255 }],
    ['oklch(62.7955% 0.257683 29.2339)', { r: 255, g: 0, b: 0 }],
    ['oklch(86.64396% 0.294827 142.49534)', { r: 0, g: 255, b: 0 }],
    ['oklch(45.20137% 0.313214 264.05202)', { r: 0, g: 0, b: 255 }],
  ])('converts reference sRGB colors: %s', (color, rgb) => {
    expect(parseColor(color)).toEqual(rgb);
  });

  it('calculates black/white contrast in the theme color format', () => {
    expect(getContrastRatio('oklch(100% 0 0)', 'oklch(0% 0 0)')).toBe(21);
  });

  it('distinguishes low percentages from normalized lightness', () => {
    expect(parseOklch('oklch(1% 0 0)')?.L).toBe(0.01);
    expect(parseOklch('oklch(1 0 0)')?.L).toBe(1);
  });

  it('rejects malformed values rather than reporting NaN contrast', () => {
    expect(() => parseColor('oklch(bad 0 0)')).toThrow();
  });
});
