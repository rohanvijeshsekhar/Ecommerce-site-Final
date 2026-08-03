import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import type { AuthContextType } from '../contexts/AuthContext';

const defaultAuthContext: AuthContextType = {
  user: null,
  adminUser: null,
  profile: null,
  isAuthenticated: false,
  isAdminAuthenticated: false,
  isLoading: false,
  pendingAction: null,
  setPendingAction: () => {},
  login: async () => {},
  register: async () => {},
  dealerRegister: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  verifyEmail: async () => {},
  resendVerification: async () => {},
  refresh: async () => {},
  logoutAll: async () => {},
  activeSessions: async () => [],
  verifyOTP: async () => {},
  resendOTP: async () => {},
  preRegister: async () => ({ otp_required: false }),
  verifyAndRegister: async () => {},
  googleLogin: async () => {},
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return defaultAuthContext;
  }
  return context;
};
