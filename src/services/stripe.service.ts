/**
 * Stripe Service
 * Handles all Stripe API operations
 */

import Stripe from "stripe";
import type { Env, HoldMetadata } from "../types";
import { calculateEstimatedFee, generateIdempotencyKey } from "../lib/utils";
import { KV_TTL_30_DAYS } from "../config";

export class StripeService {
  private stripe: Stripe;

  constructor(private env: Env) {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  /**
   * Create a PaymentIntent with manual capture (authorization hold)
   */
  async createAuthorizationHold(params: {
    amount: number;
    currency: string;
    description: string;
    customer_email?: string;
    metadata: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: params.amount,
      currency: params.currency,
      capture_method: "manual", // Authorization hold
      description: params.description,
      metadata: params.metadata,
    };

    if (params.customer_email) {
      paymentIntentParams.receipt_email = params.customer_email;
    }

    return await this.stripe.paymentIntents.create(paymentIntentParams);
  }

  /**
   * Retrieve PaymentIntent status
   */
  async getPaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.retrieve(id);
  }

  /**
   * Capture authorization hold (full or partial)
   */
  async captureHold(
    id: string,
    amountToCapture?: number,
  ): Promise<{
    paymentIntent: Stripe.PaymentIntent;
    estimatedFee: number;
  }> {
    const captureParams: Stripe.PaymentIntentCaptureParams = {};
    if (amountToCapture) {
      captureParams.amount_to_capture = amountToCapture;
    }

    const now = Date.now();
    const idempotencyKey = generateIdempotencyKey("capture", id, amountToCapture || null, now);

    const paymentIntent = await this.stripe.paymentIntents.capture(id, captureParams, {
      idempotencyKey,
    });

    const estimatedFee = calculateEstimatedFee(paymentIntent.amount_received || 0);

    return { paymentIntent, estimatedFee };
  }

  /**
   * Cancel authorization hold
   */
  async cancelHold(id: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.cancel(id);
  }

  /**
   * Verify webhook signature and construct event
   */
  constructWebhookEvent(body: string, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(body, signature, this.env.STRIPE_WEBHOOK_SECRET);
  }

  /**
   * Store hold metadata in KV
   */
  async storeHoldMetadata(
    paymentIntent: Stripe.PaymentIntent,
    metadata: Partial<HoldMetadata>,
  ): Promise<void> {
    const holdMetadata: HoldMetadata = {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      created_at: new Date(paymentIntent.created * 1000).toISOString(),
      ...metadata,
    };

    await this.env.HOLDS.put(paymentIntent.id, JSON.stringify(holdMetadata), {
      expirationTtl: KV_TTL_30_DAYS,
    });
  }

  /**
   * Retrieve hold metadata from KV
   */
  async getHoldMetadata(id: string): Promise<HoldMetadata | null> {
    const data = await this.env.HOLDS.get(id);
    return data ? JSON.parse(data) : null;
  }
}
