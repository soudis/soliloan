'use client';

import { paddingPropsToReactStyle } from '@/lib/templates/padding-utils';
import { useLogo } from '../../logo-context';

export function ImageBlock({
  src,
  width = '100%',
  useLogoSource = false,
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
}: {
  src: string;
  width?: string;
  useLogoSource?: boolean;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
}) {
  const { projectLogo, appLogo } = useLogo();
  const uploadedSrc = src.startsWith('data:') || src.startsWith('/') ? src : '';
  const resolvedSrc = useLogoSource ? projectLogo || appLogo : uploadedSrc;

  return (
    <div
      className="my-2 inline-block"
      style={{
        width,
        ...paddingPropsToReactStyle({ padding, paddingTop, paddingRight, paddingBottom, paddingLeft }),
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: template canvas preview */}
      <img src={resolvedSrc} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
    </div>
  );
}
