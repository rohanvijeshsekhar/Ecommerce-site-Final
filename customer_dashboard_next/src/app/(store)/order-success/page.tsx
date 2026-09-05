'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/contexts/StoreContext';
import OrderSuccessPage from '@/components/store/OrderSuccessPage';

export default function OrderSuccessRoute() {
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

  const handleActiveTrackingOrder = (id: string | null) => {
    if (id) {
      router.push(`/orders/${id}`);
    }
  };

  return (
    <OrderSuccessPage
      orderData={store.completedOrderData}
      setCurrentView={handleViewChange}
      setActiveTrackingOrderId={handleActiveTrackingOrder}
    />
  );
}
