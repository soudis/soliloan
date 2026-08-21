'use client';

import { BlockPaddingFields } from '../../block-padding-fields';
import { usePatchSelectedProps, useSelectedRecord } from '../use-puck-selected';

export function PaddingField() {
  const patch = usePatchSelectedProps();
  const props = useSelectedRecord();
  const paddingProps = {
    padding: Number(props.padding ?? 0),
    paddingTop: props.paddingTop as number | undefined,
    paddingRight: props.paddingRight as number | undefined,
    paddingBottom: props.paddingBottom as number | undefined,
    paddingLeft: props.paddingLeft as number | undefined,
  };

  return (
    <div className="px-4 py-3">
      <BlockPaddingFields
        idPrefix="puck"
        props={paddingProps}
        setProp={(updater) => {
          const next = { ...paddingProps };
          updater(next);
          patch(next);
        }}
      />
    </div>
  );
}
