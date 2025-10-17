/**
 * Authorization Holds Handler
 */

import type {
  Env,
  CreateHoldRequest,
  CaptureHoldRequest,
  HoldResponse,
  CaptureResponse,
  CancelResponse,
  GuestTier,
  CaptureAttempt,
} from "../types";
import {
  HOLD_LIMITS,
  TIER_LIMITS_DISPLAY,
  MIN_HOLD_AMOUNT_CENTS,
  KV_TTL_30_DAYS,
  CAPTURE_ATTEMPT_WINDOW_MS,
} from "../config";
import { ValidationError, ConflictError } from "../lib/errors";
import { StripeService } from "../services/stripe.service";
import { ChittyIDService } from "../services/chittyid.service";
import { getCurrency } from "../config";
import { normalizeMetadataToStrings } from "../lib/utils";

// Track capture attempts to prevent duplicates with different amounts
const captureAttempts = new Map<string, CaptureAttempt>();

/**
 * Create authorization hold
 * POST /api/holds
 */
export async function createHold(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const body = (await request.json()) as CreateHoldRequest;
  const {
    amount,
    currency = getCurrency(env),
    customer_email,
    property_id,
    tenant_id,
    description,
    metadata = {},
  } = body;

  // Validation
  if (!amount || !description) {
    throw new ValidationError("Missing required fields: amount, description");
  }

  if (amount < MIN_HOLD_AMOUNT_CENTS) {
    throw new ValidationError(
      `Amount must be at least $${MIN_HOLD_AMOUNT_CENTS / 100} USD (${MIN_HOLD_AMOUNT_CENTS} cents)`,
    );
  }

  // Apply tiered hold limits
  const meta = (metadata || {}) as Record<string, unknown>;
  const guestTier = (meta.guest_tier as GuestTier) || "NEW_GUEST";
  const maxAmount = HOLD_LIMITS[guestTier] || HOLD_LIMITS.NEW_GUEST;

  if (amount > maxAmount) {
    throw new ValidationError(`Amount exceeds limit for ${guestTier} tier`, {
      details: `Maximum hold: ${TIER_LIMITS_DISPLAY[guestTier] || "$2,500"}. Contact support to upgrade tier.`,
      current_tier: guestTier,
      max_amount: maxAmount,
    });
  }

  // Initialize services
  const stripeService = new StripeService(env);
  const chittyIdService = new ChittyIDService(env);

  // Create PaymentIntent (authorization hold)
  const paymentIntent = await stripeService.createAuthorizationHold({
    amount,
    currency,
    description,
    customer_email,
    metadata: normalizeMetadataToStrings({
      ...meta,
      property_id: property_id || "",
      tenant_id: tenant_id || "",
      source: "chittycharge",
      service: "chittypay",
    }),
  });

  // Mint ChittyID for this authorization hold
  const chittyId = await chittyIdService.mintChittyID("AUTH", {
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount,
    property_id,
    tenant_id,
    source: "chittycharge",
  });

  // Store hold metadata in KV
  await stripeService.storeHoldMetadata(paymentIntent, {
    property_id,
    tenant_id,
    customer_email,
  });

  // Index by ChittyID
  await chittyIdService.storeChittyIDMapping(chittyId, paymentIntent.id, KV_TTL_30_DAYS);

  const response: HoldResponse = {
    id: paymentIntent.id,
    chitty_id: chittyId,
    client_secret: paymentIntent.client_secret || undefined,
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    amount_capturable: paymentIntent.amount_capturable || 0,
    currency: paymentIntent.currency,
    created_at: new Date(paymentIntent.created * 1000).toISOString(),
    tier: guestTier,
    tier_limit: maxAmount,
  };

  return Response.json(response, { status: 201, headers: corsHeaders });
}

/**
 * Get hold status
 * GET /api/holds/:id
 */
export async function getHoldStatus(
  holdId: string,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const stripeService = new StripeService(env);
  const paymentIntent = await stripeService.getPaymentIntent(holdId);

  const response: HoldResponse = {
    id: paymentIntent.id,
    chitty_id: "", // Not available in GET request, would need to query KV
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    amount_capturable: paymentIntent.amount_capturable || 0,
    amount_received: paymentIntent.amount_received || 0,
    currency: paymentIntent.currency,
    created_at: new Date(paymentIntent.created * 1000).toISOString(),
  };

  return Response.json(response, { headers: corsHeaders });
}

/**
 * Capture hold (full or partial)
 * POST /api/holds/:id/capture
 */
export async function captureHold(
  holdId: string,
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const body = (await request.json()) as CaptureHoldRequest;
  const { amount_to_capture } = body;

  // Enhanced idempotency: prevent duplicate captures with different amounts
  const captureKey = holdId;
  const existingAttempt = captureAttempts.get(captureKey);
  const now = Date.now();

  if (existingAttempt) {
    if (now - existingAttempt.timestamp < CAPTURE_ATTEMPT_WINDOW_MS) {
      if (existingAttempt.amount !== (amount_to_capture || null)) {
        throw new ConflictError("Duplicate capture detected", {
          details:
            "This hold has already been captured or a capture is in progress with a different amount.",
        });
      }
    } else {
      captureAttempts.delete(captureKey);
    }
  }

  // Record this capture attempt
  captureAttempts.set(captureKey, {
    amount: amount_to_capture || null,
    timestamp: now,
  });

  const stripeService = new StripeService(env);
  const { paymentIntent, estimatedFee } = await stripeService.captureHold(
    holdId,
    amount_to_capture,
  );

  const response: CaptureResponse = {
    id: paymentIntent.id,
    status: paymentIntent.status,
    amount_captured: paymentIntent.amount_received || 0,
    amount_remaining: (paymentIntent.amount || 0) - (paymentIntent.amount_received || 0),
    estimated_processing_fee: estimatedFee,
    processing_fee_note:
      "Estimated based on standard rates. Actual fees vary by card type and volume. Check Stripe Dashboard for exact amounts.",
    captured_at: new Date().toISOString(),
  };

  return Response.json(response, { headers: corsHeaders });
}

/**
 * Cancel hold (release)
 * POST /api/holds/:id/cancel
 */
export async function cancelHold(
  holdId: string,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const stripeService = new StripeService(env);
  const paymentIntent = await stripeService.cancelHold(holdId);

  const response: CancelResponse = {
    id: paymentIntent.id,
    status: paymentIntent.status,
    canceled_at: new Date().toISOString(),
  };

  return Response.json(response, { headers: corsHeaders });
}
