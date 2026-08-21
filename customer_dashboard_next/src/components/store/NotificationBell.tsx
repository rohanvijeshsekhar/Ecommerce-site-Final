'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  Package,
  ShieldAlert,
  HelpCircle,
  Award,
  Tag,
  Info,
  Clock,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { notificationService, NotificationItem } from '../../lib/services/notificationService';
import { useAuth } from '../../hooks/useAuth';

interface NotificationBellProps {
  onOpenLoginModal?: () => void;
}

export default function NotificationBell({ onOpenLoginModal }: NotificationBellProps = {}) {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll for unread count every 30 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Ignore background fetch errors
    }
  };

  const fetchRecentNotifications = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await notificationService.getNotifications({ page: 1, page_size: 6 });
      setNotifications(data.results || []);
    } catch {
      // Gracefully handle error
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchRecentNotifications();
    }
    setIsOpen(!isOpen);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      const target = notifications.find((n) => n.id === id);
      if (target && !target.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {}
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ORDERS':
        return <Package className="w-4 h-4 text-teal-600" />;
      case 'AUTHENTICATION':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      case 'SUPPORT':
        return <HelpCircle className="w-4 h-4 text-sky-600" />;
      case 'WARRANTY':
        return <Award className="w-4 h-4 text-indigo-600" />;
      case 'OFFERS':
        return <Tag className="w-4 h-4 text-rose-600" />;
      default:
        return <Info className="w-4 h-4 text-slate-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'HIGH' || priority === 'URGENT') {
      return (
        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-rose-100 text-rose-700 tracking-wider">
          {priority}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Navbar Bell Button */}
      <button
        onClick={() => {
          if (!isAuthenticated) {
            onOpenLoginModal?.();
            return;
          }
          handleToggle();
        }}
        className="relative flex flex-col items-center justify-center text-slate-800 hover:text-[#006670] transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <div className="relative">
          <Bell className="w-[20px] h-[20px] stroke-[1.8] mb-0.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-[#004d54] text-white text-[8px] font-black rounded-full w-[14px] h-[14px] flex items-center justify-center border border-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold tracking-wider uppercase leading-none mt-0.5">NOTIFICATIONS</span>
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="bg-[#006670] p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-200" />
              <h3 className="text-xs md:text-sm font-bold">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-medium text-teal-100 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-1">We will notify you when updates arrive.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 transition-colors flex items-start gap-3 relative group ${
                    !item.is_read ? 'bg-teal-50/40 hover:bg-teal-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Category Icon */}
                  <div className="p-2 rounded-xl bg-white shadow-sm border border-slate-100 shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>

                  {/* Body Text */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{item.title}</h4>
                      {getPriorityBadge(item.priority)}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{item.message}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {item.action_url && (
                        <Link
                          href={item.action_url}
                          onClick={() => setIsOpen(false)}
                          className="text-[#006670] font-bold hover:underline inline-flex items-center gap-0.5"
                        >
                          View <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="absolute right-2 top-3 flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    {!item.is_read && (
                      <button
                        onClick={(e) => handleMarkRead(item.id, e)}
                        title="Mark as read"
                        className="p-1 text-slate-400 hover:text-teal-600 rounded cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      title="Delete"
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer View All Link */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-[#006670] hover:text-[#004e56] inline-flex items-center gap-1 hover:underline"
            >
              View All Notifications <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
