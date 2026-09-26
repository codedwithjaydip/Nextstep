import { useState } from "react";

export default function ClarifyingQuestions({ questions, onAnswer, submitting }) {
  const [freeText, setFreeText] = useState({});

  if (!questions || questions.length === 0) return null;

  return (
    <section
      aria-labelledby="clarify-heading"
      className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5"
    >
      <h2
        id="clarify-heading"
        className="text-sm font-medium uppercase tracking-wide text-violet-300 mb-4"
      >
        A few things would help
      </h2>

      <div className="space-y-5">
        {questions.map((q, i) => {
          const qid = q.id || `q_${i}`;
          return (
            <div key={qid}>
              <p className="text-neutral-100 font-medium mb-2">{q.question}</p>

              {q.options && q.options.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={submitting}
                      onClick={() => onAnswer(qid, opt)}
                      className="min-h-[44px] rounded-xl border border-ink-600 bg-ink-800 px-4 py-2 text-sm text-neutral-200 hover:border-violet-500 hover:text-violet-200 transition-colors disabled:opacity-40"
                    >
                      {opt}
                    </button>
                  ))}
                  {q.skippable !== false && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => onAnswer(qid, null)}
                      className="min-h-[44px] rounded-xl px-4 py-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-40"
                    >
                      Skip
                    </button>
                  )}
                </div>
              ) : (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = (freeText[qid] || "").trim();
                    if (value) onAnswer(qid, value);
                  }}
                >
                  <input
                    type="text"
                    aria-label={q.question}
                    value={freeText[qid] || ""}
                    onChange={(e) =>
                      setFreeText((prev) => ({ ...prev, [qid]: e.target.value }))
                    }
                    className="flex-1 rounded-xl border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-neutral-100 focus:border-violet-500 outline-none"
                    placeholder="Type your answer"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="min-h-[44px] rounded-xl bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
                  >
                    Answer
                  </button>
                  {q.skippable !== false && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => onAnswer(qid, null)}
                      className="min-h-[44px] rounded-xl px-3 text-sm text-neutral-500 hover:text-neutral-300 disabled:opacity-40"
                    >
                      Skip
                    </button>
                  )}
                </form>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
