import crypto from "crypto";

/**
 * Deterministic hash of a request body, used to detect when an
 * Idempotency-Key is being replayed with a *different* payload
 * (which we treat as a conflict rather than silently reusing the
 * old response).
 */
export function hashRequestBody(body) {
  const normalized = JSON.stringify(body ?? {});
  return crypto.createHash("sha256").update(normalized).digest("hex");
}
