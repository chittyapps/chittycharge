/**
 * Stripe Webhook Handler
 */

import type { Env } from "../types";
import { StripeService } from "../services/stripe.service";
import { ValidationError } from "../lib/errors";
import * as logger from "../lib/logger";

/**
 * Handle Stripe webhook events
 * POST /webhook
 */
export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    throw new ValidationError("Missing stripe-signature header");
  }

  const body = await request.text();
  const stripeService = new StripeService(env);

  const event = stripeService.constructWebhookEvent(body, signature);

  logger.info("Webhook received:", event.type);

  // Handle specific events
  switch (event.type) {
    case "payment_intent.amount_capturable_updated":
      logger.info("Authorization hold authorized:", event.data.object.id);
      break;

    case "charge.captured":
      logger.info("Authorization hold captured:", event.data.object.id);
      break;

    case "payment_intent.canceled":
      logger.info("Authorization hold released:", event.data.object.id);
      break;

    default:
      logger.info("Unhandled event type:", event.type);
  }

  return Response.json({ received: true }, { status: 200 });
}
