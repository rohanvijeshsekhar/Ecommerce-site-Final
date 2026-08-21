import { api } from '../api';
import type { ApiResponse } from './auth';

export interface CourierServiceabilityResult {
  destination_pincode: string;
  is_serviceable: boolean;
  available_couriers?: Array<{
    courier_name: string;
    courier_company_id: number;
    rate: number;
    estimated_delivery_days: string | number;
    etd: string;
    cod: boolean;
  }>;
  recommended_courier?: {
    courier_name: string;
    courier_company_id: number;
    rate: number;
    estimated_delivery_days: string | number;
    etd: string;
  } | null;
  message?: string;
  circuit_open?: boolean;
  offline?: boolean;
}

// In-memory cache for the user session to prevent redundant requests
const serviceabilityCache = new Map<string, { result: CourierServiceabilityResult; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes client cache

export const shippingService = {
  /**
   * Authoritatively queries the backend Shiprocket serviceability engine.
   * Debounced by the caller.
   */
  async checkServiceability(
    pincode: string,
    weight: number = 1.0,
    cod: boolean = false
  ): Promise<CourierServiceabilityResult> {
    const cleanPin = pincode.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      return {
        destination_pincode: cleanPin,
        is_serviceable: false,
        message: 'Please enter a valid 6-digit Indian PIN code.',
      };
    }

    const cacheKey = `${cleanPin}_${weight}_${cod}`;
    const cached = serviceabilityCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }

    try {
      const response = await api.post<ApiResponse<CourierServiceabilityResult>>(
        'shipping/check-serviceability/',
        {
          pincode: cleanPin,
          weight,
          cod,
        }
      );

      if (response.data && response.data.success && response.data.data) {
        const data = response.data.data;
        serviceabilityCache.set(cacheKey, { result: data, timestamp: Date.now() });
        return data;
      }

      return {
        destination_pincode: cleanPin,
        is_serviceable: false,
        message: response.data?.message || 'Unable to check courier serviceability.',
      };
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Unable to check courier serviceability at this time.';

      return {
        destination_pincode: cleanPin,
        is_serviceable: false,
        message: errMsg,
      };
    }
  },
};
