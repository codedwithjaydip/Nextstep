import Situation from "../models/Situation.js";
import SituationVersion from "../models/SituationVersion.js";
import IdempotencyRecord from "../models/IdempotencyRecord.js";
import { hashRequestBody } from "../utils/requestHash.js";
import { validateAnalysis } from "../validation/analysisSchema.js";
import * as nextStepService from "../services/nextStepService.js";

const CANDIDATE_ID = process.env.CANDIDATE_ID || "";

/**
 * Friendly, never-raw-error responses shown to the client. We keep the
 * technical detail in `logDetail` (server logs only).
 */
const FRIENDLY_ERRORS = {
  timeout: {
    status: 504,
    code: "timeout",
    message: "This is taking longer than expected. Please try again.",
  },
  network: {
    status: 502,
    code: "network_error",
    message: "We couldn't reach NextStep right now. Please try again.",
  },
  malformed: {
    status: 502,
    code: "malformed_response",
    message:
      "We received an incomplete response. Your information is safe. Please try again.",
  },
  invalid_schema: {
    status: 502,
    code: "invalid_schema",
    message: "NextStep returned an unexpected response. Please try again.",
  },
  empty: {
    status: 502,
    code: "empty_response",
    message:
      "NextStep didn't return an analysis this time. Please try again.",
  },
  upstream_client_error: {
    status: 422,
    code: "upstream_client_error",
    message: "We couldn't process that. Please rephrase and try again.",
  },
  upstream_server_error: {
    status: 502,
    code: "upstream_server_error",
    message: "NextStep is having trouble right now. Please try again shortly.",
  },
  rate_limited: {
    status: 429,
    code: "rate_limited",
    message: "NextStep is busy right now. Please wait a moment and try again.",
  },
  not_found: {
    status: 404,
    code: "not_found",
    message: "We couldn't find that situation.",
  },
  unknown: {
    status: 500,
    code: "unknown_error",
    message: "Something went wrong on our end. Please try again.",
  },
};

function friendly(res, key, logDetail) {
  if (logDetail) console.error(`[situationController] ${key}:`, logDetail);
  const err = FRIENDLY_ERRORS[key] || FRIENDLY_ERRORS.unknown;
  return res.status(err.status).json({ error: err.code, message: err.message });
}

/**
 * Given a raw upstream {status, data}, parse/validate it and translate
 * failures into a friendly-error key. Returns { ok: true, analysis } or
 * { ok: false, errorKey }.
 */
function parseUpstreamResponse(status, data) {
  if (status === 404) return { ok: false, errorKey: "not_found" };
  if (status === 429) return { ok: false, errorKey: "rate_limited" };
  if (status === 413) return { ok: false, errorKey: "upstream_client_error" };
  if (status === 422) {
    // Known 422 codes per the API docs: unknown_question,
    // question_not_skippable, idempotency_key_reused.
    return { ok: false, errorKey: "upstream_client_error", upstreamCode: data?.error };
  }
  if (status === 400) return { ok: false, errorKey: "upstream_client_error" };
  if (status === 502) return { ok: false, errorKey: "timeout" }; // gateway gave up, treat like a timeout
  if (status >= 500) return { ok: false, errorKey: "upstream_server_error" };

  if (data === null || data === undefined) {
    return { ok: false, errorKey: "empty" };
  }
  if (typeof data === "string") {
    // Axios would have already parsed valid JSON; a raw string here
    // usually means the upstream sent malformed/non-JSON content.
    return { ok: false, errorKey: "malformed" };
  }
  if (typeof data === "object" && Object.keys(data).length === 0) {
    return { ok: false, errorKey: "empty" };
  }

  const result = validateAnalysis(data);
  if (!result.ok) {
    return { ok: false, errorKey: "invalid_schema", zodError: result.error };
  }

  return { ok: true, analysis: result.data };
}

/**
 * Best-effort contradiction detection between next_action and issues/priorities.
 */
function detectContradiction(analysis) {
  const { next_action, issues = [], priorities = [] } = analysis;
  if (!next_action) return false;

  if (next_action.issue_id) {
    const knownIds = new Set(
      issues.map((i) => i.id).filter((id) => id !== undefined && id !== null)
    );
    if (knownIds.size > 0 && !knownIds.has(next_action.issue_id)) {
      return true;
    }
  }

  // If there are ranked priorities and the top-ranked one is clearly
  // unrelated in title to the next action text, we don't try to be
  // clever about NLP-level contradiction — only flag the structural
  // case above plus an explicit conflict flag from the API, if present.
  if (analysis.risk_flags?.some((f) => /contradict/i.test(f))) {
    return true;
  }

  return false;
}

function detectTiedTopPriorities(priorities = []) {
  const rankOnes = priorities.filter((p) => p.rank === 1);
  return rankOnes.length > 1 ? rankOnes : null;
}

async function saveNewVersion({ situationId, candidateId, inputText, analysis }) {
  let situation = await Situation.findOne({ situationId });
  const version = analysis.version ?? (situation ? situation.currentVersion + 1 : 1);

  if (!situation) {
    situation = await Situation.create({
      situationId,
      candidateId,
      currentVersion: version,
      status: "active",
    });
  } else {
    situation.currentVersion = version;
    situation.status = "active";
    await situation.save();
  }

  await SituationVersion.findOneAndUpdate(
    { situationId, version },
    {
      situationId,
      version,
      inputText,
      analysis,
      changes: analysis.changes ?? [],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return situation;
}

function decorateAnalysis(analysis) {
  const tied = detectTiedTopPriorities(analysis.priorities);
  const contradiction = detectContradiction(analysis);
  return {
    ...analysis,
    _meta: {
      tiedTopPriorities: !!tied,
      contradiction,
    },
  };
}

/**
 * Wraps idempotency-key bookkeeping around a POST action.
 * If the same key was already used with the same payload, replays the
 * stored response instead of hitting the upstream API again.
 */
async function withIdempotency({ key, candidateId, situationId, body }, fn) {
  if (!key) return fn();

  const requestHash = hashRequestBody(body);
  const existing = await IdempotencyRecord.findOne({ key });

  if (existing) {
    if (existing.requestHash === requestHash && existing.statusCode) {
      return {
        replayed: true,
        status: existing.statusCode,
        data: existing.responseBody,
      };
    }
    // Same key, different payload — treat as a fresh request but keep
    // the original record's identity by updating it below.
  }

  const result = await fn();

  await IdempotencyRecord.findOneAndUpdate(
    { key },
    {
      key,
      candidateId,
      situationId: situationId ?? null,
      requestHash,
      statusCode: result.httpStatus ?? 200,
      responseBody: result.body ?? null,
    },
    { upsert: true }
  );

  return { replayed: false, ...result };
}

export async function createSituation(req, res) {
  const { text, client_time, idempotency_key, chaos } = req.body || {};

  if (!text || typeof text !== "string" || !text.trim()) {
    return res
      .status(400)
      .json({ error: "invalid_input", message: "Please describe your situation." });
  }

  try {
    const idem = await withIdempotency(
      {
        key: idempotency_key,
        candidateId: CANDIDATE_ID,
        situationId: null,
        body: { text, client_time },
      },
      async () => {
        const upstream = await nextStepService.createSituation({
          text,
          clientTime: client_time || new Date().toISOString(),
          idempotencyKey: idempotency_key,
          chaos,
        });
        return { httpStatus: upstream.status, body: upstream.data, _raw: upstream };
      }
    );

    const raw = idem._raw || { status: idem.status, data: idem.data };
    const parsed = parseUpstreamResponse(raw.status, raw.data);
    if (!parsed.ok) return friendly(res, parsed.errorKey, parsed.zodError);

    const analysis = parsed.analysis;
    await saveNewVersion({
      situationId: analysis.situation_id,
      candidateId: CANDIDATE_ID,
      inputText: text,
      analysis,
    });

    return res.status(201).json(decorateAnalysis(analysis));
  } catch (err) {
    return friendly(res, err.kind || "unknown", err);
  }
}

export async function getSituation(req, res) {
  const { id } = req.params;
  try {
    const situation = await Situation.findOne({ situationId: id, status: "active" });
    if (!situation) return friendly(res, "not_found");

    const latest = await SituationVersion.findOne({
      situationId: id,
      version: situation.currentVersion,
    });

    if (!latest) return friendly(res, "not_found");

    return res.json(decorateAnalysis(latest.analysis));
  } catch (err) {
    return friendly(res, "unknown", err);
  }
}

export async function submitAnswers(req, res) {
  const { id } = req.params;
  const { answers, client_time, idempotency_key, chaos } = req.body || {};

  // answers must be the API's array shape: [{ question_id, answer }]
  if (!Array.isArray(answers) || answers.length === 0) {
    return res
      .status(400)
      .json({ error: "invalid_input", message: "Missing answers." });
  }

  try {
    const situation = await Situation.findOne({ situationId: id, status: "active" });
    if (!situation) return friendly(res, "not_found");

    const idem = await withIdempotency(
      {
        key: idempotency_key,
        candidateId: CANDIDATE_ID,
        situationId: id,
        body: { answers },
      },
      async () => {
        const upstream = await nextStepService.submitAnswers({
          situationId: id,
          answers,
          clientTime: client_time,
          idempotencyKey: idempotency_key,
          chaos,
        });
        return { httpStatus: upstream.status, body: upstream.data, _raw: upstream };
      }
    );

    const raw = idem._raw || { status: idem.status, data: idem.data };
    const parsed = parseUpstreamResponse(raw.status, raw.data);
    if (!parsed.ok) return friendly(res, parsed.errorKey, parsed.zodError);

    const analysis = parsed.analysis;
    await saveNewVersion({
      situationId: id,
      candidateId: CANDIDATE_ID,
      inputText: `[answers] ${JSON.stringify(answers)}`,
      analysis,
    });

    return res.json(decorateAnalysis(analysis));
  } catch (err) {
    return friendly(res, err.kind || "unknown", err);
  }
}

export async function submitUpdate(req, res) {
  const { id } = req.params;
  const { text, client_time, idempotency_key, chaos } = req.body || {};

  if (!text || typeof text !== "string" || !text.trim()) {
    return res
      .status(400)
      .json({ error: "invalid_input", message: "Please describe what changed." });
  }

  try {
    const situation = await Situation.findOne({ situationId: id, status: "active" });
    if (!situation) return friendly(res, "not_found");

    const idem = await withIdempotency(
      {
        key: idempotency_key,
        candidateId: CANDIDATE_ID,
        situationId: id,
        body: { text, client_time },
      },
      async () => {
        const upstream = await nextStepService.submitUpdate({
          situationId: id,
          text,
          clientTime: client_time || new Date().toISOString(),
          idempotencyKey: idempotency_key,
          chaos,
        });
        return { httpStatus: upstream.status, body: upstream.data, _raw: upstream };
      }
    );

    const raw = idem._raw || { status: idem.status, data: idem.data };
    const parsed = parseUpstreamResponse(raw.status, raw.data);
    if (!parsed.ok) return friendly(res, parsed.errorKey, parsed.zodError);

    const analysis = parsed.analysis;
    await saveNewVersion({
      situationId: id,
      candidateId: CANDIDATE_ID,
      inputText: text,
      analysis,
    });

    return res.json(decorateAnalysis(analysis));
  } catch (err) {
    return friendly(res, err.kind || "unknown", err);
  }
}

export async function deleteSituation(req, res) {
  const { id } = req.params;
  try {
    await Situation.deleteOne({ situationId: id });
    await SituationVersion.deleteMany({ situationId: id });
    await IdempotencyRecord.deleteMany({ situationId: id });
    return res.status(204).send();
  } catch (err) {
    return friendly(res, "unknown", err);
  }
}
