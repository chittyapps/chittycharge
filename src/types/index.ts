/**
 * Type definitions for ChittyCharge
 */

export interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  CHITTY_ID_TOKEN: string;
  HOLDS: KVNamespace;
  ALLOWED_ORIGINS?: string;
  CURRENCY?: string;
  DEFAULT_HOLD_AMOUNT_CENTS?: string;
}

export interface HoldMetadata {
  id: string;
  amount: number;
  currency: string;
  property_id?: string;
  tenant_id?: string;
  customer_email?: string;
  status: string;
  created_at: string;
  expires_at?: string;
}

export interface CreateHoldRequest {
  amount: number;
  currency?: string;
  customer_email?: string;
  property_id?: string;
  tenant_id?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface CaptureHoldRequest {
  amount_to_capture?: number;
}

export interface HoldResponse {
  id: string;
  chitty_id: string;
  status: string;
  amount: number;
  amount_capturable?: number;
  amount_received?: number;
  currency: string;
  created_at: string;
  client_secret?: string;
  tier?: string;
  tier_limit?: number;
}

export interface CaptureResponse {
  id: string;
  status: string;
  amount_captured: number;
  amount_remaining: number;
  estimated_processing_fee: number;
  processing_fee_note: string;
  captured_at: string;
}

export interface CancelResponse {
  id: string;
  status: string;
  canceled_at: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  stripe_connected: boolean;
  chittyid_connected: boolean;
}

export interface ErrorResponse {
  error: string;
  details?: string;
  current_tier?: string;
  max_amount?: number;
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface CaptureAttempt {
  amount: number | null;
  timestamp: number;
}

export type GuestTier = "NEW_GUEST" | "VERIFIED_GUEST" | "PREMIUM_PROPERTY";

export interface ChittyIDMintRequest {
  entity_type: string;
  metadata: Record<string, unknown>;
}

export interface ChittyIDMintResponse {
  chitty_id: string;
}
