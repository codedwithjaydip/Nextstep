const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 20000;

export class NextStepApiError extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.name = "NextStepApiError";
    this.code = code || "unknown_error";
    this.status = status || 0;
  }
}

// The API wants client_time WITH a UTC offset (e.g. 2026-09-27T00:15:00+05:30),
// not the UTC 'Z' that Date.toISOString() gives, so "tomorrow"/"tonight" are
// interpreted in the user's local day.
function clientTimeWithOffset() {
  const now = new Date();
  const pad = (n) => String(Math.abs(n)).padStart(2, "0");
  const offsetMin = -now.getTimezoneOffset(); // minutes east of UTC
  const sign = offsetMin >= 0 ? "+" : "-";
  const offsetStr = `${sign}${pad(Math.floor(Math.abs(offsetMin) / 60))}:${pad(
    Math.abs(offsetMin) % 60
  )}`;

  const yyyy = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());

  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}${offsetStr}`;
}

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers.
  return `key-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function request(path, { method = "GET", body } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new NextStepApiError(
        "This is taking longer than expected.",
        { code: "timeout", status: 0 }
      );
    }
    throw new NextStepApiError(
      "We couldn't reach the server. Check your connection and try again.",
      { code: "network_error", status: 0 }
    );
  }
  clearTimeout(timeoutId);

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON / empty body.
  }

  if (!response.ok) {
    throw new NextStepApiError(
      data?.message || "Something went wrong. Please try again.",
      { code: data?.error || "unknown_error", status: response.status }
    );
  }

  return data;
}

export async function createSituation(text) {
  return request("/api/v1/situations", {
    method: "POST",
    body: {
      text,
      client_time: clientTimeWithOffset(),
      idempotency_key: newIdempotencyKey(),
    },
  });
}

export async function getSituation(situationId) {
  return request(`/api/v1/situations/${encodeURIComponent(situationId)}`);
}

// answers: [{ question_id, answer }]  (answer: null means "skip")
export async function submitAnswers(situationId, answers) {
  return request(`/api/v1/situations/${encodeURIComponent(situationId)}/answers`, {
    method: "POST",
    body: {
      answers,
      client_time: clientTimeWithOffset(),
      idempotency_key: newIdempotencyKey(),
    },
  });
}

export async function submitUpdate(situationId, text) {
  return request(`/api/v1/situations/${encodeURIComponent(situationId)}/updates`, {
    method: "POST",
    body: {
      text,
      client_time: clientTimeWithOffset(),
      idempotency_key: newIdempotencyKey(),
    },
  });
}

export async function deleteSituation(situationId) {
  return request(`/api/situations/${encodeURIComponent(situationId)}`, {
    method: "DELETE",
  });
}
