'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  ExternalLink,
  Package,
  ShieldAlert,
  HelpCircle,
  Award,
  Tag,
  Info,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { notificationService, NotificationItem } from '../../../lib/services/notificationService';
import { useAuth } from '../../../hooks/useAuth';

export default function NotificationCenterPage() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [readFilter, setReadFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const params: any = { page: currentPage, page_size: 15 };
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (selectedPriority !== 'ALL') params.priority = selectedPriority;
      if (readFilter === 'UNREAD') params.is_read = false;
      if (readFilter === 'READ') params.is_read = true;

      const [listData, unread] = await Promise.all([
        notificationService.getNotifications(params),
        notificationService.getUnreadCount(),
      ]);

      setNotifications(listData.results);
      setTotalCount(listData.count);
      setUnreadCount(unread);
    } catch (err) {
      // Handle error gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, currentPage, selectedCategory, selectedPriority, readFilter]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {}
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all notifications?')) return;
    try {
      await notificationService.deleteAllNotifications();
      setNotifications([]);
      setTotalCount(0);
      setUnreadCount(0);
    } catch (err) {}
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ORDERS':
        return <Package className="w-5 h-5 text-teal-600" />;
      case 'AUTHENTICATION':
        return <ShieldAlert className="w-5 h-5 text-amber-600" />;
      case 'SUPPORT':
        return <HelpCircle className="w-5 h-5 text-sky-600" />;
      case 'WARRANTY':
        return <Award className="w-5 h-5 text-indigo-600" />;
      case 'OFFERS':
        return <Tag className="w-5 h-5 text-rose-600" />;
      default:
        return <Info className="w-5 h-5 text-slate-600" />;
    }
  };

  const categories = [
    { key: 'ALL', label: 'All Categories' },
    { key: 'ORDERS', label: 'Orders & Refunds' },
    { key: 'AUTHENTICATION', label: 'Security & Auth' },
    { key: 'SUPPORT', label: 'Support Tickets' },
    { key: 'WARRANTY', label: 'Warranty' },
    { key: 'OFFERS', label: 'Offers & Deals' },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 pt-[112px] lg:pt-[180px] pb-16">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center max-w-md">
          <Bell className="w-12 h-12 text-[#006670] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Sign in Required</h2>
          <p className="text-xs text-slate-500 mb-6">Please log in to your FAAZO account to view your notifications.</p>
          <Link href="/" className="bg-[#006670] text-white font-bold text-xs px-6 py-3 rounded-xl hover:bg-[#004e56] transition-all">
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-[112px] lg:pt-[180px] pb-16 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-[#006670] to-[#004e56] rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl md:text-2xl font-black">Notification Center</h1>
            </div>
            <p className="text-teal-100 text-xs md:text-sm">
              Manage all order updates, security alerts, support replies, and offer notifications.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
              >
                <CheckCheck className="w-4 h-4" /> Mark All Read ({unreadCount})
              </button>
            )}
            {totalCount > 0 && (
              <button
                onClick={handleDeleteAll}
                className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
              >
                <Trash2 className="w-4 h-4" /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => {
                  setSelectedCategory(cat.key);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedCategory === cat.key
                    ? 'bg-[#006670] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Read / Unread Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={readFilter}
              onChange={(e) => {
                setReadFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#006670]"
            >
              <option value="ALL">All Status</option>
              <option value="UNREAD">Unread Only</option>
              <option value="READ">Read Only</option>
            </select>

            <button
              onClick={fetchNotifications}
              title="Refresh Feed"
              className="p-2 text-slate-500 hover:text-[#006670] hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 mb-1">No notifications found</h3>
              <p className="text-xs text-slate-400">There are no notifications matching your selected criteria.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-5 transition-all flex items-start gap-4 group ${
                  !item.is_read ? 'bg-teal-50/30 hover:bg-teal-50/60' : 'hover:bg-slate-50'
                }`}
              >
                {/* Category Icon */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 shrink-0 mt-0.5 shadow-sm">
                  {getCategoryIcon(item.category)}
                </div>

                {/* Content Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-slate-800">{item.title}</h3>
                    {item.priority === 'HIGH' || item.priority === 'URGENT' ? (
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-rose-100 text-rose-700 tracking-wider">
                        {item.priority}
                      </span>
                    ) : null}
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">{item.message}</p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(item.created_at).toLocaleString()}
                    </span>

                    {item.deliveries && item.deliveries.length > 0 && (
                      <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                        Channels: {item.deliveries.map((d) => d.channel).join(', ')}
                      </span>
                    )}

                    {item.action_url && (
                      <Link
                        href={item.action_url}
                        className="text-[#006670] font-bold hover:underline inline-flex items-center gap-1"
                      >
                        Action Link <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {!item.is_read && (
                    <button
                      onClick={() => handleMarkRead(item.id)}
                      title="Mark as read"
                      className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Delete notification"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        {totalCount > 15 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Showing Page {currentPage} (Total {totalCount} notifications)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="p-2 border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage * 15 >= totalCount}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="p-2 border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
