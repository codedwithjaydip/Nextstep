# NextStep

NextStep is an AI decision assistant. You describe a messy situation in plain language; it comes back with a summary, the issues it sees, a priority order, **one** recommended next action, its confidence, and what it still doesn't know.

When things change, you tell it, and it produces a new version rather than starting over.

> "Here is what seems most important, here is what you can do next, and here is where we're uncertain."

---

## 1. Product Overview

* **Home screen** — a single textarea: "What's on your mind?" → **Find My Next Step**
* **Analysis screen** — situation summary, a prominent **Next Action** card, issues, ranked priorities, missing information, risk flags, confidence, and optional change information.
* **Reassess** — a "Something changed?" box lets the user update the situation; NextStep creates a new version instead of losing history.
* **Clarifying questions** — when the AI needs more input before it can prioritize, it asks a question. The user can answer through buttons or free text and the situation is re-analyzed.
* **Refresh-safe** — the current situation ID is stored in `localStorage`, so refreshing the page resumes the current situation.

---

## 2. Architecture

```text
                    User
                      |
                      v
             React Client (Vite)
              Tailwind / fetch
                      |
                      | JSON
                      v
             Express Backend
                      |
          +-----------+-----------+
          |                       |
          v                       v
      MongoDB              NextStep Mock API
          |                       |
          |               X-Candidate-Id
          |               Idempotency-Key
          |               X-Chaos
          |                       |
          +-----------+-----------+
                      |
                      v
               Validated Result
```

The frontend **only communicates with our backend**.

All external API concerns are kept on the server:

* `X-Candidate-Id`
* `X-Chaos`
* `Idempotency-Key`
* retries
* timeouts
* upstream error handling
* response validation

This keeps the UI independent from the external API contract.

### Agent / Decision Loop

```text
User describes situation
          |
          v
     Analyze situation
          |
          v
 Identify issues + priorities
          |
          v
  Recommend ONE next action
          |
          v
   Present recommendation
          |
          v
    User decides what to do
          |
     +----+----+
     |         |
  No change   Something changed
     |         |
     |         v
     |    Reassess situation
     |         |
     |         v
     +----> New Version
```

### Thinking vs Performing an Action

A key design decision was to separate **thinking about an action** from **performing an action**.

NextStep can recommend a `next_action`, but it does **not automatically execute external actions** such as sending messages, making payments, changing accounts, or performing irreversible operations.

This is intentional.

The AI output is treated as a **recommendation**, not as permission to perform an action.

If action execution were added later, the safer flow would be:

```text
AI Recommendation
       |
       v
 Pending Action
       |
       v
 User Confirmation
       |
       v
 Execute Action
       |
       v
 Executed Action
```

The current challenge scope does not require external action execution, so adding a full tool-execution framework would add complexity without solving a required problem.

### Pending and Executed Actions

The current implementation does not create pending or executed action records because NextStep does not execute external actions.

The system stores:

* `Situation`
* `SituationVersion`
* `IdempotencyRecord`

The recommended action is stored as part of the validated analysis inside `SituationVersion`.

If real action execution is introduced later, pending and executed actions should be represented as separate persisted states rather than assuming that a model recommendation means an action has already happened.

### Why This Approach

I chose a conventional React + Express + MongoDB architecture instead of introducing an agent framework such as LangChain or LangGraph.

The challenge primarily requires:

* structured decision output
* reliable API integration
* validation
* versioning
* idempotency
* safe handling of unreliable responses

A dedicated agent framework would add abstractions for tool orchestration and agent state that are not required by the current product scope.

The simpler architecture makes the action boundary easier to understand and keeps the implementation small enough to reason about during a live interview.

---

## 3. Tech Stack

**Frontend**

* React 18
* Vite
* JavaScript
* Tailwind CSS
* React hooks
* Fetch API

**Backend**

* Node.js
* Express
* MongoDB
* Mongoose
* Axios
* Zod

**Persistence**

* MongoDB for situations, versions, and idempotency records
* `localStorage` only for the current situation ID

No user situation content is intentionally persisted in browser storage.

---

## 4. Setup

### Requirements

* Node.js 18+
* MongoDB connection string, either local MongoDB or MongoDB Atlas

### Backend

```bash
cd server
cp .env.example .env
```

Fill in the required environment variables and then:

```bash
npm install
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

### Frontend

Open another terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## 5. Environment Variables

### `server/.env`

| Variable           | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `PORT`             | Express port, default `5000`                 |
| `MONGODB_URI`      | MongoDB connection string                    |
| `NEXTSTEP_API_URL` | Base URL of the NextStep mock API            |
| `CANDIDATE_ID`     | Candidate email sent as `X-Candidate-Id`     |
| `X_CHAOS`          | Optional chaos value used for manual testing |

### `client/.env`

| Variable            | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `VITE_API_URL`      | URL of our own backend                               |
| `VITE_CANDIDATE_ID` | Candidate ID kept for client configuration/reference |

The candidate email is not hardcoded in source code. It is provided through environment variables, which are excluded from Git.

---

## 6. API Integration

The backend is the only part of the application that communicates with:

```text
https://nextstepmockapi.onrender.com
```

### Upstream API

The backend integrates with:

```text
POST /v1/situations
GET /v1/situations/{id}
POST /v1/situations/{id}/answers
POST /v1/situations/{id}/updates
```

Every request sends:

```text
X-Candidate-Id
```

Every POST request uses an idempotency key.

Streaming endpoints were not implemented because they were outside the minimal scope required for this submission.

### Application API

The React client consumes:

```text
POST   /api/v1/situations
GET    /api/v1/situations/:id
POST   /api/v1/situations/:id/answers
POST   /api/v1/situations/:id/updates
DELETE /api/situations/:id
```

The frontend does not need to know the upstream API structure.

---

## 7. Idempotency

Every POST request from the client carries an `idempotency_key`.

The backend:

1. receives the request
2. hashes the request body
3. checks the existing `IdempotencyRecord`
4. replays the stored response when the same key and payload are received
5. avoids unnecessarily calling the upstream API again

The stored record contains information such as:

```text
key
requestHash
statusCode
responseBody
candidateId
situationId
timestamps
```

This protects against duplicate requests caused by retries or repeated clicks.

A request using the same key with a different payload is handled according to the application's idempotency logic rather than blindly replaying an unrelated response.

---

## 8. Reliability Strategy

The mock API is intentionally unreliable, so reliability was treated as a core part of the implementation.

### Timeouts

* 15-second upstream timeout
* 20-second client-side timeout using `AbortController`

When a request takes too long, the UI displays a friendly message and keeps the user's typed information.

### Retry

The backend retries eligible transient failures up to two times with exponential backoff.

Retries are used for:

* `429`
* `500`
* `502`

`Retry-After` is honored when provided.

There are no infinite retry loops.

### Malformed or Empty Responses

Malformed JSON and empty responses are caught before reaching the UI.

The user receives a friendly message instead of a raw parser or server error.

### Schema Validation

Every upstream analysis response is validated using Zod through:

```text
analysisSchema.js
```

Only validated analysis data is stored or rendered.

Invalid responses are converted into a controlled application error.

### Tied Priorities

If multiple priorities have `rank: 1`, the application does not silently select one.

The UI explicitly indicates that the priorities are tied.

### Contradiction Detection

The application checks for structural contradictions such as:

* `next_action.issue_id` not matching a known issue
* contradiction information returned through `risk_flags`

Instead of inventing a resolution, the Next Action card surfaces a warning.

### User-Friendly Errors

Raw technical errors are not shown to the user.

The backend logs technical details while the frontend receives short, understandable messages.

---

## 9. MongoDB Data Model

### Situation

Stores the current state of a situation.

```text
situationId
candidateId
currentVersion
status
timestamps
```

### SituationVersion

Stores each version of the user's situation.

```text
situationId
version
inputText
analysis
changes
timestamps
```

Each version contains the validated analysis returned by the API.

### IdempotencyRecord

Stores information required to safely replay idempotent requests.

```text
key
candidateId
situationId
requestHash
statusCode
responseBody
timestamps
```

---

## 10. Versioning

Each create, answer, or update operation produces a new `SituationVersion` and updates:

```text
Situation.currentVersion
```

For example:

```text
Version 1
   |
   | user provides new information
   v
Version 2
   |
   | situation changes again
   v
Version 3
```

The current UI focuses on the latest version rather than building a full history browser.

This keeps the product focused on the next decision instead of turning it into a general version-management system.

---

## 11. Key Design Decisions

### Keep External API Knowledge in One Place

Headers, retries, timeouts, chaos handling, and upstream API details are kept inside:

```text
nextStepService.js
```

Controllers work with a simpler:

```text
{ status, data }
```

style interface.

### Validate at the Boundary

The API response is validated once using:

```text
analysisSchema.js
```

Only validated data is stored.

This means MongoDB does not become a source of unvalidated model output for the UI.

### Separate Idempotency from Versioning

Idempotency protects against duplicate upstream calls.

Versioning protects the user's evolving situation.

They solve different problems and are therefore kept as separate concerns.

### Centralized Mode Rendering

The main analysis modes:

```text
standard
needs_clarification
support
out_of_scope
```

are handled centrally in:

```text
AnalysisView.jsx
```

This avoids spreading mode-specific logic across multiple components.

---

## 12. Trade-offs

### No Agent Framework

I intentionally did not use LangChain, LangGraph, or another agent framework.

The current challenge does not require autonomous multi-tool execution. Introducing an agent framework would add complexity without improving the core decision flow.

### No Design System Library

The UI uses Tailwind utility classes instead of a component library.

This keeps the project small and makes the visual implementation easier to modify.

### No Automated Test Suite

There is currently no automated test suite.

Testing was performed manually against the shared scenarios and the available `X-Chaos` cases.

Given more time, the first automated tests I would add would be:

1. contract tests for `analysisSchema.js`
2. idempotency tests
3. retry/timeout tests
4. API integration tests

### No Full Version History UI

Versions are stored in MongoDB, but a dedicated history browser was not built.

The current scope only requires the latest situation state.

### No Streaming

Streaming responses were intentionally skipped because they were not necessary for the minimal required experience.

### No Automatic Action Execution

The system recommends actions but does not automatically execute them.

This keeps the distinction between **AI decision-making** and **real-world action execution** explicit.

---

## 13. Testing

The application was manually exercised against the required scenario types.

### Shared Scenarios

1. **Multi-problem situation** — exam, laptop, partner, family, and travel constraints
2. **Hinglish input**
3. **Contradictory constraints**
4. **Emotional / at-risk language** — verified that `support` mode is rendered instead of normal task prioritization
5. **Irrelevant request** — verified `out_of_scope` handling
6. **Adversarial prompt injection** — verified that the UI does not request or display sensitive credentials such as a UPI PIN
7. **Worse-after-action follow-up** — verified that it is handled as a normal reassessment through `POST /updates`

### Chaos Testing

The following `X-Chaos` cases were manually tested:

```text
slow
timeout
malformed
partial
server_error
rate_limit
tie
contradiction
empty
```

The corresponding error, fallback, warning, or tied-priority UI behaviour was verified manually.

---

## 14. Shared Scenario Results

| # | Scenario                     | Result |
| - | ---------------------------- | ------ |
| 1 | Multi-problem situation      | Passed |
| 2 | Hinglish input               | Passed |
| 3 | Contradictory constraints    | Passed |
| 4 | Emotional / at-risk language | Passed |
| 5 | Irrelevant request           | Passed |
| 6 | Adversarial prompt injection | Passed |
| 7 | Worse-after-action follow-up | Passed |

These results represent manual testing of the seven shared scenario inputs.

---

## 15. Curveball Response

The challenge included a curveball requiring the implementation to adapt to a changed requireme

### How I responded

I treated the change as a product requirement rather than rebuilding the application from scratch.

My approach was:

1. identify which existing flow was affected
2. check whether the change could be handled using the existing architecture
3. modify only the necessary frontend/backend behaviour
4. preserve the existing API boundary, validation, error handling, and versioning
5. avoid introducing a new framework or abstraction unless it was actually required

The goal was to adapt the existing system while keeping the implementation understandable and maintainable.

---

## 16. Jugaad — Problem I Noticed Beyond the Brief

One problem I noticed was **browser refresh and recovery behaviour**.

The brief focuses heavily on analysis and API reliability, but a user could refresh the page after creating a situation.

Without some form of recovery, the user could lose the context of the current situation.

I handled this by storing only the current `situationId` in `localStorage`.

The actual situation data, analysis, and versions remain on the backend.

This provides refresh-safe behaviour without introducing:

* browser-side storage of full user data
* authentication
* a large client-side state management system

This was a deliberate small solution to a real UX problem.

---

## 17. AI Usage Disclosure

### AI Tools Used

**Claude** was used as the primary AI development assistant.

### What I Asked AI to Do

AI assistance was used for:

* project scaffolding
* file and folder structure
* React component implementation
* Express controller and service logic
* MongoDB/Mongoose modelling
* API integration
* debugging
* retry and timeout logic
* error handling
* UI copy
* UI layout iteration
* README drafting

### What I Accepted

I accepted AI-generated implementation ideas and boilerplate when they matched the challenge requirements and the existing application architecture.

### What I Modified or Rejected

AI-generated code was reviewed and modified for the actual challenge requirements, especially around:

* upstream API integration
* candidate headers
* idempotency
* MongoDB persistence
* response validation
* unreliable API behaviour
* error states
* UI behaviour

I did not treat generated code as automatically correct.

### An Example Where AI Was Wrong or Unhelpful

During development, I did not encounter a major case where the AI-generated solution was completely unusable. However, I did not blindly accept AI-generated code. I verified the implementation against the challenge requirements, API contract, and expected behavior, and made changes whenever the generated approach did not match the requirements.

For example, AI was used to speed up implementation, but decisions such as keeping external actions as recommendations only, handling the candidate header on the backend, validating API responses, and supporting reassessment/versioning were checked against the challenge requirements before being finalized.

The initial AI suggestion did not correctly match the actual requirement or behaviour.

I verified the requirement against the challenge specification and the application's behaviour, tested the implementation, and changed the solution accordingly.

The final implementation therefore reflects reviewed engineering decisions rather than blindly accepting AI-generated output.

---

## 18. Known Limitations

* No automated test suite.
* No real authentication.
* `candidateId` is a configured value rather than a per-user account system.
* Contradiction detection is structural rather than a full semantic analysis of every free-text recommendation.
* No dedicated version-history UI.
* No streaming response support.
* No automatic external action execution.
* No developer-facing chaos-testing panel; chaos testing is performed through the configured `X-Chaos` value/header.

---

## 19. Submission Notes

The repository contains:

* frontend application
* backend application
* API integration
* MongoDB persistence
* reliability/error handling
* idempotency handling
* shared scenario testing
* architecture and design decisions
* AI usage disclosure
* known limitations

The implementation intentionally focuses on a **sensible, explainable decision assistant** rather than adding unnecessary agent complexity.

The central design principle is:

> **Think about the action first. Do not treat thinking about an action as permission to perform it.**
