export default function NextActionCard({ nextAction, contradiction }) {
  if (!nextAction || !nextAction.text) {
    return (
      <section
        aria-label="Next action"
        className="rounded-2xl border border-ink-600 bg-ink-800 p-6 text-center"
      >
        <p className="text-sm uppercase tracking-wide text-violet-400 mb-2">
          Next Action
        </p>
        <p className="text-neutral-400">
          No clear next action was identified yet.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Next action"
      className="relative overflow-hidden rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-600/20 via-ink-800 to-ink-800 p-6 sm:p-8 shadow-xl shadow-violet-950/30"
    >
      <p className="text-xs sm:text-sm font-medium uppercase tracking-wider text-violet-300 mb-3">
        Next Action
      </p>
      <p className="text-xl sm:text-2xl font-semibold text-white leading-snug">
        {nextAction.text}
      </p>

      {nextAction.why && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-xs uppercase tracking-wide text-neutral-400 mb-1">
            Why this matters
          </p>
          <p className="text-sm text-neutral-300">{nextAction.why}</p>
        </div>
      )}

      {contradiction && (
        <p className="mt-4 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          NextStep returned conflicting recommendations. Please review the
          priorities before acting.
        </p>
      )}
    </section>
  );
}
