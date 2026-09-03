'use client';

import React, { useEffect, Suspense } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-PVTHJXFXQ5';

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || !window.gtag) {
      return;
    }

    // STRICT ADMIN PANEL EXCLUSION CHECK
    const isAdminRoute = pathname === '/admin' || (pathname ? pathname.startsWith('/admin/') : false);
    if (isAdminRoute) {
      return;
    }

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    
    // Explicitly send page_view event ONLY for public storefront routes
    window.gtag('event', 'page_view', {
      page_path: url,
      page_title: typeof document !== 'undefined' ? document.title : '',
    });
  }, [pathname, searchParams]);

  return null;
}

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();

  if (!GA_MEASUREMENT_ID) return null;

  // STRICT ADMIN PANEL EXCLUSION
  // If the route is /admin or /admin/*, do NOT inject Gtag scripts or tracking telemetry
  const isAdminRoute = pathname === '/admin' || (pathname ? pathname.startsWith('/admin/') : false);
  if (isAdminRoute) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: false
            });
          `,
        }}
      />
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
