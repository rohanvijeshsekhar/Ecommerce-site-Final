'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Shield, ArrowRight } from 'lucide-react';
import { authService } from '../../../lib/services/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.trim()) return;

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const res = await authService.forgotPassword(email.trim());
      setMessage(res.message || 'If an account exists, password reset instructions have been sent.');
    } catch (err: any) {
      // In compliance with OWASP, always show generic success or handle network error
      setMessage('If an account exists, password reset instructions have been sent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-[#006670] p-6 text-white text-center relative overflow-hidden">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight">Forgot Password</h1>
          <p className="text-teal-100 text-xs mt-1">Enter your registered email address to receive reset instructions.</p>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8">
          {message ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">Check Your Inbox</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                {message}
              </p>
              <p className="text-[11px] text-slate-400 mb-6">
                Did not receive the email? Check your spam folder or verify you entered the correct address.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#006670] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Back to FAAZO Homepage
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-xs text-rose-600 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@clinic.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#006670] focus:ring-2 focus:ring-[#006670]/10 transition-all pl-10 pr-4 py-2.5"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#006670] hover:bg-[#004e56] text-white font-bold text-xs md:text-sm py-2.5 md:py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Sending Instructions...' : (<>Send Reset Link <ArrowRight className="w-4 h-4" /></>)}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#006670] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
