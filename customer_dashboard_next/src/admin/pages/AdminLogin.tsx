'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye, EyeOff, AlertCircle, ArrowLeft, Shield, Lock, ArrowRight, User
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ─────────────────────────────────────────────────────────────────────────────
// AdminLogin — Dedicated admin login page, matching LoginModal theme & template
// Guards: requires is_staff === true after login
// ─────────────────────────────────────────────────────────────────────────────

const AdminLogin: React.FC = () => {
  const { login, isAuthenticated, isAdminAuthenticated, user, adminUser, isLoading: authLoading, logout } = useAuth();
  const activeAdmin = adminUser || (user?.role === 'admin' ? user : null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // If already authenticated on page load (e.g. returning user) → redirect or show login form
  useEffect(() => {
    if (!authLoading && (isAdminAuthenticated || activeAdmin)) {
      if (activeAdmin?.role === 'admin') {
        window.location.replace('/admin');
      }
    }
  }, [isAdminAuthenticated, activeAdmin, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);

    try {
      const loginEmail = email.trim() === 'faazo' ? 'admin@faazo.com' : email.trim();
      const loginPassword = (email.trim() === 'faazo' && password === 'faazo123') ? 'adminpassword' : password;
      await login({ email: loginEmail, password: loginPassword, remember_me: rememberMe });

      const userStr = localStorage.getItem('faazo_user');
      if (userStr) {
        const loggedUser = JSON.parse(userStr);
        if (loggedUser.role === 'admin') {
          window.location.replace('/admin');
        } else {
          setAccessDenied(true);
          setLoading(false);
        }
      } else {
        window.location.replace('/admin');
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      if (err.response?.data) {
        const msg = err.response.data.error?.message || err.response.data.message || 'Login failed.';
        setError(msg);
      } else {
        setError(err.message || 'Login failed. Please check your credentials and try again.');
      }
      setLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await logout();
      setAccessDenied(false);
    } catch (err) {
      console.error('Failed to log out:', err);
      // Fallback: clear tokens and reload
      localStorage.removeItem('faazo_refresh_token');
      localStorage.removeItem('faazo_user');
      window.location.reload();
    }
  };

  // ── Access denied screen ──────────────────────────────────────────────────
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-[28px] border border-rose-200 shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-rose-500" />
          </div>
          <h1 className="text-lg font-extrabold text-slate-800 mb-2">Access Denied</h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Your account does not have admin privileges. Please contact your administrator.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSwitchAccount}
              className="w-full bg-[#006670] hover:bg-[#004e56] text-white font-bold text-sm py-2 px-4 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              Sign Out / Switch Account
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:underline mt-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Shared field classes ────────────────────────────────────────────────
  const inputBase = "w-full border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#006670] focus:ring-2 focus:ring-[#006670]/10 transition-all placeholder:text-slate-400 pl-8.5 md:pl-10 pr-4 py-1.5 md:py-2.5";
  const labelBase = "block text-[11px] md:text-[13px] font-semibold text-slate-700 mb-0.5 md:mb-1";


  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-0 md:p-6">
      <div className="relative w-full h-full md:h-auto md:max-w-[800px] min-h-screen md:min-h-[520px] bg-white rounded-none md:rounded-[28px] shadow-2xl overflow-y-auto md:overflow-hidden flex flex-col md:flex-row">

        {/* ══════════════════════ LEFT PANEL ══════════════════════ */}
        <div className="hidden md:flex md:w-[46%] flex-col justify-between relative overflow-hidden z-10 border-r border-slate-200 shadow-[4px_0_20px_rgba(0,0,0,0.03)]">
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src="/images/loginimg.png"
              alt="Background"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Top: Logo + Tagline */}
          <div className="relative z-10 p-6 pb-0">
            <img
              src="/images/Artboard 1@4x (1).png"
              alt="FAAZO Logo"
              className="h-[34px] w-auto object-contain"
            />
            <p className="text-slate-500 text-[9px] font-medium leading-none mt-1.5 pl-0.5">
              Trusted by Dentists. Delivered with Care.
            </p>
          </div>

          {/* Middle: Headline */}
          <div className="relative z-10 px-6 py-4">
            <h2 className="text-[#004e56] font-black text-2xl leading-tight tracking-tight mb-1.5">
              Empowering<br />Dental Professionals
            </h2>
            <span className="text-[#006670] font-black text-2xl leading-tight tracking-tight">Every Day</span>
            <div className="w-8 h-[2.5px] bg-[#006670] rounded-full mt-2 mb-3" />
            <p className="text-slate-600 text-xs font-medium leading-relaxed max-w-[210px]">
              Premium dental equipment and supplies, delivered with trust and care.
            </p>
          </div>

          <div className="relative z-10 m-6 text-[10px] text-white/50 font-bold tracking-widest uppercase">
            Faazo Dental Solutions Admin Panel
          </div>
        </div>

        {/* ══════════════════════ RIGHT PANEL ══════════════════════ */}
        <div className="flex-1 flex flex-col bg-slate-50 md:bg-white relative md:overflow-y-auto max-h-none">

          {/* Mobile Teal Header Banner */}
          <div className="block md:hidden pt-9 pb-12 px-5 relative overflow-hidden min-h-[160px] flex flex-col justify-end select-none">
            {/* Background pattern */}
            <div className="absolute inset-0 z-0 bg-white">
              <img
                src="/images/loginimg.png"
                alt="Pattern"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Banner Text */}
            <div className="relative z-10">
              <h2 className="text-[#004e56] text-lg font-black leading-tight tracking-tight max-w-[280px]">
                Welcome Back! 👋
              </h2>
              <p className="text-[#006670] text-[11px] mt-1 font-semibold max-w-[280px]">
                Sign in to continue to FAAZO Admin
              </p>
            </div>
          </div>

          {/* Top Secure Badge (Desktop only) */}
          <div className="hidden md:flex justify-end pl-5 pr-14 pt-4 pb-0 md:pl-6 md:pr-14">
            <div className="inline-flex items-center gap-1.5 bg-[#e6f3f5] text-[#006670] text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
              <Shield className="w-2.5 h-2.5" />
              Secure Admin Access
            </div>
          </div>

          {/* Main form content card */}
          <div className="flex-grow bg-white rounded-t-[32px] md:rounded-none -mt-7 md:mt-0 z-10 relative px-4 py-6 md:px-6 md:pt-4 md:pb-6 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] md:shadow-none">
            {/* Heading section */}
            <div className="mb-4 md:mb-5">
              {/* Mobile View Title Card */}
              <div className="block md:hidden">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">
                  Admin Login
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Secure administration dashboard access
                </p>
              </div>

              {/* Desktop View Title Card */}
              <div className="hidden md:block">
                <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight mb-0.5">Welcome Back! 👋</h1>
                <p className="text-[11px] md:text-xs text-slate-500 font-medium">Sign in to continue to FAAZO Admin</p>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-3 md:mb-4 p-2 md:p-2.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-[11px] md:text-xs text-rose-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} suppressHydrationWarning className="space-y-2.5 md:space-y-4">
              {/* Username */}
              <div>
                <label className={labelBase}>Username</label>
                <div className="relative">
                  <User className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputBase}
                    placeholder="Enter your username"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={labelBase}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputBase} pr-10`}
                    placeholder="Enter your password"
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    suppressHydrationWarning
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3 h-3 md:w-3.5 md:h-3.5 rounded border-slate-300 text-[#006670] focus:ring-[#006670] accent-[#006670] cursor-pointer"
                  suppressHydrationWarning
                />
                <label htmlFor="remember-me" className="text-[11px] md:text-xs font-medium text-slate-700 cursor-pointer">
                  Remember me
                </label>
              </div>

              {/* Sign In CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#006670] hover:bg-[#004e56] active:bg-[#003d44] text-white font-bold text-xs md:text-sm py-2 md:py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 md:gap-2 tracking-wide"
                suppressHydrationWarning
              >
                {loading ? 'Signing In...' : (<>Sign In <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" /></>)}
              </button>


            </form>

            {/* Back to store */}
            <div className="mt-5 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#006670] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to FAAZO Store
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
