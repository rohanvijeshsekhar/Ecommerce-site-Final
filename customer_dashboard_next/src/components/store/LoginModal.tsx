'use client';

import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../lib/services/auth';
import {
  X, Lock, Mail, User, Briefcase, Upload, AlertCircle, CheckCircle2,
  Phone, ShoppingCart, Heart, Package, Eye, EyeOff, ArrowRight, ArrowLeft,
  Shield, Truck, Award, Headphones, Check, RefreshCw, KeyRound
} from 'lucide-react';
import { PENDING_ACTION_MESSAGES } from '../../types/pendingAction';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalMode = 'login' | 'register' | 'dealer-register' | 'forgot-password' | 'otp-verify';

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, register, dealerRegister, verifyOTP, resendOTP, refreshUser, pendingAction, preRegister, verifyAndRegister, googleLogin } = useAuth();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      setApiError('Failed to retrieve Google ID Token.');
      return;
    }
    setIsSubmitting(true);
    setApiError(null);
    setSuccessMessage(null);
    try {
      const resData = await googleLogin(
        credentialResponse.credential,
        mode === 'register' ? 'signup' : 'login'
      );
      const action = resData?.auth_action;
      if (action === 'GOOGLE_SIGNUP') {
        setSuccessMessage('Welcome to FAAZO! Your account has been created.');
      } else if (action === 'GOOGLE_ACCOUNT_LINKED') {
        setSuccessMessage('Google account linked successfully!');
      } else {
        setSuccessMessage('Welcome back! Successfully logged in with Google.');
      }
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      setApiError(msg || 'No account found with this Google email. Please register before signing in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasGoogleClientId = !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.trim());

  // Contextual messaging based on pending action
  const pendingMsg = pendingAction ? PENDING_ACTION_MESSAGES[pendingAction.type] : null;

  const PendingIcon = pendingAction?.type === 'add-to-cart' || pendingAction?.type === 'open-cart'
    ? ShoppingCart
    : pendingAction?.type === 'wishlist-toggle' || pendingAction?.type === 'open-wishlist'
      ? Heart
      : pendingAction?.type === 'open-account'
        ? User
        : Package;

  const mobileHeaders: Record<ModalMode, { title: string; subtitle: string }> = {
    'login': {
      title: pendingMsg?.title ?? 'Log in to stay on top of your tasks and orders.',
      subtitle: pendingMsg?.subtitle ?? 'Access premium dental equipment & clinic settings.',
    },
    'register': {
      title: 'Create Your Account and Simplify Your Workday.',
      subtitle: 'Join FAAZO as a dental professional.',
    },
    'dealer-register': {
      title: 'Partner with FAAZO as a B2B Dealer.',
      subtitle: 'Expand your distribution network across India.',
    },
    'forgot-password': {
      title: 'Reset Password and Recover Access.',
      subtitle: 'Enter your email to get a reset link.',
    },
    'otp-verify': {
      title: 'Verify Your Mobile Number',
      subtitle: 'Enter the 6-digit verification code sent to your mobile.',
    },
  };

  const [mode, setMode] = useState<ModalMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [documents, setDocuments] = useState<File[]>([]);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Mobile Registration OTP state
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpSentTarget, setOtpSentTarget] = useState('');

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => setOtpCooldown(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Forgot Password Stepper state: 'email' | 'otp' | 'new-password' | 'success'
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'new-password' | 'success'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtpDigits, setForgotOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => setForgotCooldown(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  const maskEmail = (str: string) => {
    if (!str || !str.includes('@')) return str;
    const [name, domain] = str.split('@');
    if (name.length <= 2) return `${name[0]}*@${domain}`;
    return `${name[0]}${'*'.repeat(Math.min(name.length - 2, 5))}${name[name.length - 1]}@${domain}`;
  };

  const forgotHasMinLength = forgotNewPassword.length >= 8;
  const forgotHasUpper = /[A-Z]/.test(forgotNewPassword);
  const forgotHasLower = /[a-z]/.test(forgotNewPassword);
  const forgotHasNumber = /[0-9]/.test(forgotNewPassword);
  const forgotHasSpecial = /[^A-Za-z0-9]/.test(forgotNewPassword);
  const isForgotNewPasswordValid = forgotHasMinLength && forgotHasUpper && forgotHasLower && forgotHasNumber && forgotHasSpecial;
  const forgotPasswordsMatch = forgotNewPassword && forgotNewPassword === forgotConfirmPassword;

  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail(''); setPassword(''); setConfirmPassword('');
    setFullName(''); setPhoneNumber(''); setCompanyName('');
    setDocuments([]); setApiError(null); setFieldErrors({});
    setSuccessMessage(null); setShowPassword(false); setShowConfirmPassword(false);
    setForgotStep('email'); setForgotEmail(''); setForgotOtpDigits(['', '', '', '', '', '']);
    setForgotResetToken(''); setForgotNewPassword(''); setForgotConfirmPassword('');
    setForgotCooldown(0); setShowForgotNewPassword(false); setShowForgotConfirmPassword(false);
  };

  const handleModeChange = (newMode: ModalMode) => {
    setMode(newMode);
    setApiError(null); setFieldErrors({}); setSuccessMessage(null);
    if (newMode === 'forgot-password') {
      setForgotStep('email');
      setForgotEmail(email || '');
      setForgotOtpDigits(['', '', '', '', '', '']);
      setForgotResetToken('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setDocuments(prev => [...prev, ...selectedFiles]);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); setApiError(null); setFieldErrors({});
    try {
      await login({ email, password, remember_me: rememberMe });
      onClose(); resetForm();
    } catch (err: any) {
      if (err.response?.data) {
        const res = err.response.data;
        setApiError(res.message || 'Login failed.');
        if (res.errors) setFieldErrors(res.errors);
      } else {
        setApiError(err.message || 'Failed to connect to the server.');
      }
    } finally { setIsSubmitting(false); }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); setApiError(null); setFieldErrors({});
    if (password !== confirmPassword) { setApiError('Passwords do not match.'); setIsSubmitting(false); return; }
    try {
      const payload: any = { email, password, confirm_password: confirmPassword, full_name: fullName };
      if (phoneNumber) payload.phone_number = phoneNumber;

      const result = await preRegister(payload);

      if (result.otp_required && result.phone) {
        // Account NOT created yet — waiting for OTP verification
        setOtpSentTarget(result.phone);
        setOtpCooldown(60);
        setSuccessMessage(`OTP sent to ${result.phone}. Enter the 6-digit code to complete registration.`);
        setMode('otp-verify');
      } else {
        // No phone number — account created immediately
        setSuccessMessage('Account created successfully! Please check your email to verify.');
        setTimeout(() => { onClose(); resetForm(); }, 3000);
      }
    } catch (err: any) {
      if (err.response?.data) {
        const res = err.response.data;
        setApiError(res.message || 'Registration failed.');
        if (res.errors) setFieldErrors(res.errors);
      } else { setApiError(err.message || 'Failed to connect to the server.'); }
    } finally { setIsSubmitting(false); }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setApiError('Please enter a valid 6-digit OTP code.');
      return;
    }
    setIsSubmitting(true); setApiError(null); setSuccessMessage(null);
    try {
      // OTP-first flow: verifyAndRegister creates the account
      await verifyAndRegister(otpSentTarget, otpCode);
      setSuccessMessage('Phone verified! Your account has been created. Welcome to FAAZO! 🎉');
      setTimeout(() => { onClose(); resetForm(); }, 2000);
    } catch (err: any) {
      setApiError(err.response?.data?.message || err.message || 'OTP verification failed. Please check your code.');
    } finally { setIsSubmitting(false); }
  };

  const handleResendOtp = async () => {
    if (otpCooldown > 0) return;
    setIsSubmitting(true); setApiError(null); setSuccessMessage(null);
    try {
      await resendOTP({ target: otpSentTarget, purpose: 'registration' });
      setOtpCooldown(60);
      setSuccessMessage('A new 6-digit OTP code has been sent.');
    } catch (err: any) {
      setApiError(err.response?.data?.message || err.message || 'Failed to resend OTP.');
    } finally { setIsSubmitting(false); }
  };

  const handleDealerRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); setApiError(null); setFieldErrors({});
    if (password !== confirmPassword) { setApiError('Passwords do not match.'); setIsSubmitting(false); return; }
    if (documents.length === 0) {
      setApiError('Please upload at least one dealer business verification document (GST, Drug License, or Business Registration).');
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('email', email); formData.append('password', password);
      formData.append('confirm_password', confirmPassword); formData.append('full_name', fullName);
      formData.append('company_name', companyName);
      documents.forEach((file) => {
        formData.append('documents', file);
      });
      if (phoneNumber) formData.append('phone_number', phoneNumber);
      await dealerRegister(formData);
      
      if (phoneNumber) {
        setOtpSentTarget(phoneNumber);
        try {
          await authService.otpSend({ target: phoneNumber, purpose: 'registration' });
          setOtpCooldown(60);
          setSuccessMessage(`Dealer application submitted! Enter the OTP sent to ${phoneNumber}.`);
        } catch (otpErr: any) {
          setSuccessMessage(`Dealer application submitted! Please verify your phone number.`);
        }
        setMode('otp-verify');
      } else {
        setSuccessMessage('Dealer application submitted! Your documents are under review. Please verify your email.');
        setTimeout(() => { onClose(); resetForm(); }, 5000);
      }
    } catch (err: any) {
      if (err.response?.data) {
        const res = err.response.data;
        setApiError(res.message || 'Dealer registration failed.');
        if (res.errors) setFieldErrors(res.errors);
      } else { setApiError(err.message || 'Failed to connect to the server.'); }
    } finally { setIsSubmitting(false); }
  };

  // ─── Forgot Password Step Handlers ─────────────────────────────────────
  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.trim()) return;
    setIsSubmitting(true);
    setApiError(null);
    try {
      await authService.forgotPassword(forgotEmail);
      setForgotCooldown(60);
      setForgotOtpDigits(['', '', '', '', '', '']);
      setForgotStep('otp');
    } catch (err: any) {
      // In compliance with OWASP anti-enumeration, advance to OTP step
      setForgotCooldown(60);
      setForgotOtpDigits(['', '', '', '', '', '']);
      setForgotStep('otp');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = forgotOtpDigits.join('').trim();
    if (code.length !== 6) {
      setApiError('Please enter all 6 digits of the verification code.');
      return;
    }
    setIsSubmitting(true);
    setApiError(null);
    try {
      const res = await authService.verifyPasswordResetOtp(forgotEmail, code);
      const token = res.data?.reset_token;
      if (!token) {
        setApiError('Invalid or expired verification code.');
        return;
      }
      setForgotResetToken(token);
      setForgotStep('new-password');
    } catch (err: any) {
      setApiError(err.response?.data?.message || err.message || 'Invalid or expired verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotResendOtp = async () => {
    if (forgotCooldown > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setApiError(null);
    try {
      await authService.resendPasswordResetOtp(forgotEmail);
      setForgotCooldown(60);
      setForgotOtpDigits(['', '', '', '', '', '']);
      setSuccessMessage('A fresh 6-digit verification code has been sent to your email.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setApiError(err.response?.data?.message || err.message || 'Unable to resend verification code. Please wait.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isForgotNewPasswordValid) {
      setApiError('Password does not meet all security requirements.');
      return;
    }
    if (!forgotPasswordsMatch) {
      setApiError('Passwords do not match.');
      return;
    }
    if (!forgotResetToken) {
      setApiError('Your reset session has expired. Please start over.');
      setForgotStep('email');
      return;
    }
    setIsSubmitting(true);
    setApiError(null);
    try {
      await authService.resetPassword({
        token: forgotResetToken,
        password: forgotNewPassword,
        confirm_password: forgotConfirmPassword,
      });
      setForgotStep('success');
    } catch (err: any) {
      setApiError(err.response?.data?.message || err.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Shared field classes ────────────────────────────────────────────────
  const inputBase = "w-full border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#006670] focus:ring-2 focus:ring-[#006670]/10 transition-all placeholder:text-slate-400 pl-8.5 md:pl-10 pr-4 py-1.5 md:py-2.5";
  const labelBase = "block text-[11px] md:text-[13px] font-semibold text-slate-700 mb-0.5 md:mb-1";

  // ─── Left panel trust badges ────────────────────────────────────────────
  const trustBadges = [
    { Icon: Shield, label: '100% Genuine\nProducts' },
    { Icon: Award, label: 'Top Brands &\nBest Prices' },
    { Icon: Truck, label: 'Fast & Reliable\nDelivery' },
    { Icon: Headphones, label: 'Expert\nSupport' },
  ];

  // ─── Title map for right panel ──────────────────────────────────────────
  const titles: Record<ModalMode, { heading: string; sub: string }> = {
    'login': { heading: 'Welcome Back! 👋', sub: 'Sign in to continue to FAAZO' },
    'register': { heading: 'Create your account', sub: '' },
    'dealer-register': { heading: 'Dealer Application 🏢', sub: 'Apply for a FAAZO B2B dealer account' },
    'forgot-password': { heading: 'Reset Password 🔐', sub: 'Enter your email to receive a verification code' },
    'otp-verify': { heading: 'Verify Mobile OTP 📱', sub: 'Enter the 6-digit code sent to your phone' },
  };

  const getHeadingAndSub = () => {
    if (pendingMsg && mode === 'login') {
      return { heading: pendingMsg.title, sub: pendingMsg.subtitle };
    }
    if (mode === 'forgot-password') {
      switch (forgotStep) {
        case 'email':
          return { heading: 'Forgot Password? 🔐', sub: 'Enter your registered email to receive a verification code' };
        case 'otp':
          return { heading: 'Verify Email OTP 📩', sub: `Enter the 6-digit code sent to ${maskEmail(forgotEmail)}` };
        case 'new-password':
          return { heading: 'Create New Password 🛡️', sub: 'Set a strong, unique password for your account' };
        case 'success':
          return { heading: 'Password Reset Complete! 🎉', sub: 'Your password has been changed successfully' };
      }
    }
    return titles[mode];
  };

  const { heading, sub } = getHeadingAndSub();

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) { onClose(); resetForm(); } }}
    >
      <div className="relative w-full h-full md:h-auto md:max-w-[800px] min-h-screen md:min-h-[520px] bg-white rounded-none md:rounded-[28px] shadow-2xl overflow-y-auto md:overflow-hidden flex flex-col md:flex-row my-0 md:my-4"
      >
        {/* ══════════════════════ LEFT PANEL ══════════════════════ */}
        <div
          className="hidden md:flex md:w-[46%] flex-col justify-between relative overflow-hidden z-10 border-r border-slate-200 shadow-[4px_0_20px_rgba(0,0,0,0.03)]"
        >
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
              src="/images/faazo-logo.png"
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

          {/* Bottom: Trust badges */}
          <div className="relative z-10 m-4">
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-3 shadow-sm">
              <div className="grid grid-cols-4 gap-1">
                {trustBadges.map(({ Icon, label }) => (
                  <div key={label} className="flex flex-col items-center text-center gap-2 py-1">
                    <div className="w-8 h-8 rounded-xl bg-[#006670]/10 border border-[#006670]/10 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-[#006670]" />
                    </div>
                    <span className="text-slate-600 text-[8px] font-semibold leading-tight whitespace-pre-line">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════ RIGHT PANEL ══════════════════════ */}
        <div className="flex-1 flex flex-col bg-slate-50 md:bg-white relative md:overflow-y-auto max-h-none">
          {/* Close button (Desktop only) */}
          <button
            onClick={() => { onClose(); resetForm(); }}
            className="hidden md:flex absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

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

            {/* Close button */}
            <button
              onClick={() => { onClose(); resetForm(); }}
              className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200/95 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Back Button */}
            {mode !== 'login' && (
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="absolute top-3.5 left-4 z-30 text-[#006670] hover:text-[#004e56] text-xs font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none"
              >
                ← Back to Sign In
              </button>
            )}

            {/* Banner Text */}
            <div className="relative z-10">
              <h2 className="text-[#004e56] text-lg font-black leading-tight tracking-tight max-w-[280px]">
                {mobileHeaders[mode].title}
              </h2>
              <p className="text-[#006670] text-[11px] mt-1 font-semibold max-w-[280px]">
                {mobileHeaders[mode].subtitle}
              </p>
            </div>
          </div>

          {/* Desktop Top Redirect Links */}
          {mode === 'login' && (
            <div className="hidden md:flex justify-end pl-5 pr-14 pt-4 pb-0 md:pl-6 md:pr-14">
              <p className="text-xs text-slate-500 font-medium">
                New to FAAZO?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('register')}
                  className="text-[#006670] font-bold hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            </div>
          )}
          {mode !== 'login' && (
            <div className="hidden md:flex justify-end pl-5 pr-14 pt-4 pb-0 md:pl-6 md:pr-14">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="text-xs text-[#006670] font-bold hover:underline cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </div>
          )}

          {/* Main form content card */}
          <div className="flex-grow bg-white rounded-t-[32px] md:rounded-none -mt-7 md:mt-0 z-10 relative px-4 py-6 md:px-6 md:pt-4 md:pb-6 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] md:shadow-none">
            {/* Heading section */}
            <div className="mb-4 md:mb-5">
              {/* Mobile View Title Card */}
              <div className="block md:hidden">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">
                  {mode === 'login' ? 'Login' : mode === 'register' ? 'Sign up' : mode === 'dealer-register' ? 'Dealer Signup' : 'Reset Password'}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  {mode === 'login' ? (
                    <>
                      Don't have an account?{' '}
                      <button type="button" onClick={() => handleModeChange('register')} className="text-[#006670] font-bold hover:underline cursor-pointer">
                        Sign up
                      </button>
                    </>
                  ) : mode === 'register' ? (
                    <>
                      Already have an account?{' '}
                      <button type="button" onClick={() => handleModeChange('login')} className="text-[#006670] font-bold hover:underline cursor-pointer">
                        Sign in
                      </button>
                    </>
                  ) : mode === 'dealer-register' ? (
                    <>
                      Looking for doctor access?{' '}
                      <button type="button" onClick={() => handleModeChange('register')} className="text-[#006670] font-bold hover:underline cursor-pointer">
                        Doctor sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Remember password?{' '}
                      <button type="button" onClick={() => handleModeChange('login')} className="text-[#006670] font-bold hover:underline cursor-pointer">
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </div>

              {/* Desktop View Title Card */}
              <div className="hidden md:block">
                {pendingMsg && mode === 'login' && (
                  <div className="inline-flex items-center gap-1.5 bg-[#e6f3f5] text-[#006670] text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-2">
                    <PendingIcon className="w-2.5 h-2.5" />
                    Action Required
                  </div>
                )}
                <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight mb-0.5">{heading}</h1>
                {sub && <p className="text-[11px] md:text-xs text-slate-500 font-medium">{sub}</p>}
              </div>
            </div>

            {/* Error / Success banners */}
            {apiError && (
              <div className="mb-3 md:mb-4 p-2 md:p-2.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-[11px] md:text-xs text-rose-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-3 md:mb-4 p-2 md:p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2 text-[11px] md:text-xs text-emerald-600 font-medium animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* ── LOGIN FORM ─────────────────────────────────── */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-2.5 md:space-y-4">
                {/* Email */}
                <div>
                  <label className={labelBase}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputBase} placeholder="Enter your email"
                    />
                  </div>
                  {fieldErrors.email && <p className="mt-1 text-[11px] md:text-xs text-rose-500">{fieldErrors.email[0]}</p>}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-0.5 md:mb-1">
                    <label className="text-[11px] md:text-[13px] font-semibold text-slate-700">Password</label>
                    <button type="button" onClick={() => handleModeChange('forgot-password')}
                      className="text-[11px] md:text-[13px] font-semibold text-[#006670] hover:underline cursor-pointer">
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'} required value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputBase} pr-10`} placeholder="Enter your password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="mt-1 text-[11px] md:text-xs text-rose-500">{fieldErrors.password[0]}</p>}
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-2">
                  <input id="remember-me" type="checkbox" checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3 h-3 md:w-3.5 md:h-3.5 rounded border-slate-300 text-[#006670] focus:ring-[#006670] accent-[#006670] cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="text-[11px] md:text-xs font-medium text-slate-700 cursor-pointer">Remember me</label>
                </div>

                {/* Sign In CTA */}
                <button type="submit" disabled={isSubmitting}
                  className="w-full bg-[#006670] hover:bg-[#004e56] active:bg-[#003d44] text-white font-bold text-xs md:text-sm py-2 md:py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 md:gap-2 tracking-wide"
                >
                  {isSubmitting ? 'Signing In...' : (<>Sign In <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" /></>)}
                </button>

                {/* Social divider */}
                <div className="flex items-center gap-2 md:gap-2.5 my-1">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] md:text-xs text-slate-400 font-medium">or continue with</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Google Sign-In Official Button Container */}
                <div className="flex justify-center w-full my-1">
                  {hasGoogleClientId ? (
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setApiError('Google Sign-In failed or was cancelled.')}
                      theme="outline"
                      shape="pill"
                      size="medium"
                      width="100%"
                      text="continue_with"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setApiError('Google Client ID is missing. Please add your Google Client ID to NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local.')}
                      className="w-full flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2 md:py-2.5 px-4 rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  )}
                </div>



                {/* Dealer link */}
                <p className="text-center text-[10px] md:text-[11px] text-slate-400 font-medium pt-0.5">
                  Dental distributor or manufacturer?{' '}
                  <button type="button" onClick={() => handleModeChange('dealer-register')}
                    className="text-[#006670] font-bold hover:underline cursor-pointer">
                    Apply for Dealer Account
                  </button>
                </p>
              </form>
            )}

            {/* ── REGISTER FORM ──────────────────────────────── */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-2 md:space-y-3">
                <div>
                  <label className={labelBase}>Full Name</label>
                  <div className="relative">
                    <User className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                    <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className={inputBase} placeholder="Dr. Aditya Sharma" />
                  </div>
                  {fieldErrors.full_name && <p className="mt-1 text-[11px] md:text-xs text-rose-500">{fieldErrors.full_name[0]}</p>}
                </div>

                <div>
                  <label className={labelBase}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      className={inputBase} placeholder="aditya@clinic.com" />
                  </div>
                  {fieldErrors.email && <p className="mt-1 text-[11px] md:text-xs text-rose-500">{fieldErrors.email[0]}</p>}
                </div>

                <div>
                  <label className={labelBase}>Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                    <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                      className={inputBase} placeholder="9876543210" />
                  </div>
                  {fieldErrors.phone_number && <p className="mt-1 text-[11px] md:text-xs text-rose-500">{fieldErrors.phone_number[0]}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2 md:gap-2.5">
                  <div>
                    <label className={labelBase}>Password</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                      <input type={showPassword ? 'text' : 'password'} required value={password}
                        onChange={(e) => setPassword(e.target.value)} className={`${inputBase} pr-10`} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 md:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
                        {showPassword ? <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelBase}>Confirm</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                      <input type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputBase} pr-10`} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 md:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                {fieldErrors.password && <p className="text-[11px] md:text-xs text-rose-500">{fieldErrors.password[0]}</p>}

                <button type="submit" disabled={isSubmitting}
                  className="w-full bg-[#006670] hover:bg-[#004e56] text-white font-bold text-xs md:text-sm py-2 md:py-2.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 md:gap-2 tracking-wide">
                  {isSubmitting ? 'Creating Account...' : (<>Create Account <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" /></>)}
                </button>

                {/* Social divider */}
                <div className="flex items-center gap-2 md:gap-2.5 my-1">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] md:text-xs text-slate-400 font-medium">or sign up with</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Google Sign-Up Official Button Container */}
                <div className="flex justify-center w-full my-1">
                  {hasGoogleClientId ? (
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setApiError('Google Sign-Up failed or was cancelled.')}
                      theme="outline"
                      shape="pill"
                      size="medium"
                      width="100%"
                      text="signup_with"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setApiError('Google Client ID is missing. Please add your Google Client ID to NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local.')}
                      className="w-full flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2 md:py-2.5 px-4 rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <span>Sign up with Google</span>
                    </button>
                  )}
                </div>


              </form>
            )}

            {/* ── DEALER REGISTER FORM ───────────────────────── */}
            {mode === 'dealer-register' && (
              <form onSubmit={handleDealerRegisterSubmit} className="space-y-2 md:space-y-3">
                <div className="grid grid-cols-2 gap-2 md:gap-2.5">
                  <div>
                    <label className={labelBase}>Contact Name</label>
                    <div className="relative">
                      <User className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                      <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                        className={inputBase} placeholder="Sales Director" />
                    </div>
                    {fieldErrors.full_name && <p className="mt-1 text-[11px] md:text-xs text-rose-500">{fieldErrors.full_name[0]}</p>}
                  </div>
                  <div>
                    <label className={labelBase}>Company Name</label>
                    <div className="relative">
                      <Briefcase className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                      <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                        className={inputBase} placeholder="MedEquip Ltd" />
                    </div>
                    {fieldErrors.company_name && <p className="mt-1 text-[11px] md:text-xs text-rose-500">{fieldErrors.company_name[0]}</p>}
                  </div>
                </div>

                <div>
                  <label className={labelBase}>Company Email</label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      className={inputBase} placeholder="dealer@medequip.com" />
                  </div>
                  {fieldErrors.email && <p className="mt-1 text-[11px] md:text-xs text-rose-500">{fieldErrors.email[0]}</p>}
                </div>

                <div>
                  <label className={labelBase}>Contact Mobile</label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                    <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                      className={inputBase} placeholder="Company contact" />
                  </div>
                  {fieldErrors.phone_number && <p className="mt-1 text-[11px] md:text-xs text-rose-500">{fieldErrors.phone_number[0]}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2 md:gap-2.5">
                  <div>
                    <label className={labelBase}>Password</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                      <input type={showPassword ? 'text' : 'password'} required value={password}
                        onChange={(e) => setPassword(e.target.value)} className={`${inputBase} pr-10`} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 md:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
                        {showPassword ? <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelBase}>Confirm</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                      <input type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputBase} pr-10`} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 md:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" /> : <Eye className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Document upload */}
                <div>
                  <label className={labelBase}>Dealer Verification Document</label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-[#006670]/40 rounded-xl p-2 md:p-3 text-center transition-colors relative cursor-pointer hover:bg-slate-50">
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" multiple
                      onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Upload className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 mx-auto mb-1" />
                    <p className="text-[11px] md:text-xs font-semibold text-slate-600">
                      {documents.length > 0
                        ? `${documents.length} files selected`
                        : 'Upload GST / Business Trade License'}
                    </p>
                    <p className="text-[10px] md:text-[11px] text-slate-400 mt-0.5">PDF, PNG, JPG up to 10MB</p>
                  </div>

                  {documents.length > 0 && (
                    <div className="mt-2.5 space-y-1.5 z-10 relative">
                      {documents.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-150 rounded-lg px-3 py-1.5 text-[11px]">
                          <span className="text-slate-600 truncate max-w-[200px] font-medium">{file.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocuments(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-rose-500 hover:text-rose-700 font-bold p-0.5 rounded-full hover:bg-slate-100/50 cursor-pointer transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {fieldErrors.document && <p className="mt-1 text-[11px] md:text-xs text-rose-500">{fieldErrors.document[0]}</p>}
                </div>

                <button type="submit" disabled={isSubmitting}
                  className="w-full bg-[#006670] hover:bg-[#004e56] text-white font-bold text-xs md:text-sm py-2 md:py-2.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 md:gap-2 tracking-wide">
                  {isSubmitting ? 'Submitting...' : (<>Submit Application <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" /></>)}
                </button>

                <p className="text-center text-xs text-slate-500">
                  Looking for doctor access?{' '}
                  <button type="button" onClick={() => handleModeChange('register')}
                    className="text-[#006670] font-bold hover:underline cursor-pointer">Doctor Sign Up</button>
                </p>
              </form>
            )}

            {/* ── FORGOT PASSWORD FORM ───────────────────────── */}
            {/* ── FORGOT PASSWORD STEPPER WIZARD ─────────────── */}
            {mode === 'forgot-password' && (
              <div className="space-y-3 md:space-y-4">
                {apiError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-[11px] md:text-xs text-rose-600 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{apiError}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2 text-[11px] md:text-xs text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* ── Step 1: Email Submission ── */}
                {forgotStep === 'email' && (
                  <form onSubmit={handleForgotEmailSubmit} className="space-y-3 md:space-y-4">
                    <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed">
                      Enter your registered email address and we'll send you a 6-digit verification code.
                    </p>

                    <div>
                      <label className={labelBase}>Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className={inputBase}
                          placeholder="name@clinic.com"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !forgotEmail.trim()}
                      className="w-full bg-[#006670] hover:bg-[#004e56] text-white font-bold text-xs md:text-sm py-2 md:py-2.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 md:gap-2 tracking-wide"
                    >
                      {isSubmitting ? 'Sending Code...' : (<>Continue <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" /></>)}
                    </button>

                    <p className="text-center text-[11px] md:text-xs text-slate-500">
                      Remember your password?{' '}
                      <button
                        type="button"
                        onClick={() => handleModeChange('login')}
                        className="text-[#006670] font-bold hover:underline cursor-pointer"
                      >
                        Sign In
                      </button>
                    </p>
                  </form>
                )}

                {/* ── Step 2: OTP Verification ── */}
                {forgotStep === 'otp' && (
                  <form onSubmit={handleForgotOtpSubmit} className="space-y-3 md:space-y-4">
                    <div className="p-2.5 bg-[#006670]/5 border border-[#006670]/15 rounded-xl flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#006670]/10 flex items-center justify-center text-[#006670] shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] md:text-xs font-bold text-slate-800 truncate">
                          Code sent to: {maskEmail(forgotEmail)}
                        </p>
                        <p className="text-[10px] md:text-[11px] text-slate-500">Expires in 5 minutes</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-center text-[11px] md:text-xs font-semibold text-slate-700 mb-2">
                        Enter 6-Digit Verification Code
                      </label>
                      <div className="flex justify-center gap-1.5 md:gap-2">
                        {forgotOtpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`forgot-otp-input-${idx}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              const newDigits = [...forgotOtpDigits];
                              newDigits[idx] = val ? val[val.length - 1] : '';
                              setForgotOtpDigits(newDigits);
                              if (val && idx < 5) {
                                document.getElementById(`forgot-otp-input-${idx + 1}`)?.focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !forgotOtpDigits[idx] && idx > 0) {
                                document.getElementById(`forgot-otp-input-${idx - 1}`)?.focus();
                              }
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                              if (pasted) {
                                const newDigits = [...forgotOtpDigits];
                                for (let i = 0; i < 6; i++) {
                                  newDigits[i] = pasted[i] || '';
                                }
                                setForgotOtpDigits(newDigits);
                                const nextIndex = Math.min(pasted.length, 5);
                                document.getElementById(`forgot-otp-input-${nextIndex}`)?.focus();
                              }
                            }}
                            className="w-10 h-11 md:w-11 md:h-12 text-center text-base md:text-lg font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#006670] focus:ring-2 focus:ring-[#006670]/20 transition-all"
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || forgotOtpDigits.join('').length !== 6}
                      className="w-full bg-[#006670] hover:bg-[#004e56] text-white font-bold text-xs md:text-sm py-2 md:py-2.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 md:gap-2 tracking-wide"
                    >
                      {isSubmitting ? 'Verifying Code...' : (<>Verify Code <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" /></>)}
                    </button>

                    <div className="flex items-center justify-between text-[11px] md:text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => setForgotStep('email')}
                        className="text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        ← Change email
                      </button>

                      {forgotCooldown > 0 ? (
                        <span className="text-slate-400 font-medium">Resend in {forgotCooldown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleForgotResendOtp}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1 text-[#006670] font-bold hover:underline cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Resend Code
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* ── Step 3: Create New Password ── */}
                {forgotStep === 'new-password' && (
                  <form onSubmit={handleForgotNewPasswordSubmit} className="space-y-2.5 md:space-y-3.5">
                    <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed">
                      Create a strong, unique password for your FAAZO account.
                    </p>

                    <div>
                      <label className={labelBase}>New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                        <input
                          type={showForgotNewPassword ? 'text' : 'password'}
                          required
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          className={`${inputBase} pr-10`}
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                          className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showForgotNewPassword ? <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={labelBase}>Confirm New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                        <input
                          type={showForgotConfirmPassword ? 'text' : 'password'}
                          required
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          className={`${inputBase} pr-10`}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                          className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showForgotConfirmPassword ? <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Live Password Policy Checklist */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[10px] md:text-[11px] space-y-1">
                      <p className="font-semibold text-slate-600 mb-1">Password Requirements:</p>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                        <div className={`flex items-center gap-1 ${forgotHasMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                          <Check className="w-3 h-3" /> Min 8 characters
                        </div>
                        <div className={`flex items-center gap-1 ${forgotHasUpper ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                          <Check className="w-3 h-3" /> Uppercase (A-Z)
                        </div>
                        <div className={`flex items-center gap-1 ${forgotHasLower ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                          <Check className="w-3 h-3" /> Lowercase (a-z)
                        </div>
                        <div className={`flex items-center gap-1 ${forgotHasNumber ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                          <Check className="w-3 h-3" /> Number (0-9)
                        </div>
                        <div className={`flex items-center gap-1 ${forgotHasSpecial ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                          <Check className="w-3 h-3" /> Special character
                        </div>
                        <div className={`flex items-center gap-1 ${forgotPasswordsMatch ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                          <Check className="w-3 h-3" /> Passwords match
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !isForgotNewPasswordValid || !forgotPasswordsMatch}
                      className="w-full bg-[#006670] hover:bg-[#004e56] text-white font-bold text-xs md:text-sm py-2 md:py-2.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 md:gap-2 tracking-wide"
                    >
                      {isSubmitting ? 'Updating Password...' : (<>Reset Password <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" /></>)}
                    </button>
                  </form>
                )}

                {/* ── Step 4: Success Screen ── */}
                {forgotStep === 'success' && (
                  <div className="space-y-3.5 text-center py-2">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-bold text-slate-800">Password Reset Successful</h3>
                      <p className="text-[11px] md:text-xs text-slate-500 mt-1 leading-relaxed">
                        Your password has been changed successfully. You can now sign in with your new password.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleModeChange('login')}
                      className="w-full bg-[#006670] hover:bg-[#004e56] text-white font-bold text-xs md:text-sm py-2 md:py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      Sign In Now <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}


            {/* ── OTP VERIFICATION FORM ──────────────────────── */}
            {mode === 'otp-verify' && (
              <form onSubmit={handleVerifyOtpSubmit} className="space-y-3 md:space-y-4">
                <div className="p-3 bg-[#006670]/5 border border-[#006670]/15 rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#006670]/10 flex items-center justify-center text-[#006670] shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">Target Phone: {otpSentTarget}</p>
                    <p className="text-[11px] text-slate-500">Enter the 6-digit verification code sent to your mobile</p>
                  </div>
                </div>

                <div>
                  <label className={labelBase}>6-Digit Verification Code</label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => {
                        setOtpCode(e.target.value.replace(/\D/g, ''));
                        setApiError(null);
                      }}
                      className={`${inputBase} text-center font-mono text-sm md:text-base font-bold tracking-[0.3em] md:tracking-[0.4em]`}
                      placeholder="000000"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpCooldown > 0 || isSubmitting}
                    className={`text-[11px] font-bold ${otpCooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-[#006670] hover:underline cursor-pointer'}`}
                  >
                    {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('login')}
                    className="text-[11px] text-[#006670] hover:underline font-semibold cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otpCode.length !== 6}
                  className="w-full bg-[#006670] hover:bg-[#004e56] text-white font-bold text-xs md:text-sm py-2 md:py-2.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 md:gap-2 tracking-wide"
                >
                  {isSubmitting ? 'Verifying...' : (<>Verify & Finish Registration <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></>)}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
