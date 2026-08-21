'use client';

import { useCallback } from 'react';
import { usePatchSelectedProps, useSelectedRecord } from '../use-puck-selected';

type PaddingFieldProps = {
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
};

export function usePaddingAdapter() {
  const patch = usePatchSelectedProps();
  const props = useSelectedRecord();
  const padding = Number(props.padding ?? 0);
  const paddingTop = props.paddingTop as number | undefined;
  const paddingRight = props.paddingRight as number | undefined;
  const paddingBottom = props.paddingBottom as number | undefined;
  const paddingLeft = props.paddingLeft as number | undefined;
  const paddingProps: PaddingFieldProps = {
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
  };

  const setProp = useCallback(
    (updater: (next: PaddingFieldProps) => void) => {
      const next: PaddingFieldProps = { padding, paddingTop, paddingRight, paddingBottom, paddingLeft };
      updater(next);
      patch({
        padding: next.padding,
        paddingTop: next.paddingTop,
        paddingRight: next.paddingRight,
        paddingBottom: next.paddingBottom,
        paddingLeft: next.paddingLeft,
      });
    },
    [padding, paddingBottom, paddingLeft, paddingRight, paddingTop, patch],
  );

  return { paddingProps, setProp };
}
