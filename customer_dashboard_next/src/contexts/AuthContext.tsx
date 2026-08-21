'use client';

import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../lib/services/auth';
import type { UserMinimal, AuthResponseData, DeviceSessionData } from '../lib/services/auth';
import { usersService } from '../lib/services/users';
import type { UserProfile } from '../lib/services/users';
import axios from 'axios';
import { setAccessToken, performInitialAuth } from '../lib/api';
import type { PendingAction } from '../types/pendingAction';


export interface AuthContextType {
  user: UserMinimal | null;
  adminUser?: UserMinimal | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isAdminAuthenticated?: boolean;
  isLoading: boolean;
  pendingAction: PendingAction | null;
  setPendingAction: (action: PendingAction | null) => void;
  login: (payload: any) => Promise<void>;
  register: (payload: any) => Promise<void>;
  dealerRegister: (formData: FormData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  // -- Enterprise v2 --
  /** Silent token refresh using enterprise v2 cookie-based rotation endpoint. */
  refresh: () => Promise<void>;
  /** Logout from ALL devices -- revokes all active DeviceSessions. */
  logoutAll: () => Promise<void>;
  /** Fetch all active device sessions for the current user. */
  activeSessions: () => Promise<DeviceSessionData[]>;
  /** Verify OTP submitted by user for a given target and purpose. */
  verifyOTP: (params: { target: string; purpose: string; code: string }) => Promise<void>;
  /** Resend OTP to the same target. Subject to 60s cooldown. */
  resendOTP: (params: { target: string; purpose: string }) => Promise<void>;
  /** OTP-first registration Step 1: validate + send OTP, no account created. */
  preRegister: (payload: any) => Promise<{ otp_required: boolean; phone?: string }>;
  /** OTP-first registration Step 2: verify OTP + create account + log in. */
  verifyAndRegister: (phone: string, otp_code: string) => Promise<void>;
  /** Google OAuth Sign-In & Sign-Up using Google ID token. */
  googleLogin: (idToken: string) => Promise<any>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserMinimal | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Initialize auth on mount.
  //
  // Strategy (two-phase):
  //   Phase 1 (synchronous) — Restore the user identity object from localStorage
  //     so the UI never flashes "logged out" on refresh. The access token is NOT
  //     restored here — it lives only in memory and is absent after a page refresh.
  //
  //   Phase 2 (async, background) — Silently call the v2/refresh/ endpoint.
  //     The HttpOnly faazo_refresh cookie is sent automatically by the browser.
  //     On success: fresh access token is stored in memory and user data is
  //     refreshed from /me/. This is the canonical path to restore auth after reload.
  //
  //   If Phase 2 fails (network error, cookie absent, token expired):
  //     The user identity is kept in React state (preventing a flash), but the
  //     access token remains null. The first real API request will return 401 and
  //     the 401 interceptor will attempt one final refresh. Only if that also fails
  //     is the user truly logged out.
  useEffect(() => {
    const initializeAuth = async () => {
      // ── Phase 1: restore non-sensitive user identity (synchronous, no flicker) ──
      const cachedUser = localStorage.getItem('faazo_user');
      if (cachedUser) {
        try {
          const parsedUser = JSON.parse(cachedUser);
          setUser(parsedUser);
          // Access token is intentionally NOT restored from any persistent storage.
          // It will be obtained in Phase 2 via the HttpOnly refresh cookie.
        } catch {
          // Corrupt cache — wipe and start fresh
          localStorage.removeItem('faazo_user');
        }
      }

      // ── Phase 2: background silent refresh via HttpOnly cookie ────────────────
      try {
        const access = await performInitialAuth();
        if (access) {
          // Re-fetch user profile to get the latest server-side state.
          const userRes = await authService.getMe();
          if (userRes.success && userRes.data) {
            setUser(userRes.data);
            localStorage.setItem('faazo_user', JSON.stringify(userRes.data));

            const profileRes = await usersService.getProfile();
            if (profileRes.success && profileRes.data) {
              setProfile(profileRes.data);
            }
          }
        }
      } catch {
        // Silently handled
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Listen for the custom "faazo_auth_expired" event dispatched by the response interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setProfile(null);
    };

    window.addEventListener('faazo_auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('faazo_auth_expired', handleAuthExpired);
    };
  }, []);

  // C1: Cross-tab sync now only watches faazo_user (no faazo_refresh_token needed).
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'faazo_user') {
        if (!e.newValue) {
          // Another tab logged out
          setUser(null);
          setProfile(null);
          setAccessToken(null);
          return;
        }
        try {
          setUser(JSON.parse(e.newValue));
        } catch {
          setUser(null);
          setProfile(null);
          setAccessToken(null);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // C1: handleAuthSuccess no longer stores the refresh token in localStorage.
  // The refresh token arrives as an HttpOnly cookie set by the server.
  const handleAuthSuccess = async (data: AuthResponseData) => {
    setAccessToken(data.access);
    // Store session_key for display purposes only (not for auth)
    if (data.session_key) {
      localStorage.setItem('faazo_session_key', data.session_key);
    }
    setUser(data.user);
    localStorage.setItem('faazo_user', JSON.stringify(data.user));

    try {
      const profileRes = await usersService.getProfile();
      if (profileRes.success && profileRes.data) {
        setProfile(profileRes.data);
      }
    } catch (e) {
      console.error('Failed to load profile after authentication:', e);
    }
  };

  const login = async (payload: any) => {
    const res = await authService.login(payload);
    if (res.success && res.data) {
      await handleAuthSuccess(res.data);
    } else {
      throw new Error(res.message || 'Login failed.');
    }
  };

  const register = async (payload: any) => {
    const res = await authService.register(payload);
    if (res.success && res.data) {
      await handleAuthSuccess(res.data);
    } else {
      throw new Error(res.message || 'Registration failed.');
    }
  };

  const dealerRegister = async (formData: FormData) => {
    const res = await authService.dealerRegister(formData);
    if (res.success && res.data) {
      await handleAuthSuccess(res.data);
    } else {
      throw new Error(res.message || 'Dealer registration failed.');
    }
  };

  const preRegister = async (payload: any): Promise<{ otp_required: boolean; phone?: string }> => {
    const res = await authService.preRegister(payload);
    if (res.success && res.data) {
      if (!res.data.otp_required && res.data.access && res.data.user) {
        // No phone — account created immediately, log user in
        await handleAuthSuccess(res.data as any);
      }
      return { otp_required: res.data.otp_required, phone: res.data.phone };
    }
    throw new Error(res.message || 'Pre-registration failed.');
  };

  const verifyAndRegister = async (phone: string, otp_code: string): Promise<void> => {
    const res = await authService.verifyAndRegister(phone, otp_code);
    if (res.success && res.data) {
      await handleAuthSuccess(res.data);
    } else {
      throw new Error(res.message || 'Verification failed.');
    }
  };

  const googleLogin = async (idToken: string): Promise<any> => {
    try {
      const res = await authService.googleAuth(idToken);
      if (res.success && res.data) {
        await handleAuthSuccess(res.data);
        return res.data;
      } else {
        throw new Error(res.message || 'Google authentication failed.');
      }
    } catch (err: any) {
      const serverMessage = err.response?.data?.message || err.message || 'Google authentication failed.';
      throw new Error(serverMessage);
    }
  };

  // C1: logout no longer reads a refresh token from localStorage.
  // The backend reads it from the HttpOnly cookie automatically.
  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error('Logout request failed:', e);
    }
    setAccessToken(null);
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    setUser(null);
    setProfile(null);
  };

  // -- Enterprise v2 methods --

  /** C1: Silent token rotation -- no localStorage involvement. Cookie sent automatically. */
  const refresh = async () => {
    try {
      const res = await authService.refreshToken();
      if (res.success && res.data) {
        setAccessToken(res.data.access);
        // C1: No refresh token in response body -- cookie was rotated by the server.
      }
    } catch (e) {
      console.error('Token refresh failed:', e);
    }
  };

  /** Logout from ALL devices and clear local state. */
  const logoutAll = async () => {
    try {
      await authService.logoutAll();
    } catch (e) {
      console.error('Logout all failed:', e);
    }
    setAccessToken(null);
    localStorage.removeItem('faazo_session_key');
    localStorage.removeItem('faazo_user');
    setUser(null);
    setProfile(null);
  };

  /** Fetch live active device sessions. */
  const activeSessions = async (): Promise<DeviceSessionData[]> => {
    const res = await authService.getSessions();
    if (res.success && res.data) return res.data;
    return [];
  };

  /** Verify OTP for a given target + purpose. Throws on failure. */
  const verifyOTP = async (params: { target: string; purpose: string; code: string }) => {
    const res = await authService.otpVerify(params);
    if (!res.success) throw new Error(res.message || 'OTP verification failed.');
  };

  /** Resend OTP. Throws on failure (e.g. cooldown active). */
  const resendOTP = async (params: { target: string; purpose: string }) => {
    const res = await authService.otpResend(params);
    if (!res.success) throw new Error(res.message || 'Failed to resend OTP.');
  };

  const refreshUser = async () => {
    try {
      const userRes = await authService.getMe();
      if (userRes.success && userRes.data) {
        setUser(userRes.data);
        localStorage.setItem('faazo_user', JSON.stringify(userRes.data));
      }
      const profileRes = await usersService.getProfile();
      if (profileRes.success && profileRes.data) {
        setProfile(profileRes.data);
      }
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  const verifyEmail = async (token: string) => {
    const res = await authService.verifyEmail(token);
    if (res.success && res.data) {
      setUser((prev) => (prev ? { ...prev, is_email_verified: true } : null));
      const cached = localStorage.getItem('faazo_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.is_email_verified = true;
        localStorage.setItem('faazo_user', JSON.stringify(parsed));
      }
    } else {
      throw new Error(res.message || 'Verification failed.');
    }
  };

  const resendVerification = async () => {
    const res = await authService.resendVerification();
    if (!res.success) {
      throw new Error(res.message || 'Failed to resend verification email.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        adminUser: user?.role === 'admin' ? user : null,
        profile,
        isAuthenticated: !!user,
        isAdminAuthenticated: user?.role === 'admin',
        isLoading,
        pendingAction,
        setPendingAction,
        login,
        register,
        dealerRegister,
        logout,
        refreshUser,
        verifyEmail,
        resendVerification,
        // -- Enterprise v2 --
        refresh,
        logoutAll,
        activeSessions,
        verifyOTP,
        resendOTP,
        preRegister,
        verifyAndRegister,
        googleLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
