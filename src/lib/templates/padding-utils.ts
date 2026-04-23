/**
 * Per-side padding for template blocks (px, CSS). `padding` is the base; optional
 * `paddingTop` etc. override individual sides when set.
 */

import type { CSSProperties } from 'react';

export type PaddingSides = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type PaddingPropsInput = {
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
} | null;

export function resolvePaddingPx(props: PaddingPropsInput): PaddingSides {
  const base = props?.padding ?? 0;
  return {
    top: props?.paddingTop ?? base,
    right: props?.paddingRight ?? base,
    bottom: props?.paddingBottom ?? base,
    left: props?.paddingLeft ?? base,
  };
}

/** CSS `padding: top right bottom left` for inline HTML email. */
export function paddingSidesToCss(sides: PaddingSides): string {
  return `${sides.top}px ${sides.right}px ${sides.bottom}px ${sides.left}px`;
}

export function paddingPropsToCssString(props: PaddingPropsInput): string {
  return paddingSidesToCss(resolvePaddingPx(props));
}

/** React inline style (unitless numbers = px). */
export function paddingPropsToReactStyle(props: PaddingPropsInput): CSSProperties {
  const s = resolvePaddingPx(props);
  return {
    paddingTop: s.top,
    paddingRight: s.right,
    paddingBottom: s.bottom,
    paddingLeft: s.left,
  };
}

/** @react-pdf/renderer / Yoga use points; convert CSS px with the same factor as elsewhere. */
export function paddingPropsToPdfPoints(
  props: PaddingPropsInput,
  pxToPt: (px: number) => number,
): { paddingTop: number; paddingRight: number; paddingBottom: number; paddingLeft: number } {
  const s = resolvePaddingPx(props);
  return {
    paddingTop: pxToPt(s.top),
    paddingRight: pxToPt(s.right),
    paddingBottom: pxToPt(s.bottom),
    paddingLeft: pxToPt(s.left),
  };
}
