'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { notificationsService } from '@/admin/services/adminService';
import type { AdminNotification } from '@/admin/types/admin';
import { useAdmin } from '@/admin/contexts/AdminContext';
import { useBreadcrumbSync } from '@/admin/contexts/BreadcrumbContext';
import { useToast } from '@/admin/components/Toast';

export default function AdminNotificationsPage() {
  useBreadcrumbSync([
    { label: 'Intelligence' },
    { label: 'Notifications', path: '/admin/notifications' },
  ]);

  const router = useRouter();
  const toast = useToast();
  const { setUnreadNotifCount } = useAdmin();

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, count] = await Promise.all([
        notificationsService.getAll(),
        notificationsService.getUnreadCount(),
      ]);
      if (listRes.success && Array.isArray(listRes.data)) {
        setNotifications(listRes.data);
      } else {
        setError(listRes.message || 'Failed to load notifications.');
      }
      setUnreadNotifCount(count);
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to notification service.');
    } finally {
      setLoading(false);
    }
  }, [setUnreadNotifCount]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (n: AdminNotification) => {
    if (!n.isRead) {
      const res = await notificationsService.markAsRead(n.id);
      if (res.success) {
        setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)));
        const unreadRemaining = notifications.filter((item) => !item.isRead && item.id !== n.id).length;
        setUnreadNotifCount(unreadRemaining);
      } else {
        toast.error('Action failed', res.message || 'Could not mark notification as read.');
      }
    }
    if (n.actionPath) {
      router.push(n.actionPath);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await notificationsService.markAllAsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
        setUnreadNotifCount(0);
        toast.success('All caught up', 'All notifications marked as read.');
      } else {
        toast.error('Failed', res.message || 'Unable to mark notifications as read.');
      }
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const visible = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications Center</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time operational alerts for orders, dealers, warranty claims, and support tickets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadNotifications}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005F63] hover:bg-[#004c50] text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark All Read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-100 w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === 'all' ? 'bg-[#005F63] text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === 'unread' ? 'bg-[#005F63] text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadNotifications}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-[#005F63] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Loading notifications...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Bell className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {filter === 'unread'
                ? 'You have read all recent operational alerts.'
                : 'System alerts for orders, dealers, and support activity will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkRead(n)}
                className={`p-4 sm:px-6 hover:bg-slate-50/70 transition-colors cursor-pointer flex items-start justify-between gap-4 ${
                  !n.isRead ? 'bg-[#005F63]/[0.03]' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-1 shrink-0">
                    {!n.isRead ? (
                      <span className="block w-2 h-2 rounded-full bg-[#005F63]" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${!n.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(n.timestamp).toLocaleString('en-IN')}</span>
                      {n.type && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium capitalize">
                          {n.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!n.isRead && (
                  <span className="shrink-0 text-[11px] font-semibold text-[#005F63] bg-[#005F63]/10 px-2.5 py-1 rounded-full">
                    New
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
