import { Suspense } from 'react';

import { InviteAcceptClient } from './InviteAcceptClient';

export default function InvitePage() {
  return (
    <Suspense>
      <InviteAcceptClient />
    </Suspense>
  );
}
