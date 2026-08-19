'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/mixpanel';

export default function MixpanelProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      trackEvent('$pageview', {
        $current_url: url,
        pathname: pathname
      });
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
