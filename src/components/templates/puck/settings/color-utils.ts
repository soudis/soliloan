export type RgbaColor = { r: number; g: number; b: number; a: number };

export function parseColor(color: string | undefined): RgbaColor {
  if (!color || color === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: Number.parseInt(rgbaMatch[1], 10),
      g: Number.parseInt(rgbaMatch[2], 10),
      b: Number.parseInt(rgbaMatch[3], 10),
      a: rgbaMatch[4] ? Number.parseFloat(rgbaMatch[4]) : 1,
    };
  }

  const hexMatch = color.match(/^#([0-9A-Fa-f]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    return {
      r: Number.parseInt(hex.substring(0, 2), 16),
      g: Number.parseInt(hex.substring(2, 4), 16),
      b: Number.parseInt(hex.substring(4, 6), 16),
      a: 1,
    };
  }

  return { r: 0, g: 0, b: 0, a: 0 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export function rgbaToString(r: number, g: number, b: number, a: number): string {
  if (a === 0) return 'transparent';
  if (a === 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
