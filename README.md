# NextStep

NextStep is an AI-powered decision assistant that helps users turn a messy situation into a structured set of problems, priorities, and **one practical next action**.

The system focuses on **decision support, not automatic action execution**. It can recommend what the user should do next, but it does not perform external actions on the user's behalf.

---

## 1. Product Overview

A user can describe a situation in natural language, including multiple problems, conflicting constraints, uncertainty, or emotional context.

NextStep processes the situation through the NextStep API and presents:

* Situation summary
* Identified issues
* Ranked priorities
* One recommended next action
* Clarifying questions when information is missing
* Missing information
* Risk flags
* Confidence
* Changes after reassessment
* Support mode for sensitive situations
* Out-of-scope handling for irrelevant requests

Users can later provide an update and receive a new assessment.

---

## 2. Architecture

```text
                    ┌─────────────────────┐
                    │       User          │
                    │  Situation / Update │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ React + Vite Client │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Express Backend     │
                    │                     │
                    │ Validation          │
                    │ Error Handling      │
                    │ Idempotency         │
                    │ Retry / Timeout     │
                    │ Versioning          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ NextStep Mock API   │
                    │ External Service    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ MongoDB             │
                    │                     │
                    │ Situations          │
                    │ Versions            │
                    │ Idempotency Records │
                    └─────────────────────┘
```

The frontend does not directly depend on the external NextStep API. The Express backend acts as the integration layer.

This allows the backend to handle:

* Candidate identification
* Idempotency
* Timeouts
* Retries
* Upstream failures
* Response validation
* Friendly error responses
* Version persistence

---

## 3. Agent / Decision Loop

The current system follows a structured decision-support loop:

```text
User Situation
      ↓
Create Situation
      ↓
NextStep API Analysis
      ↓
Validate Response
      ↓
Persist Version
      ↓
Display Decision Support
      ↓
User Provides More Information
      ↓
Reassessment / New Version
```

The system does not independently execute real-world actions.

---

## 4. Thinking vs Performing an Action

A key design decision is separating a recommendation from execution.

For example:

```text
AI Recommendation
        ↓
"Contact your professor and ask for an extension."
```

This is only a recommendation.

The application does **not** automatically:

* Send the email
* Contact the professor
* Make a payment
* Book something
* Change an account
* Perform another external action

If action execution were added in the future, the intended flow would be:

```text
AI Recommendation
        ↓
Pending Action
        ↓
User Confirmation
        ↓
Execute Action
        ↓
Executed Action
```

The current implementation stops at the recommendation stage.

---

## 5. Pending and Executed Actions

Because the current product does not execute external actions, it does not create persistent `pending_action` or `executed_action` records.

The persisted data is focused on:

* Situation
* Situation versions
* Analysis
* Idempotency records

This keeps the implementation aligned with the current scope instead of introducing an execution workflow that the product does not currently need.

---

## 6. Why This Architecture?

I chose a conventional React + Express + MongoDB architecture instead of adding an agent framework such as LangChain or LangGraph.

The main reason was scope.

The challenge primarily requires:

* Structured decision support
* Reliable external API integration
* Validation
* Error handling
* Versioning
* Idempotency
* Handling unreliable API behaviour

These requirements can be implemented directly without adding another orchestration layer.

Using an agent framework would introduce additional abstraction and complexity without being necessary for the current decision loop.

---

## 7. Tech Stack

### Frontend

* React 18
* Vite
* Tailwind CSS
* Fetch API

### Backend

* Node.js
* Express
* Axios
* Zod
* Mongoose

### Database

* MongoDB

### External API

* NextStep Mock API

---

## 8. Project Structure

```text
Nextstep/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validation/
│   └── package.json
│
└── README.md
```

---

## 9. Setup

### Clone the repository

```bash
git clone https://github.com/codedwithjaydip/Nextstep.git
cd Nextstep/Nextstep
```

### Install frontend dependencies

```bash
cd client
npm install
```

### Install backend dependencies

```bash
cd ../server
npm install
```

### Environment Variables

The backend requires the MongoDB connection and candidate/API configuration.

Example:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CANDIDATE_ID=your_submission_email
NEXTSTEP_API_URL=https://nextstepmockapi.onrender.com
```

The frontend can use:

```env
VITE_API_URL=http://localhost:5000
```

Do not commit real credentials or secrets to the repository.

---

## 10. API Integration

The backend communicates with the external NextStep API.

Each request includes the required candidate identification header:

```text
X-Candidate-Id
```

Idempotent POST requests can also include:

```text
Idempotency-Key
```

For challenge testing, the backend supports:

```text
X-Chaos
```

which can be used to intentionally trigger failure conditions provided by the challenge API.

---

## 11. Reliability Strategy

The external API is treated as an unreliable dependency.

The backend implements:

### Timeout

Requests use a timeout so the application does not wait indefinitely.

### Retry

Retryable conditions include:

* HTTP 429
* HTTP 500
* HTTP 502
* Network failures
* Timeouts

Retries use a small exponential backoff and respect `Retry-After` when provided.

### Friendly Errors

Technical upstream errors are converted into user-friendly responses.

Examples include:

```text
timeout
network_error
malformed_response
invalid_schema
empty_response
rate_limited
upstream_server_error
```

The frontend displays these messages instead of exposing raw server errors.

---

## 12. Response Validation

The external API response is validated using Zod before it is stored or displayed.

The validation covers important fields such as:

* Situation ID
* Mode
* Issues
* Priorities
* Next action
* Clarifying questions
* Missing information
* Risk flags
* Confidence
* Changes
* Support information

This prevents an unexpected upstream response from being blindly trusted by the application.

---

## 13. Idempotency

POST operations support idempotency keys.

The backend stores:

```text
key
candidateId
situationId
requestHash
statusCode
responseBody
```

When the same idempotency key is received with the same request payload, the stored response can be replayed instead of sending the same operation to the upstream API again.

This helps prevent duplicate operations when a client retries a request.

---

## 14. Data Model

### Situation

Stores the current state of a situation.

Important fields include:

```text
situationId
candidateId
currentVersion
status
```

### SituationVersion

Stores each analysis version.

Important fields include:

```text
situationId
version
inputText
analysis
changes
```

### IdempotencyRecord

Stores idempotency information used to safely replay duplicate requests.

---

## 15. Versioning and Reassessment

A situation is not overwritten as a single piece of information.

When the user provides an update, the system creates/stores a new analysis version.

Example:

```text
Version 1
Initial situation
       ↓
User provides update
       ↓
Version 2
Updated assessment
```

The UI displays the current version to make reassessment visible to the user.

---

## 16. Important UI Modes

### Standard Mode

Displays:

* Summary
* Next action
* Issues
* Priorities
* Missing information
* Risk flags
* Confidence
* Changes

### Needs Clarification

If more information is required, the application displays clarifying questions instead of pretending that it has enough information.

### Support Mode

Sensitive or at-risk language can result in a support-oriented response instead of normal decision prioritization.

### Out-of-Scope

Irrelevant requests are not treated as normal decision problems.

---

## 17. Security / Prompt Injection Handling

The application treats the external analysis as structured data and does not allow an AI recommendation to directly execute an external action.

This is especially important for adversarial or prompt-injection style inputs.

For example, a malicious instruction attempting to make the application request credentials or sensitive information should not become an executable application action.

The application remains a decision-support interface rather than an autonomous action executor.

---

## 18. Refresh / Recovery

The frontend stores only the current `situationId` in browser `localStorage`.

On refresh:

```text
localStorage
     ↓
situationId
     ↓
GET /situations/{id}
     ↓
Restore latest saved version
```

The actual situation and analysis remain stored on the backend.

This provides a simple recovery mechanism without storing the complete analysis in browser storage.

---

## 19. Key Design Decisions

### Recommendation ≠ Execution

The system explicitly separates decision support from external action execution.

### Backend as API Boundary

The backend handles communication with the unreliable external service rather than exposing that dependency directly to the client.

### Validate Before Persisting

External responses are validated before being stored as analysis.

### Version Instead of Overwrite

Updates create new analysis versions so the evolution of the situation can be represented.

### Idempotency

Repeated POST requests can be safely handled using idempotency records.

### Simple Architecture

No agent framework was introduced because the current requirements did not require autonomous tool orchestration.

---

## 20. Trade-offs

### Conventional Express Architecture

**Benefit:**
Simple, explicit control over API calls, validation, retries, and persistence.

**Trade-off:**
More application-level code is required compared with using a higher-level agent framework.

### MongoDB

**Benefit:**
Flexible storage for evolving analysis structures and versioned responses.

**Trade-off:**
The application must manage version relationships explicitly.

### Backend Retry Logic

**Benefit:**
Improves resilience against temporary upstream failures.

**Trade-off:**
Retries increase request latency when the external service is unavailable.

---

## 21. Jugaad / Practical Shortcut

One practical implementation choice was using `localStorage` only for the current `situationId`.

Instead of storing the complete analysis in the browser, the client stores the identifier and restores the latest server-side version after refresh.

This keeps the client-side state small while still providing a useful resume experience.

---

## 22. AI Usage Disclosure

AI tools were used during development as a programming and development assistant.

AI was used for tasks such as:

* Initial project scaffolding
* React component structure
* Express backend structure
* MongoDB/Mongoose implementation ideas
* API integration
* Error handling
* Retry and timeout implementation
* Validation ideas
* UI implementation
* Debugging assistance
* Documentation and README drafting

I reviewed and modified generated code instead of treating AI output as the source of truth.

Important implementation decisions were checked against the challenge requirements and API contract, particularly:

* `X-Candidate-Id`
* `X-Chaos`
* `Idempotency-Key`
* API response validation
* Retry behaviour
* Versioning
* Reassessment
* Recommendation vs execution

### AI Limitation / Verification

I did not encounter a major case where an AI-generated implementation was completely unusable.

However, I did not blindly accept generated output. Generated suggestions were treated as development assistance and were checked against the actual challenge specification, API contract, and application behaviour before being included.

---

## 23. Curveball / Changed Requirements

When requirements or API behaviour require changes, the implementation is designed around a backend service boundary rather than tightly coupling the UI to the external API.

This means changes to:

* API request handling
* Error handling
* Validation
* Retry behaviour
* External API behaviour

can be handled primarily in the backend integration layer without redesigning the entire frontend.

The implementation also keeps the decision result structured, allowing the UI to support different modes such as standard, clarification, support, and out-of-scope responses.

---

## 24. Known Limitations

* The current application does not execute external actions.
* The quality of the decision analysis depends partly on the external NextStep API.
* The application does not implement a full autonomous agent loop.
* Persistent authentication for end users is outside the current scope.
* Browser `localStorage` stores only the current situation identifier and is not intended as secure storage for sensitive information.

---

## 25. Submission Notes

The project was built with AI assistance, but the final architecture and implementation were reviewed against the challenge requirements.

The primary design principle is:

> **NextStep recommends the next step; it does not take the step for the user.**

This keeps user control at the centre of the system while still providing structured decision support.
