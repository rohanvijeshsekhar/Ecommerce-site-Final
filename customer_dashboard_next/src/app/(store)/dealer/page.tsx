'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/contexts/StoreContext';
import DealerPortalPage from '@/components/store/DealerPortalPage';

export default function DealerPortalRoute() {
  const router = useRouter();
  const store = useStore();

  const handleViewChange = (view: string) => {
    if (view === 'home') router.push('/');
    else if (view === 'portfolio') router.push('/search');
    else if (view === 'my-orders') {
      store.setDashboardSection('orders');
      router.push('/profile');
    }
  };

  return (
    <DealerPortalPage
      setCurrentView={handleViewChange}
      setDashboardSection={store.setDashboardSection}
      showToast={store.showToast}
    />
  );
}
