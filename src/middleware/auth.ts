/**
 * Authentication Middleware
 */

import type { Env } from "../types";
import { AuthenticationError } from "../lib/errors";

export function authenticateRequest(request: Request, env: Env): void {
  const chittyIdToken = request.headers.get("ChittyID-Token");

  if (!chittyIdToken || chittyIdToken !== env.CHITTY_ID_TOKEN) {
    throw new AuthenticationError();
  }
}
