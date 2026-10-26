'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * A QR link from a public machine is not proof of material acceptance.
 * Pending sessions may be shown to users but must never mint Green Points.
 */
export function useRewardHandler(): string | null {
  const searchParams = useSearchParams();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) return;

    const points = searchParams.get('points') || searchParams.get('point');
    if (points) {
      setNotice(
        'Your recycling session was received, but no Green Points have been credited. ' +
        'Rewards will appear only after the machine deposit is verified.',
      );
    } else {
      setNotice(
        'Recycling session received. Points will appear after machine verification.',
      );
    }

    // Remove client-controlled reward parameters from the URL.
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('code');
    nextUrl.searchParams.delete('points');
    nextUrl.searchParams.delete('point');
    window.history.replaceState({}, document.title, nextUrl.pathname + nextUrl.search + nextUrl.hash);
  }, [searchParams]);

  return notice;
}
