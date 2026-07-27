'use client';

import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../lib/services/auth';
import type { UserMinimal, AuthResponseData } from '../lib/services/auth';
import { usersService } from '../lib/services/users';
import type { UserProfile } from '../lib/services/users';
import axios from 'axios';
import { setAccessToken } from '../lib/api';
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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserMinimal | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Initialize: attempt to load user profile on mount if we have a refresh token
  useEffect(() => {
    const initializeAuth = async () => {
      const refreshToken = localStorage.getItem('faazo_refresh_token');
      if (refreshToken) {
        try {
          // Refresh the token first to set the access token in memory
          // and prevent an unnecessary 401 Unauthorized warning in the console.
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/';
          const refreshRes = await axios.post(`${apiUrl}auth/token/refresh/`, {
            refresh: refreshToken,
          });
          const { access, refresh: newRefresh } = refreshRes.data;
          setAccessToken(access);
          if (newRefresh) {
            localStorage.setItem('faazo_refresh_token', newRefresh);
          }

          const userRes = await authService.getMe();
          if (userRes.success && userRes.data) {
            setUser(userRes.data);
            localStorage.setItem('faazo_user', JSON.stringify(userRes.data));

            // Fetch profile
            const profileRes = await usersService.getProfile();
            if (profileRes.success && profileRes.data) {
              setProfile(profileRes.data);
            }
          }
        } catch (error) {
          console.error('Initialization authentication failed:', error);
          // If initialize fails, clear storage
          localStorage.removeItem('faazo_refresh_token');
          localStorage.removeItem('faazo_user');
          setAccessToken(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Listen for the custom "faazo_auth_expired" event to handle session expiration globally
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

  // Synchronise authentication state across multiple browser tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'faazo_user') {
        const newValue = e.newValue;
        
        if (!newValue) {
          // Another tab logged out — clear state locally without reloading
          setUser(null);
          setProfile(null);
          setAccessToken(null);
          return;
        }
        
        try {
          const newParsed = JSON.parse(newValue);
          // Another tab logged in or switched user — update state locally
          setUser(newParsed);
        } catch {
          // Corrupted value — clear state
          setUser(null);
          setProfile(null);
          setAccessToken(null);
        }
      }

      if (e.key === 'faazo_refresh_token' && !e.newValue) {
        // Refresh token was removed in another tab — log out locally
        setUser(null);
        setProfile(null);
        setAccessToken(null);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleAuthSuccess = async (data: AuthResponseData) => {
    setAccessToken(data.access);
    localStorage.setItem('faazo_refresh_token', data.refresh);
    setUser(data.user);
    localStorage.setItem('faazo_user', JSON.stringify(data.user));

    // Fetch profile
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

  const logout = async () => {
    const refreshToken = localStorage.getItem('faazo_refresh_token');
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch (e) {
        console.error('Logout request failed:', e);
      }
    }
    setAccessToken(null);
    localStorage.removeItem('faazo_refresh_token');
    localStorage.removeItem('faazo_user');
    setUser(null);
    setProfile(null);
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
      // Update local state is_email_verified
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
