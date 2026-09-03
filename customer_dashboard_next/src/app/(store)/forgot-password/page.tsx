'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail, ArrowLeft, CheckCircle2, AlertCircle, Shield, ArrowRight,
  Lock, Eye, EyeOff, Check, RefreshCw
} from 'lucide-react';
import { authService } from '../../../lib/services/auth';

type Step = 'email' | 'otp' | 'new-password' | 'success';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const maskEmail = (str: string) => {
    if (!str || !str.includes('@')) return str;
    const [name, domain] = str.split('@');
    if (name.length <= 2) return `${name[0]}*@${domain}`;
    return `${name[0]}${'*'.repeat(Math.min(name.length - 2, 5))}${name[name.length - 1]}@${domain}`;
  };

  // Password policy indicators
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const passwordsMatch = newPassword && newPassword === confirmPassword;

  // ── Step 1: Submit Email ──
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setInfoMessage(null);

    try {
      await authService.forgotPassword(email.trim());
      setCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setStep('otp');
    } catch (err: any) {
      // Anti-enumeration: still advance to OTP step
      setCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setStep('otp');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step 2: Verify OTP ──
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('').trim();
    if (code.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await authService.verifyPasswordResetOtp(email.trim(), code);
      const token = res.data?.reset_token;
      if (!token) {
        setError('Invalid or expired verification code.');
        return;
      }
      setResetToken(token);
      setStep('new-password');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid or expired verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step 2: Resend OTP ──
  const handleResendOtp = async () => {
    if (cooldown > 0 || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await authService.resendPasswordResetOtp(email.trim());
      setCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setInfoMessage('A fresh 6-digit verification code has been sent to your email.');
      setTimeout(() => setInfoMessage(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Unable to resend verification code. Please wait.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step 3: Set New Password ──
  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError('Password does not meet all security requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }
    if (!resetToken) {
      setError('Your reset session has expired. Please start over.');
      setStep('email');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await authService.resetPassword({
        token: resetToken,
        password: newPassword,
        confirm_password: confirmPassword,
      });
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 pt-32 lg:pt-[180px] pb-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-[#006670] p-6 text-white text-center relative overflow-hidden">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight">
            {step === 'email' && 'Forgot Password?'}
            {step === 'otp' && 'Verify Email OTP'}
            {step === 'new-password' && 'Create New Password'}
            {step === 'success' && 'Reset Complete!'}
          </h1>
          <p className="text-teal-100 text-xs mt-1">
            {step === 'email' && 'Enter your registered email address to receive a verification code.'}
            {step === 'otp' && `Enter the 6-digit code sent to ${maskEmail(email)}.`}
            {step === 'new-password' && 'Set a strong, unique password for your FAAZO account.'}
            {step === 'success' && 'Your password has been changed successfully.'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-xs text-rose-600 font-medium mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2 text-xs text-emerald-700 font-medium mb-4">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* ── STEP 1: EMAIL SUBMISSION ── */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                disabled={isSubmitting || !email.trim()}
                className="w-full bg-[#006670] hover:bg-[#004e56] text-white font-bold text-xs md:text-sm py-2.5 md:py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Sending Code...' : (<>Continue <ArrowRight className="w-4 h-4" /></>)}
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

          {/* ── STEP 2: OTP VERIFICATION ── */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="p-3 bg-[#006670]/5 border border-[#006670]/15 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#006670]/10 flex items-center justify-center text-[#006670] shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    Code sent to: {maskEmail(email)}
                  </p>
                  <p className="text-[11px] text-slate-500">Expires in 5 minutes</p>
                </div>
              </div>

              <div>
                <label className="block text-center text-xs font-semibold text-slate-700 mb-3">
                  Enter 6-Digit Verification Code
                </label>
                <div className="flex justify-center gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`page-otp-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        const newDigits = [...otpDigits];
                        newDigits[idx] = val ? val[val.length - 1] : '';
                        setOtpDigits(newDigits);
                        if (val && idx < 5) {
                          document.getElementById(`page-otp-input-${idx + 1}`)?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
                          document.getElementById(`page-otp-input-${idx - 1}`)?.focus();
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                        if (pasted) {
                          const newDigits = [...otpDigits];
                          for (let i = 0; i < 6; i++) {
                            newDigits[i] = pasted[i] || '';
                          }
                          setOtpDigits(newDigits);
                          const nextIndex = Math.min(pasted.length, 5);
                          document.getElementById(`page-otp-input-${nextIndex}`)?.focus();
                        }
                      }}
                      className="w-11 h-13 text-center text-xl font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#006670] focus:ring-2 focus:ring-[#006670]/20 transition-all"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otpDigits.join('').length !== 6}
                className="w-full bg-[#006670] hover:bg-[#004e56] text-white font-bold text-xs md:text-sm py-2.5 md:py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Verifying Code...' : (<>Verify Code <ArrowRight className="w-4 h-4" /></>)}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  ← Change email
                </button>

                {cooldown > 0 ? (
                  <span className="text-slate-400 font-medium">Resend in {cooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1 text-[#006670] font-bold hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Resend Code
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ── STEP 3: CREATE NEW PASSWORD ── */}
          {step === 'new-password' && (
            <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#006670] focus:ring-2 focus:ring-[#006670]/10 transition-all pl-10 pr-10 py-2.5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#006670] focus:ring-2 focus:ring-[#006670]/10 transition-all pl-10 pr-10 py-2.5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                <p className="font-semibold text-slate-600 mb-1">Password Requirements:</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    <Check className="w-3.5 h-3.5" /> Min 8 characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    <Check className="w-3.5 h-3.5" /> Uppercase (A-Z)
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    <Check className="w-3.5 h-3.5" /> Lowercase (a-z)
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    <Check className="w-3.5 h-3.5" /> Number (0-9)
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    <Check className="w-3.5 h-3.5" /> Special character
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    <Check className="w-3.5 h-3.5" /> Passwords match
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isPasswordValid || !passwordsMatch}
                className="w-full bg-[#006670] hover:bg-[#004e56] text-white font-bold text-xs md:text-sm py-2.5 md:py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Updating Password...' : (<>Reset Password <ArrowRight className="w-4 h-4" /></>)}
              </button>
            </form>
          )}

          {/* ── STEP 4: SUCCESS ── */}
          {step === 'success' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">Password Reset Successful</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                Your password has been changed successfully. You can now log in using your new credentials.
              </p>
              <Link
                href="/"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#006670] hover:bg-[#004e56] text-white font-bold text-xs md:text-sm py-2.5 md:py-3 rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                Sign In Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
