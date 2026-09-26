export function SupportMode({ analysis, onContinue }) {
  const support = analysis.support || {};
  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6 sm:p-8 text-center">
      <p className="text-sm uppercase tracking-wide text-violet-300 mb-3">
        We hear you
      </p>
      <p className="text-lg text-neutral-100 leading-relaxed">
        {support.message ||
          "It sounds like things feel heavy right now. You don't have to figure it all out at once."}
      </p>

      {support.resources && support.resources.length > 0 && (
        <div className="mt-5 text-left mx-auto max-w-md space-y-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Resources
          </p>
          <ul className="space-y-1.5">
            {support.resources.map((r, i) => (
              <li key={i} className="text-sm text-neutral-300">
                {typeof r === "string" ? r : JSON.stringify(r)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {support.offer_to_continue !== false && (
        <button
          onClick={onContinue}
          className="mt-6 min-h-[44px] rounded-xl border border-violet-500/40 px-5 py-2.5 text-sm font-medium text-violet-200 hover:bg-violet-500/10 transition-colors"
        >
          Continue
        </button>
      )}
    </div>
  );
}

export function OutOfScopeMode({ onStartNew }) {
  return (
    <div className="rounded-2xl border border-ink-600 bg-ink-800 p-6 sm:p-8 text-center">
      <p className="text-lg text-neutral-200">
        This request is outside what NextStep can help with.
      </p>
      <button
        onClick={onStartNew}
        className="mt-6 min-h-[44px] rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
      >
        Start New Situation
      </button>
    </div>
  );
}
