'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';

const VISITOR_ID_KEY = 'faazo_visitor_id';
const HEARTBEAT_INTERVAL_MS = 45000; // 45 seconds

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id || id.length < 16) {
      id = 'vis_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return 'vis_anon_' + Date.now();
  }
}

export default function StorefrontHeartbeat() {
  const pathname = usePathname();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Strict admin route exclusion
    if (!pathname || pathname === '/admin' || pathname.startsWith('/admin/')) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;

    const sendHeartbeat = () => {
      // Avoid sending when document is hidden in background tab
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      api.post('analytics/heartbeat/', {
        visitor_id: visitorId,
        path: pathname,
      }).catch(() => {
        // Silently ignore network failures in heartbeat
      });
    };

    // Send immediately on page mount / navigation
    sendHeartbeat();

    // Periodic heartbeat
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pathname]);

  return null;
}
