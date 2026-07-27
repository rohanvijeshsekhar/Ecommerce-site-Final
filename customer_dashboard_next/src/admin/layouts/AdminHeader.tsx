'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu, Search, Bell, ChevronDown, LogOut,
  User, Settings, X, Command, CheckCheck
} from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { useBreadcrumb } from '../contexts/BreadcrumbContext';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_LABELS } from '../types/admin';
import type { AdminNotification } from '../types/admin';
import { notificationsService } from '../services/adminService';

const AdminHeader: React.FC = () => {
  const { setMobileSidebarOpen, isSearchOpen, setSearchOpen, searchQuery,
    setSearchQuery, unreadNotifCount, setUnreadNotifCount, adminRole } = useAdmin();
  const { breadcrumbs } = useBreadcrumb();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setSearchOpen, setSearchQuery]);

  useEffect(() => {
    notificationsService.getAll().then((res) => {
      if (res.success && res.data) {
        setNotifications(res.data);
        setUnreadNotifCount(res.data.filter((n) => !n.isRead).length);
      }
    });
  }, [setUnreadNotifCount]);

  const handleMarkAllRead = async () => {
    await notificationsService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadNotifCount(0);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  const userName = user
    ? user.full_name?.trim() || user.email
    : 'Admin User';

  return (
    <header className="sticky top-4 z-20 mx-4 md:mx-6 bg-white/50 backdrop-blur-xl border border-white/40 rounded-[20px] shadow-[0_8px_32px_rgba(0,95,99,0.04)] px-4 md:px-6 transition-all duration-200">
      <div className="flex items-center gap-3 h-[64px]">

        {/* Left: mobile hamburger + breadcrumb */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          <nav className="hidden md:flex items-center gap-1.5 text-[12px] text-slate-450 truncate">
            <span className="font-semibold text-slate-800">FAAZO</span>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                <span className="text-slate-350 mx-0.5">/</span>
                {crumb.path && i < breadcrumbs.length - 1 ? (
                  <Link href={crumb.path} className="hover:text-[#005F63] font-medium transition-colors truncate">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-600 font-medium truncate">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Centre: global search bar */}
        <div className="hidden md:flex flex-1 max-w-md relative">
          <div
            onClick={() => { setSearchOpen(true); searchRef.current?.focus(); }}
            className={`flex items-center w-full gap-2.5 px-3.5 py-2 rounded-xl border transition-all duration-200 cursor-text
              ${isSearchOpen
                ? 'border-[#005F63] ring-4 ring-[#005F63]/5 bg-white shadow-xs'
                : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200'}`}
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search products, orders, customers…"
              className="flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 font-medium min-w-0"
            />
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-650">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white border border-slate-100 rounded-lg px-2 py-0.5 shadow-2xs">
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
            )}
          </div>

          {isSearchOpen && searchQuery && (
            <div className="absolute top-full mt-2.5 left-0 right-0 bg-white border border-slate-100
              rounded-[18px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden z-50 p-1">
              <div className="px-4 py-3 border-b border-slate-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Results for "{searchQuery}"
                </p>
              </div>
              <div className="px-4 py-6 text-center">
                <p className="text-xs font-medium text-slate-400">Live search results</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: notification + profile */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2.5 w-80 bg-white border border-slate-100
                rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden z-50 p-1.5">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800">Notifications</h3>
                    {unreadNotifCount > 0 && (
                      <span className="text-[9px] font-bold bg-[#005F63] text-white px-1.5 py-0.5 rounded-full">
                        {unreadNotifCount}
                      </span>
                    )}
                  </div>
                  {unreadNotifCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-[10px] text-[#005F63] font-bold hover:underline"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50/50">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`px-3 py-2.5 hover:bg-slate-50/60 rounded-xl transition-all duration-200 cursor-pointer
                          ${!n.isRead ? 'bg-[#005F63]/[0.02]' : ''}`}
                      >
                        <div className="flex items-start gap-2.5">
                          {!n.isRead && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#005F63] shrink-0 mt-1.5" />
                          )}
                          <div className={!n.isRead ? '' : 'pl-4'}>
                            <p className={`text-xs font-bold ${!n.isRead ? 'text-slate-800' : 'text-slate-600'}`}>
                              {n.title}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5 font-medium line-clamp-2">{n.message}</p>
                            <p className="text-[9px] text-slate-350 mt-1 font-semibold">
                              {new Date(n.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-3 py-2 border-t border-slate-55 mt-1">
                  <Link
                    href="/admin/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="block text-center text-[10px] font-bold text-[#005F63] hover:underline"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
              className="flex items-center gap-2.5 pl-2 pr-1.5 py-1 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden relative">
                <img
                  src="/images/Artboard 1@4x (1).png"
                  alt="FAAZO Logo"
                  className="h-[74%] max-w-none object-contain absolute left-[-1.5px] top-1/2 -translate-y-1/2"
                  style={{ width: 'auto' }}
                />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[100px]">{userName}</p>
                <p className="text-[9px] font-semibold text-slate-400 leading-tight mt-0.5">{ROLE_LABELS[adminRole] || 'Admin'}</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden sm:block
                ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2.5 w-56 bg-white border border-slate-100
                rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden z-50 p-1.5">
                <div className="px-3.5 py-3 border-b border-slate-50">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center mb-2 border border-slate-100 overflow-hidden relative">
                    <img
                      src="/images/Artboard 1@4x (1).png"
                      alt="FAAZO Logo"
                      className="h-[74%] max-w-none object-contain absolute left-[-1.5px] top-1/2 -translate-y-1/2"
                      style={{ width: 'auto' }}
                    />
                  </div>
                  <p className="text-xs font-bold text-slate-800 truncate">{userName}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{ROLE_LABELS[adminRole] || 'Administrator'}</p>
                </div>

                <div className="py-1 space-y-0.5">
                  <Link
                    href="/admin/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
                  >
                    <User className="w-4 h-4 text-slate-400" /> My Profile
                  </Link>
                  <Link
                    href="/admin/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
                  >
                    <Settings className="w-4 h-4 text-slate-400" /> Settings
                  </Link>
                </div>

                <div className="border-t border-slate-50 py-1 mt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 rounded-xl
                      hover:bg-rose-50/50 transition-colors w-full text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" /> Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
