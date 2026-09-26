import axios from "axios";

const BASE_URL = process.env.NEXTSTEP_API_URL || "https://nextstepmockapi.onrender.com";
const CANDIDATE_ID = process.env.CANDIDATE_ID || "";
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2; // total attempts = MAX_RETRIES + 1

const client = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  validateStatus: () => true, // we handle status codes ourselves
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status) {
  return status === 429 || status === 500 || status === 502;
}

function buildHeaders({ idempotencyKey, chaos } = {}) {
  const headers = {
    "Content-Type": "application/json",
    "X-Candidate-Id": CANDIDATE_ID,
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const chaosHeader = chaos ?? process.env.X_CHAOS;
  if (chaosHeader) headers["X-Chaos"] = chaosHeader;
  return headers;
}

/**
 * Low level request wrapper: timeout, retry with backoff on 429/500/502,
 * respects Retry-After. Never throws for HTTP-level errors; only throws
 * for network failures / timeouts so callers can produce a single
 * NextStepApiError shape.
 */
async function request(method, path, { body, idempotencyKey, chaos } = {}) {
  const headers = buildHeaders({ idempotencyKey, chaos });
  let attempt = 0;
  let lastError = null;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await client.request({
        method,
        url: path,
        data: body,
        headers,
      });

      if (isRetryable(response.status) && attempt < MAX_RETRIES) {
        const retryAfterHeader = response.headers["retry-after"];
        const retryAfterMs = retryAfterHeader
          ? Number(retryAfterHeader) * 1000
          : null;
        const backoffMs = retryAfterMs ?? Math.min(2 ** attempt * 400, 3000);
        await sleep(backoffMs);
        attempt += 1;
        continue;
      }

      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
      };
    } catch (err) {
      lastError = err;
      const isTimeout = err.code === "ECONNABORTED";
      const isNetwork = !err.response;

      if ((isTimeout || isNetwork) && attempt < MAX_RETRIES) {
        await sleep(Math.min(2 ** attempt * 400, 3000));
        attempt += 1;
        continue;
      }

      if (isTimeout) {
        const e = new Error("NEXTSTEP_TIMEOUT");
        e.kind = "timeout";
        throw e;
      }

      const e = new Error("NEXTSTEP_NETWORK_ERROR");
      e.kind = "network";
      throw e;
    }
  }

  const e = new Error("NEXTSTEP_EXHAUSTED_RETRIES");
  e.kind = "exhausted";
  e.cause = lastError;
  throw e;
}

export async function createSituation({ text, clientTime, idempotencyKey, chaos }) {
  return request("post", "/v1/situations", {
    body: { text, client_time: clientTime },
    idempotencyKey,
    chaos,
  });
}

export async function getSituation({ situationId, chaos }) {
  return request("get", `/v1/situations/${encodeURIComponent(situationId)}`, {
    chaos,
  });
}

export async function submitAnswers({
  situationId,
  answers,
  clientTime,
  idempotencyKey,
  chaos,
}) {
  // `answers` must already be the API's array shape:
  // [{ question_id, answer }]
  return request(
    "post",
    `/v1/situations/${encodeURIComponent(situationId)}/answers`,
    { body: { answers, client_time: clientTime }, idempotencyKey, chaos }
  );
}

export async function submitUpdate({
  situationId,
  text,
  clientTime,
  idempotencyKey,
  chaos,
}) {
  return request(
    "post",
    `/v1/situations/${encodeURIComponent(situationId)}/updates`,
    { body: { text, client_time: clientTime }, idempotencyKey, chaos }
  );
}

export async function healthCheck() {
  return request("get", "/health");
}
