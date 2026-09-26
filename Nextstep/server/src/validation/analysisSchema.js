import { z } from "zod";

// Shaped to match the real NextStep Mock API contract
// (HAZHTeq-Innovations/NextStep-API-Docs / CANDIDATE_API.md).
// The API is deliberately unreliable, so every field that isn't truly
// guaranteed by the docs is optional/nullable — we only require what we
// cannot render anything sensible without.

const IssueSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    category: z
      .enum([
        "work_study",
        "money",
        "family",
        "health",
        "housing",
        "relationships",
        "travel",
        "other",
      ])
      .nullable()
      .optional(),
    urgency: z.number().nullable().optional(), // 1 (low) to 5 (high)
    deadline: z.string().nullable().optional(), // ISO 8601 or null
    depends_on: z.array(z.string()).nullable().optional().default([]),
  })
  .passthrough();

const PrioritySchema = z
  .object({
    rank: z.number().optional(),
    issue_id: z.string().nullable().optional(),
    action: z.string().optional(),
    reason: z.string().nullable().optional(),
    estimated_minutes: z.number().nullable().optional(),
  })
  .passthrough();

const NextActionSchema = z
  .object({
    text: z.string().optional(),
    issue_id: z.string().nullable().optional(),
    why: z.string().nullable().optional(),
  })
  .passthrough()
  .nullable();

const ClarifyingQuestionSchema = z
  .object({
    id: z.string().optional(),
    question: z.string(),
    options: z.array(z.string()).optional().default([]),
    skippable: z.boolean().optional().default(true),
  })
  .passthrough();

const ConfidenceSchema = z
  .object({
    level: z.enum(["low", "medium", "high"]).optional(),
    reasons: z.array(z.string()).optional().default([]),
  })
  .passthrough()
  .nullable()
  .optional();

const ChangeSchema = z
  .object({
    field: z.string().optional(),
    from: z.union([z.string(), z.number(), z.null()]).optional(),
    to: z.union([z.string(), z.number(), z.null()]).optional(),
    reason: z.string().nullable().optional(),
  })
  .passthrough();

const SupportSchema = z
  .object({
    message: z.string().optional(),
    resources: z.array(z.any()).nullable().optional().default([]),
    offer_to_continue: z.boolean().nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

export const AnalysisSchema = z
  .object({
    situation_id: z.string(),
    version: z.number().optional(),
    server_time: z.string().nullable().optional(),
    mode: z
      .enum(["standard", "needs_clarification", "support", "out_of_scope"])
      .catch("standard"),
    summary: z.string().nullable().optional(),
    issues: z.array(IssueSchema).nullable().optional().default([]),
    priorities: z.array(PrioritySchema).nullable().optional().default([]),
    next_action: NextActionSchema.optional(),
    clarifying_questions: z
      .array(ClarifyingQuestionSchema)
      .nullable()
      .optional()
      .default([]),
    missing_information: z
      .array(z.string())
      .nullable()
      .optional()
      .default([]),
    risk_flags: z.array(z.string()).nullable().optional().default([]),
    confidence: ConfidenceSchema,
    changes: z.array(ChangeSchema).nullable().optional().default([]),
    support: SupportSchema,
  })
  .passthrough();

export function validateAnalysis(payload) {
  const result = AnalysisSchema.safeParse(payload);
  if (!result.success) {
    return { ok: false, error: result.error };
  }
  return { ok: true, data: result.data };
}
