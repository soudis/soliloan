const CHART_CSS_VARS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'] as const;

/** SSR-safe fallbacks matching :root defaults in globals.css */
const FALLBACK_CHART_COLORS = [
  'oklch(0.8268 0.1082 306.3827)',
  'oklch(0.9049 0.0895 164.1501)',
  'oklch(0.8954 0.1275 88.5983)',
  'oklch(0.8555 0.0789 31.3294)',
  'oklch(0.7445 0.1816 352.0682)',
] as const;

function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function getChartDatasetColors(): string[] {
  return CHART_CSS_VARS.map((cssVar, index) =>
    readCssVar(cssVar, FALLBACK_CHART_COLORS[index] ?? FALLBACK_CHART_COLORS[0]),
  );
}

export function chartColorAtIndex(index: number): string {
  const colors = getChartDatasetColors();
  return colors[index % colors.length] ?? colors[0] ?? FALLBACK_CHART_COLORS[0];
}

function cssColorToRgb(color: string): [number, number, number] | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

export function chartColorWithAlpha(color: string, alpha: number): string {
  const rgb = cssColorToRgb(color);
  if (!rgb) {
    return color;
  }
  const [r, g, b] = rgb;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
