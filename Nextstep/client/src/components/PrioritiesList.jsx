export default function PrioritiesList({ priorities, tied }) {
  if (!priorities || priorities.length === 0) return null;

  return (
    <section aria-labelledby="priorities-heading">
      <h2
        id="priorities-heading"
        className="text-sm font-medium uppercase tracking-wide text-neutral-400 mb-3"
      >
        Priorities
      </h2>

      {tied && (
        <p className="mb-3 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          Two priorities are currently tied.
        </p>
      )}

      <ol className="space-y-2">
        {priorities.map((p, i) => (
          <li
            key={p.id || i}
            className="flex gap-4 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3"
          >
            <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/20 text-violet-300 text-sm font-semibold">
              {p.rank ?? i + 1}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-neutral-100">
                {p.action || "Untitled priority"}
              </p>
              {p.reason && (
                <p className="mt-1 text-sm text-neutral-400">
                  Because {p.reason}
                </p>
              )}
              {typeof p.estimated_minutes === "number" && (
                <p className="mt-1 text-xs text-neutral-500">
                  Estimated: {p.estimated_minutes} min
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
