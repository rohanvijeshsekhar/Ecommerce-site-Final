import { api } from '../api';

export interface UserMinimal {
  id: string;
  email: string;
  full_name: string;
  role: 'customer' | 'dealer' | 'admin';
  auth_provider?: 'email' | 'google';
  google_sub?: string | null;
  profile_picture?: string | null;
  is_email_verified: boolean;
  is_phone_verified?: boolean;
  phone_number?: string;
  dealer_status?: 'pending' | 'approved' | 'rejected' | null;
  /** Backend-authoritative flag. Frontend must use this for all purchase gating. */
  can_purchase: boolean;
  date_joined?: string;
}

export interface AuthResponseData {
  access: string;
  /** C1: refresh is no longer returned in the JSON body.
   * It is issued as an HttpOnly cookie by the backend.
   * This field is optional to maintain backward compat with v1 register/dealer endpoints. */
  refresh?: string;
  session_key?: string;
  access_expires_in?: number;
  refresh_expires_in?: number;
  user: UserMinimal;
}

/** Response shape for the cookie-based v2 refresh endpoint. */
export interface RefreshResponseData {
  access: string;
  access_expires_in?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

// ── v2 Enterprise Types ────────────────────────────────────────

export interface DeviceSessionData {
  id: string;
  session_key: string;
  device_name: string;
  ip_address: string | null;
  user_agent: string;
  is_active: boolean;
  created_at: string;
  last_active_at: string;
  expires_at: string | null;
}

export const authService = {
  // ── v1 (legacy, preserved) ─────────────────────────────────

  async register(payload: any): Promise<ApiResponse<AuthResponseData>> {
    const response = await api.post('auth/register/', payload);
    return response.data;
  },

  /** OTP-first registration Step 1: validate data + send OTP (no account created yet) */
  async preRegister(payload: any): Promise<ApiResponse<{ otp_required: boolean; phone?: string; access?: string; refresh?: string; user?: any }>> {
    const response = await api.post('auth/pre-register/', payload);
    return response.data;
  },

  /** OTP-first registration Step 2: verify OTP + create account */
  async verifyAndRegister(phone_number: string, otp_code: string): Promise<ApiResponse<AuthResponseData>> {
    const response = await api.post('auth/verify-and-register/', { phone_number, otp_code });
    return response.data;
  },

  async dealerRegister(formData: FormData): Promise<ApiResponse<AuthResponseData>> {
    const response = await api.post('auth/dealer/register/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async login(payload: any): Promise<ApiResponse<AuthResponseData>> {
    const response = await api.post('auth/v2/login/', payload);
    return response.data;
  },

  async googleAuth(id_token: string): Promise<ApiResponse<AuthResponseData>> {
    const response = await api.post('auth/v2/google/', { id_token });
    return response.data;
  },

  /** C1: No body needed -- refresh token is read from the HttpOnly cookie by the backend. */
  async logout(): Promise<ApiResponse<null>> {
    try {
      const response = await api.post('auth/v2/logout/');
      return response.data;
    } catch {
      return { success: true, message: 'Logged out locally.', data: null };
    }
  },

  async getMe(): Promise<ApiResponse<any>> {
    const response = await api.get('auth/me/');
    return response.data;
  },

  async verifyEmail(token: string): Promise<ApiResponse<UserMinimal>> {
    const response = await api.get(`auth/verify-email/?token=${token}`);
    return response.data;
  },

  async resendVerification(): Promise<ApiResponse<null>> {
    const response = await api.post('auth/resend-verification/');
    return response.data;
  },

  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    const response = await api.post('auth/v2/password/forgot/', { email: email.trim().toLowerCase() });
    return response.data;
  },

  async verifyPasswordResetOtp(email: string, code: string): Promise<ApiResponse<{ reset_token: string }>> {
    const response = await api.post('auth/v2/otp/verify/', {
      target: email.trim().toLowerCase(),
      purpose: 'password_reset',
      code: code.trim(),
    });
    return response.data;
  },

  async resendPasswordResetOtp(email: string): Promise<ApiResponse<null>> {
    const response = await api.post('auth/v2/otp/resend/', {
      target: email.trim().toLowerCase(),
      purpose: 'password_reset',
    });
    return response.data;
  },

  async resetPassword(payload: { token: string; password: string; confirm_password?: string }): Promise<ApiResponse<null>> {
    const response = await api.post('auth/v2/password/reset/', payload);
    return response.data;
  },

  async changePassword(payload: any): Promise<ApiResponse<null>> {
    const response = await api.post('auth/change-password/', payload);
    return response.data;
  },

  // ── v2 Enterprise ─────────────────────────────────────────

  /** C1: Cookie-based token rotation -- no body needed.
   * The faazo_refresh HttpOnly cookie is sent automatically by the browser.
   * Response only contains the new access token in JSON.
   * A new rotated refresh cookie is set by the server via Set-Cookie. */
  async refreshToken(): Promise<ApiResponse<RefreshResponseData>> {
    const response = await api.post('auth/v2/refresh/', {});
    return response.data;
  },

  /** Logout from all devices — revokes all DeviceSessions */
  async logoutAll(): Promise<ApiResponse<null>> {
    const response = await api.post('auth/v2/logout-all/');
    return response.data;
  },

  // ── OTP ───────────────────────────────────────────────────

  async otpSend(payload: { target: string; purpose: string }): Promise<ApiResponse<null>> {
    const response = await api.post('auth/v2/otp/send/', payload);
    return response.data;
  },

  async otpVerify(payload: { target: string; purpose: string; code: string }): Promise<ApiResponse<null>> {
    const response = await api.post('auth/v2/otp/verify/', payload);
    return response.data;
  },

  async otpResend(payload: { target: string; purpose: string }): Promise<ApiResponse<null>> {
    const response = await api.post('auth/v2/otp/resend/', payload);
    return response.data;
  },

  // ── Sessions ─────────────────────────────────────────────

  async getSessions(): Promise<ApiResponse<DeviceSessionData[]>> {
    const response = await api.get('auth/v2/sessions/');
    return response.data;
  },

  async revokeSession(sessionId: string): Promise<ApiResponse<null>> {
    const response = await api.delete(`auth/v2/sessions/${sessionId}/`);
    return response.data;
  },

  async revokeAllSessions(): Promise<ApiResponse<null>> {
    const response = await api.delete('auth/v2/sessions/all/');
    return response.data;
  },

  // ── Profile (v2) ─────────────────────────────────────────

  async getProfile(): Promise<ApiResponse<UserMinimal>> {
    const response = await api.get('auth/v2/profile/');
    return response.data;
  },

  async updateProfileV2(payload: { full_name?: string; phone_number?: string }): Promise<ApiResponse<UserMinimal>> {
    const response = await api.patch('auth/v2/profile/', payload);
    return response.data;
  },
};

