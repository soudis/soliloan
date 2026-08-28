'use client';

import { useLogo } from '../../logo-context';

export function ImageBlock({
  src,
  width = '100%',
  useLogoSource = false,
}: {
  src: string;
  width?: string;
  useLogoSource?: boolean;
}) {
  const { projectLogo, appLogo } = useLogo();
  const resolvedSrc = useLogoSource ? projectLogo || appLogo : src;

  return (
    <div className="my-2 inline-block" style={{ width }}>
      {/* biome-ignore lint/performance/noImgElement: template canvas preview */}
      <img src={resolvedSrc} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
    </div>
  );
}
