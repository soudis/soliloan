export const CHART_DATASET_COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82ca9d',
  '#ffc658',
  '#a4de6c',
  '#d0ed57',
  '#8dd1e1',
] as const;

export function chartColorAtIndex(index: number): string {
  return CHART_DATASET_COLORS[index % CHART_DATASET_COLORS.length] ?? CHART_DATASET_COLORS[0];
}

export function chartColorWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
