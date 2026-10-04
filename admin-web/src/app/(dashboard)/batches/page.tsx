'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyBatchesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/placement-batches');
  }, [router]);

  return null;
}
