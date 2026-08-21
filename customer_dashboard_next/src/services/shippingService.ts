import { api } from '@/lib/api';

export type ShipmentStatus =
  | 'not_created'
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

export type PackingStatus =
  | 'pending'
  | 'packing'
  | 'packed'
  | 'qc_passed'
  | 'ready_for_pickup';

export type PickupStatus =
  | 'pending'
  | 'scheduled'
  | 'picked_up'
  | 'failed'
  | 'cancelled';

export interface ShipmentListItem {
  id: string;
  order_id: string;
  order_number: string;
  shipment_number: string;
  courier_name: string;
  awb_number: string;
  shipment_status: ShipmentStatus;
  packing_status: PackingStatus;
  pickup_status: PickupStatus;
  customer_name: string;
  customer_phone: string;
  destination_city: string;
  destination_state: string;
  destination_pincode: string;
  payment_type: 'Prepaid' | 'COD';
  cod_amount: string;
  item_count: number;
  weight_kg: string;
  created_at: string;
  updated_at: string;
  is_rto: boolean;
  needs_review?: boolean;
  current_location?: string;
  estimated_delivery_date?: string | null;
  city?: string;
  state?: string;
  tracking_url: string;
}

export interface ShipmentTrackingEvent {
  id: string;
  status_raw: string;
  status_mapped: ShipmentStatus;
  event_label: string;
  event_timestamp: string;
  location: string;
  description: string;
  is_delivered: boolean;
  is_exception: boolean;
  event_source?: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  order_number: string;
  shipment_number: string;
  courier_name: string;
  courier_service_type: string;
  awb_number: string;
  tracking_number: string;
  tracking_url?: string;
  reference_number: string;
  shipment_status: ShipmentStatus;
  packing_status: PackingStatus;
  pickup_status: PickupStatus;
  courier_submitted?: boolean;
  needs_review?: boolean;
  provider?: string;
  is_cancellable?: boolean;
  is_pickup_schedulable?: boolean;
  is_manifestable?: boolean;
  is_labelable?: boolean;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  destination_city: string;
  destination_state: string;
  destination_pincode: string;
  warehouse_code: string;
  warehouse?: string;
  dispatch_location: string;
  weight_kg: number;
  weight?: number;
  length_cm: number;
  length?: number;
  breadth_cm: number;
  width?: number;
  height_cm: number;
  height?: number;
  delivery_type?: string;
  volumetric_weight: number;
  declared_value: string;
  payment_type: 'Prepaid' | 'COD';
  cod_amount: string;
  is_cod: boolean;
  item_count: number;
  items_summary: Array<{
    product_name: string;
    product_sku: string;
    quantity: number;
    price: string;
  }>;
  items?: Array<any>;
  label_url: string | null;
  manifest_url: string | null;
  invoice_url: string | null;
  expected_delivery_date: string | null;
  estimated_delivery_date?: string | null;
  current_location?: string;
  delivered_at: string | null;
  pickup_date: string | null;
  rto_reason: string | null;
  rto_initiated_at: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  last_synced_at?: string | null;
  courier_raw_response: any;
  created_at: string;
  updated_at: string;
  tracking_events: ShipmentTrackingEvent[];
}

export interface FulfillmentStats {
  total_shipments: number;
  in_transit: number;
  out_for_delivery: number;
  delivered: number;
  failed_delivery: number;
  cancelled: number;
  rto_initiated: number;
  not_created?: number;
  pickup_scheduled?: number;
  created?: number;
  picked_up?: number;
  reached_hub?: number;
  pending_packing: number;
  ready_for_pickup_count: number;
  needs_review: number;
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

export const adminShippingService = {
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

  updatePackingStatus: async (
    shipmentId: string,
    targetStatus?: PackingStatus
  ): Promise<APIResponse<Shipment>> => {
    const res = await api.patch(`/shipping/admin/shipments/${shipmentId}/packing/`, {
      status: targetStatus,
    });
    return res.data;
  },

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

  getShipment: async (shipmentId: string): Promise<APIResponse<Shipment>> => {
    const res = await api.get(`/shipping/admin/shipments/${shipmentId}/`);
    return res.data;
  },

  getShipmentByOrderId: async (orderId: string): Promise<APIResponse<Shipment | null>> => {
    try {
      const listRes = await api.get('/shipping/admin/shipments/', {
        params: { order_id: orderId, search: orderId, page_size: 5 },
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

  syncTracking: async (shipmentId: string): Promise<APIResponse<Shipment>> => {
    const res = await api.post(`/shipping/admin/shipments/${shipmentId}/sync/`);
    return res.data;
  },

  schedulePickup: async (shipmentId: string, pickupDate?: string): Promise<APIResponse<Shipment>> => {
    const res = await api.post(`/shipping/admin/shipments/${shipmentId}/schedule-pickup/`, {
      pickup_date: pickupDate,
    });
    return res.data;
  },

  cancelShipment: async (shipmentId: string, reason?: string): Promise<APIResponse<Shipment>> => {
    const res = await api.post(`/shipping/admin/shipments/${shipmentId}/cancel/`, { reason });
    return res.data;
  },

  generateLabel: async (shipmentId: string): Promise<APIResponse<{ label_url: string; awb: string }>> => {
    const res = await api.post(`/shipping/admin/shipments/${shipmentId}/label/`);
    return res.data;
  },

  generateManifest: async (shipmentId: string): Promise<APIResponse<{ manifest_url: string; shipment_number: string }>> => {
    const res = await api.post(`/shipping/admin/shipments/${shipmentId}/manifest/`);
    return res.data;
  },

  bulkAction: async (action: 'sync' | 'pickup' | 'cancel', shipmentIds: string[]): Promise<APIResponse<{ processed: number; total_requested: number }>> => {
    const res = await api.post('/shipping/admin/shipments/bulk-action/', { action, shipment_ids: shipmentIds });
    return res.data;
  },

  getStats: async (): Promise<APIResponse<FulfillmentStats>> => {
    const res = await api.get('/shipping/admin/stats/');
    return res.data;
  },
};

export const customerShippingService = {
  getOrderTracking: async (orderId: string): Promise<APIResponse<CustomerShipmentTracking | null>> => {
    const res = await api.get(`/orders/${orderId}/shipment/`);
    return res.data;
  },
};

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
