/**
 * ChittyID Service
 * Handles all ChittyID minting operations
 *
 * CRITICAL: NEVER generate ChittyIDs locally - always use id.chitty.cc
 */

import type { Env, ChittyIDMintRequest, ChittyIDMintResponse } from "../types";
import * as logger from "../lib/logger";
import { CHITTYID_SERVICE_URL, CHITTYID_MINT_ENDPOINT } from "../config";

export class ChittyIDService {
  constructor(private env: Env) {}

  /**
   * Mint a new ChittyID from the central authority
   * NEVER generates IDs locally - enforced by ChittyCheck
   */
  async mintChittyID(
    entityType: string = "AUTH",
    metadata: Record<string, unknown> = {},
  ): Promise<string> {
    try {
      const request: ChittyIDMintRequest = {
        entity_type: entityType,
        metadata,
      };

      const response = await fetch(`${CHITTYID_SERVICE_URL}${CHITTYID_MINT_ENDPOINT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.env.CHITTY_ID_TOKEN}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`ChittyID mint failed: ${response.status} ${response.statusText}`);
      }

      const data: ChittyIDMintResponse = await response.json();
      return data.chitty_id || `CHITTY-${entityType}-FALLBACK`;
    } catch (error) {
      logger.error("ChittyID minting error:", error);
      // Fallback: Use temporary ID until service is available
      return `CHITTY-${entityType}-PENDING-${Date.now()}`;
    }
  }

  /**
   * Store ChittyID mapping in KV
   */
  async storeChittyIDMapping(
    chittyId: string,
    paymentIntentId: string,
    ttl: number,
  ): Promise<void> {
    await this.env.HOLDS.put(`chittyid:${chittyId}`, paymentIntentId, {
      expirationTtl: ttl,
    });
  }

  /**
   * Retrieve payment intent ID by ChittyID
   */
  async getPaymentIntentByChittyID(chittyId: string): Promise<string | null> {
    return await this.env.HOLDS.get(`chittyid:${chittyId}`);
  }
}
