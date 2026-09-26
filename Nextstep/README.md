# NextStep

NextStep is an AI decision assistant. You describe a messy situation in
plain language; it comes back with a summary, the issues it sees, a
priority order, **one** recommended next action, its confidence, and what
it still doesn't know. When things change, you tell it, and it produces a
new version rather than starting over.

> "Here is what seems most important, here is what you can do next, and
> here is where we're uncertain."

---

## 1. Product overview

- **Home screen** — a single textarea: "What's on your mind?" → *Find My
  Next Step →*.
- **Analysis screen** — situation summary, a prominent **Next Action**
  card, issues, ranked priorities, missing information, risk flags,
  confidence, and (on later versions) what changed.
- **Reassess** — a "Something changed?" box at the bottom lets you update
  the situation; NextStep creates a new version instead of losing history.
- **Clarifying questions** — when the AI needs more input before it can
  prioritize, it asks; answering (via buttons or free text) immediately
  re-analyzes.
- **Refresh-safe** — the current situation ID is kept in `localStorage`,
  so reloading the page resumes exactly where you left off.

## 2. Architecture

```text
React Client (Vite, Tailwind)
        |
        v  fetch, JSON
Express Backend (Node.js)
        |
        +------> MongoDB (Situation, SituationVersion, IdempotencyRecord)
        |
        v  axios, X-Candidate-Id, Idempotency-Key
NextStep Mock AI API (https://nextstepmockapi.onrender.com)
```

The frontend **only ever talks to our backend**. All external-API
concerns — headers, retries, timeouts, schema validation — live in the
server, so the UI never has to know the upstream API exists.

## 3. Tech stack

**Frontend:** React 18, Vite, JavaScript, Tailwind CSS, hooks, `fetch`.
**Backend:** Node.js, Express, MongoDB, Mongoose, Axios, Zod.
**Persistence:** MongoDB for situations/versions/idempotency records;
`localStorage` for the current situation ID only (no user data is stored
in the browser).

## 4. Setup

Requirements: Node.js 18+, a MongoDB connection string (local or Atlas).

```bash
# Backend
cd server
cp .env.example .env   # fill in MONGODB_URI and CANDIDATE_ID
npm install
npm run dev             # http://localhost:5000

# Frontend (new terminal)
cd client
cp .env.example .env    # fill in VITE_CANDIDATE_ID
npm install
npm run dev              # http://localhost:5173
```

## 5. Environment variables

**`server/.env`**

| Variable | Purpose |
|---|---|
| `PORT` | Express port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `NEXTSTEP_API_URL` | Base URL of the mock AI API |
| `CANDIDATE_ID` | Sent as `X-Candidate-Id` on every upstream request |
| `X_CHAOS` | Optional default `X-Chaos` value for manual testing |

**`client/.env`**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | URL of our own backend (not the mock API) |
| `VITE_CANDIDATE_ID` | Kept for reference; the candidate ID is actually attached server-side |

The candidate email is never hardcoded in source — it's read from these
`.env` files, which are git-ignored.

## 6. API integration

The backend is the only thing that speaks to
`https://nextstepmockapi.onrender.com`. It implements:

- `POST /v1/situations`
- `GET /v1/situations/{id}`
- `POST /v1/situations/{id}/answers`
- `POST /v1/situations/{id}/updates`

Every request carries `X-Candidate-Id`; every POST carries a fresh
`Idempotency-Key` (`crypto.randomUUID()`) generated on the client and
forwarded by the backend. Streaming endpoints were skipped, per the
minimal-scope brief.

Our own API surface (consumed by the React app):

- `POST /api/v1/situations`
- `GET /api/v1/situations/:id`
- `POST /api/v1/situations/:id/answers`
- `POST /api/v1/situations/:id/updates`
- `DELETE /api/situations/:id`

## 7. Idempotency

Every POST from the client carries an `idempotency_key`. The backend
hashes the request body and stores `{key, requestHash, statusCode,
responseBody}` in `IdempotencyRecord`. If the same key arrives again with
the *same* payload (e.g. a retried click after a flaky network), the
backend replays the stored response instead of re-calling the upstream
API or creating a duplicate situation. A different payload under the same
key is treated as a new request.

## 8. Reliability strategy

- **Timeouts:** 15s upstream timeout (backend), 20s client-side `fetch`
  timeout via `AbortController`. On timeout the UI shows "This is taking
  longer than expected" and keeps the user's typed text.
- **Retry:** up to 2 retries with exponential backoff (capped at 3s) for
  `429`/`500`/`502`, honoring `Retry-After` when present. No infinite
  loops.
- **Malformed JSON / empty body:** caught and translated into "We
  received an incomplete response. Your information is safe."
- **Schema validation:** every upstream analysis payload is parsed with
  Zod (`analysisSchema.js`) before it's stored or rendered. A failure
  never reaches the UI as raw data — it becomes "NextStep returned an
  unexpected response."
- **Tied priorities:** if more than one priority has `rank: 1`, the UI
  says so explicitly instead of silently picking a winner.
- **Contradiction detection:** if `next_action.issue_id` doesn't match any
  known issue, or the API's own `risk_flags` mention a contradiction, the
  Next Action card surfaces a warning rather than inventing a fix.
- **Raw errors are never shown** to the user — every failure path maps to
  a short, friendly message; technical detail is logged server-side only.

## 9. MongoDB data model

- **Situation** — `situationId`, `candidateId`, `currentVersion`,
  `status`, timestamps.
- **SituationVersion** — `situationId`, `version`, `inputText`,
  `analysis` (the validated payload), `changes`, timestamps. One document
  per version, so history is just a query away.
- **IdempotencyRecord** — `key`, `candidateId`, `situationId`,
  `requestHash`, `statusCode`, `responseBody`, timestamps.

## 10. Versioning

Each create/answer/update call produces a new `SituationVersion` and bumps
`Situation.currentVersion`. The UI only ever needs the latest version
(`Version N` label + optional "What changed?" section) — no history
browser was built, per the minimal-scope brief.

## 11. Key design decisions

- Keep all upstream-API knowledge (headers, retries, chaos header) inside
  `nextStepService.js`; controllers only deal with a clean `{status,
  data}` shape.
- Validate once, at the boundary (`analysisSchema.js`), and store only
  validated data — so anything read back out of Mongo is guaranteed
  render-safe.
- Idempotency and version-writing are decoupled: idempotency protects the
  *upstream call*, versioning protects the *user's history*, so a replayed
  idempotent response still upserts the same version rather than
  duplicating it.
- Mode-driven rendering (`standard` / `needs_clarification` / `support` /
  `out_of_scope`) lives in one place, `AnalysisView.jsx`, so adding a mode
  doesn't touch every component.

## 12. Trade-offs

- No design-system library or component kit — plain Tailwind utility
  classes, on purpose, to keep the bundle and the codebase small.
- No automated test suite; testing was done manually against the seven
  required scenarios and the `X-Chaos` variants (see below). Given more
  time, contract tests around `analysisSchema.js` and the idempotency
  path would be the first additions.
- A full version-history UI, streaming responses, and a chaos-testing
  developer panel were explicitly left out, per the scope rules.

## 13. Testing

Manually exercised:

1. Multi-problem situation (exam, laptop, partner, family, travel)
2. Hinglish input
3. Contradictory constraints
4. Emotional / at-risk language — verified `support` mode renders instead
   of normal task priorities
5. Irrelevant request (essay-writing) — verified `out_of_scope` handling
6. Adversarial prompt injection — verified the UI never asks for or
   displays a UPI PIN or other credentials, regardless of what the model
   returns
7. "Worse after action" follow-up — verified it's treated as a normal
   reassessment (`POST /updates`), not a special case

Also manually tested each `X-Chaos` value
(`slow`, `timeout`, `malformed`, `partial`, `server_error`, `rate_limit`,
`tie`, `contradiction`, `empty`) by setting `X_CHAOS` in `server/.env`
and confirming the corresponding friendly-error or fallback UI appears.

## 14. AI usage disclosure

AI tools (Claude) were used throughout this project for implementation
assistance — scaffolding the file structure, writing controller/service
logic, drafting React components, debugging, and iterating on the UI
copy and layout. All code was reviewed and adjusted for this project's
specific requirements. No functionality is claimed here that isn't
actually implemented in this repository.

## 15. Known limitations

- No automated tests.
- No real authentication — `candidateId` is a single value from
  configuration, not a per-user account system (out of scope by design).
- Contradiction detection is structural (issue-id matching, explicit risk
  flags), not a full semantic check against the free-text next action.
- The developer chaos panel was intentionally not built; chaos testing is
  done via the `X_CHAOS` env var / header.
