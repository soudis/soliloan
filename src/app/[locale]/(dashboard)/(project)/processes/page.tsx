import { Suspense } from 'react';

import { ProcessesPage } from '@/components/processes/processes-page';

export default function ProcessesRoute() {
  return (
    <Suspense>
      <ProcessesPage />
    </Suspense>
  );
}
