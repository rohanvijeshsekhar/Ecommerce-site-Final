/**
 * FAAZO – Enterprise Shipping & Fulfillment Frontend Service
 *
 * Handles all API communication for the shipping module:
 * - Admin: Create, List, Detail, Sync, Cancel, Schedule Pickup, Generate Label, Manifest, Bulk Actions, Export
 * - Customer: Order tracking view
 */

import { api } from './api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ShipmentTrackingEvent {
  id: string;
  event_code: string;
  event_label: string;
  status_mapped: ShipmentStatus;
  event_timestamp: string;
  location: string;
  description: string;
  event_source: 'api_poll' | 'webhook' | 'manual' | 'system';
  is_delivered: boolean;
  created_by_name?: string;
  created_at: string;
}

export type ShipmentStatus =
  | 'not_created'       // Warehouse record created, Delhivery NOT yet called
  | 'created'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'reached_hub'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_delivery'
  | 'rto_initiated'
  | 'rto_in_transit'
  | 'rto_delivered'
  | 'cancelled'
  | 'lost';

export type PickupStatus = 'pending' | 'scheduled' | 'picked_up' | 'failed' | 'cancelled';
export type PackingStatus = 'pending' | 'packing' | 'packed' | 'qc_passed' | 'ready_for_pickup';

export interface ShippingAddressDetail {
  full_name: string;
  mobile: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  address_type?: string;
}

export interface OrderItemDetail {
  id: string;
  product_name: string;
  sku?: string;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
}

export interface Shipment {
  id: string;
  shipment_number: string;
  order_id: string;
  order_number: string;
  order_status?: string;
  payment_status?: string;
  payment_method?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address?: ShippingAddressDetail | null;
  items?: OrderItemDetail[];
  created_by_name: string;
  provider?: 'offline' | 'sandbox' | 'live';
  courier_name: string;
  delhivery_shipment_id: string;
  external_shipment_id?: string;
  awb_number: string;
  tracking_number: string;
  pickup_request_id?: string;
  courier_reference?: string;
  tracking_url?: string;
  label_url?: string;
  manifest_url?: string;
  packing_status: PackingStatus;
  warehouse: string;
  dispatch_location: string;
  weight: number | string;
  length: number | string;
  width: number | string;
  height: number | string;
  volumetric_weight: number | string;
  shipping_cost: number | string;
  cod_amount: number | string;
  delivery_type: string;
  shipment_status: ShipmentStatus;
  pickup_status: PickupStatus;
  current_location: string;
  current_hub?: string;
  pickup_scheduled_date: string | null;
  pickup_date: string | null;
  estimated_delivery_date: string | null;
  delivered_at: string | null;
  last_synced_at: string | null;
  is_cancellable: boolean;
  is_delivered: boolean;
  courier_submitted: boolean;   // true when Delhivery has been contacted
  needs_review: boolean;        // true when AWB/packing mismatch detected
  tracking_events: ShipmentTrackingEvent[];
  created_at: string;
  updated_at: string;
}

export interface ShipmentListItem {
  id: string;
  shipment_number: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  state?: string;
  city?: string;
  courier_name: string;
  awb_number: string;
  shipment_status: ShipmentStatus;
  packing_status: PackingStatus;
  pickup_status: PickupStatus;
  current_location: string;
  current_hub?: string;
  estimated_delivery_date: string | null;
  pickup_scheduled_date: string | null;
  last_synced_at: string | null;
  is_cancellable: boolean;
  courier_submitted: boolean;
  needs_review: boolean;
  created_at: string;
}

export interface FulfillmentStats {
  total_shipments: number;
  // Courier workflow
  not_created: number;          // no Delhivery call yet
  created: number;
  pickup_scheduled: number;
  picked_up: number;
  reached_hub: number;
  in_transit: number;
  out_for_delivery: number;
  delivered: number;
  failed_delivery: number;
  cancelled: number;
  rto_initiated: number;
  // Warehouse metrics
  pending_packing: number;
  ready_for_pickup_count: number;  // packing done, courier not yet created
  needs_review: number;
  // Operational
  todays_dispatches: number;
  todays_deliveries: number;
  delivery_success_rate: number;
  rto_percentage: number;
}

export interface CustomerShipmentTracking {
  id: string;
  shipment_number: string;
  courier_name: string;
  awb_number: string;
  tracking_number: string;
  shipment_status: ShipmentStatus;
  pickup_status: PickupStatus;
  current_location: string;
  estimated_delivery_date: string | null;
  delivered_at: string | null;
  last_synced_at: string | null;
  tracking_events: Array<{
    id: string;
    event_label: string;
    status_mapped: ShipmentStatus;
    event_timestamp: string;
    location: string;
    description: string;
    is_delivered: boolean;
  }>;
}

interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: {
    code?: string;
    message?: string;
    details?: string[];
  };
  meta?: any;
}

// ── Admin Shipping Service ────────────────────────────────────────────────────

export const adminShippingService = {
  /** Create a Delhivery shipment for a packed order */
  createShipment: async (payload: {
    order_id: string;
    weight?: number;
    length?: number;
    breadth?: number;
    height?: number;
    warehouse?: string;
    dispatch_location?: string;
    payment_mode?: string;
    pickup_date?: string;
  }): Promise<APIResponse<Shipment>> => {
    const res = await api.post('/shipping/admin/shipments/create/', payload);
    return res.data;
  },

  /** Update warehouse packing status (forward-only: pending→packing→packed→qc_passed→ready_for_pickup) */
  updatePackingStatus: async (
    shipmentId: string,
    targetStatus?: PackingStatus  // omit to auto-advance to next step
  ): Promise<APIResponse<Shipment>> => {
    const res = await api.patch(`/shipping/admin/shipments/${shipmentId}/packing/`, {
      status: targetStatus,
    });
    return res.data;
  },

  /** Create Delhivery courier shipment (only when packing_status == ready_for_pickup) */
  createCourierShipment: async (
    shipmentId: string,
    payload?: {
      weight?: number;
      length?: number;
      breadth?: number;
      height?: number;
      payment_mode?: 'Prepaid' | 'COD';
      pickup_date?: string;
    }
  ): Promise<APIResponse<Shipment>> => {
    const res = await api.post(`/shipping/admin/shipments/${shipmentId}/create-courier/`, payload || {});
    return res.data;
  },

  /** List all shipments with multi-filtering and pagination */
  listShipments: async (params?: {
    status?: string;
    packing_status?: string;
    payment_type?: string;
    state?: string;
    city?: string;
    order_type?: string;
    search?: string;
    pickup_date?: string;
    delivery_date?: string;
    page?: number;
    page_size?: number;
    sort_by?: string;
  }): Promise<APIResponse<ShipmentListItem[]>> => {
    const res = await api.get('/shipping/admin/shipments/', { params });
    return res.data;
  },

  /** Get full shipment detail for a given shipmentId */
  getShipment: async (shipmentId: string): Promise<APIResponse<Shipment>> => {
    const res = await api.get(`/shipping/admin/shipments/${shipmentId}/`);
    return res.data;
  },

  /** Get full shipment detail for a specific order by orderId */
  getShipmentByOrderId: async (orderId: string): Promise<APIResponse<Shipment | null>> => {
    try {
      const listRes = await api.get('/shipping/admin/shipments/', {
        params: { search: orderId, page_size: 5 },
      });
      const listData = listRes.data;
      if (!listData.success || !Array.isArray(listData.data) || listData.data.length === 0) {
        return { success: true, message: 'No shipment found.', data: null };
      }
      const detailRes = await api.get(`/shipping/admin/shipments/${listData.data[0].id}/`);
      return detailRes.data;
    } catch {
      return { success: true, message: 'No shipment found.', data: null };
    }
  },

  /** Force-sync tracking events from Delhivery */
  syncTracking: async (shipmentId: string): Promise<APIResponse<Shipment>> => {
    const res = await api.post(`/shipping/admin/shipments/${shipmentId}/sync/`);
    return res.data;
  },

  /** Schedule a pickup for a shipment */
  schedulePickup: async (shipmentId: string, pickupDate?: string): Promise<APIResponse<Shipment>> => {
    const res = await api.post(`/shipping/admin/shipments/${shipmentId}/schedule-pickup/`, {
      pickup_date: pickupDate,
    });
    return res.data;
  },

  /** Cancel a shipment (only before pickup) */
  cancelShipment: async (shipmentId: string, reason?: string): Promise<APIResponse<Shipment>> => {
    const res = await api.post(`/shipping/admin/shipments/${shipmentId}/cancel/`, { reason });
    return res.data;
  },

  /** Generate or get Shipping Label URL */
  generateLabel: async (shipmentId: string): Promise<APIResponse<{ label_url: string; awb: string }>> => {
    const res = await api.post(`/shipping/admin/shipments/${shipmentId}/label/`);
    return res.data;
  },

  /** Generate or get Manifest Document URL */
  generateManifest: async (shipmentId: string): Promise<APIResponse<{ manifest_url: string; shipment_number: string }>> => {
    const res = await api.post(`/shipping/admin/shipments/${shipmentId}/manifest/`);
    return res.data;
  },

  /** Bulk shipment processing (sync, pickup, cancel) */
  bulkAction: async (action: 'sync' | 'pickup' | 'cancel', shipmentIds: string[]): Promise<APIResponse<{ processed: number; total_requested: number }>> => {
    const res = await api.post('/shipping/admin/shipments/bulk-action/', { action, shipment_ids: shipmentIds });
    return res.data;
  },

  /** Get fulfillment stats for dashboard cards */
  getStats: async (): Promise<APIResponse<FulfillmentStats>> => {
    const res = await api.get('/shipping/admin/stats/');
    return res.data;
  },
};

// ── Customer Shipping Service ─────────────────────────────────────────────────

export const customerShippingService = {
  /** Get tracking info for a customer's own order */
  getOrderTracking: async (orderId: string): Promise<APIResponse<CustomerShipmentTracking | null>> => {
    const res = await api.get(`/orders/${orderId}/shipment/`);
    return res.data;
  },
};

// ── Status Helpers ────────────────────────────────────────────────────────────

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  not_created:       'Awaiting Shipment Creation',
  created:           'Shipment Created',
  pickup_scheduled:  'Pickup Scheduled',
  picked_up:         'Picked Up',
  reached_hub:       'Reached Hub',
  in_transit:        'In Transit',
  out_for_delivery:  'Out for Delivery',
  delivered:         'Delivered',
  failed_delivery:   'Failed Delivery',
  rto_initiated:     'Return Initiated',
  rto_in_transit:    'Return In Transit',
  rto_delivered:     'Return Delivered',
  cancelled:         'Cancelled',
  lost:              'Lost',
};

export const PACKING_STATUS_LABELS: Record<PackingStatus, string> = {
  pending:          'Pending Packing',
  packing:          'Packing In Progress',
  packed:           'Packed',
  qc_passed:        'QC Passed',
  ready_for_pickup: 'Ready For Pickup',
};

export const PICKUP_STATUS_LABELS: Record<PickupStatus, string> = {
  pending:    'Pickup Pending',
  scheduled:  'Pickup Scheduled',
  picked_up:  'Picked Up',
  failed:     'Pickup Failed',
  cancelled:  'Pickup Cancelled',
};

/** Ordered lifecycle for the tracking timeline */
export const SHIPMENT_LIFECYCLE: ShipmentStatus[] = [
  'not_created',
  'created',
  'pickup_scheduled',
  'picked_up',
  'reached_hub',
  'in_transit',
  'out_for_delivery',
  'delivered',
];

