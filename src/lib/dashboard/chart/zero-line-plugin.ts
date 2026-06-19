import type { Plugin } from 'chart.js';

export const zeroLinePlugin: Plugin = {
  id: 'zeroReferenceLine',
  afterDraw(chart) {
    const yScale = chart.scales.y;
    if (!yScale) {
      return;
    }

    const zeroPixel = yScale.getPixelForValue(0);
    if (zeroPixel < yScale.top || zeroPixel > yScale.bottom) {
      return;
    }

    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground').trim() || 'currentColor';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(chartArea.left, zeroPixel);
    ctx.lineTo(chartArea.right, zeroPixel);
    ctx.stroke();
    ctx.restore();
  },
};
