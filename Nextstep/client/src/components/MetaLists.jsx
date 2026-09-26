export function MissingInformation({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <section aria-labelledby="missing-heading">
      <h2
        id="missing-heading"
        className="text-sm font-medium uppercase tracking-wide text-neutral-400 mb-3"
      >
        Missing Information
      </h2>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="text-sm text-neutral-300 flex gap-2 before:content-['•'] before:text-violet-400"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RiskFlags({ flags }) {
  if (!flags || flags.length === 0) return null;
  return (
    <section aria-labelledby="risk-heading">
      <h2
        id="risk-heading"
        className="text-sm font-medium uppercase tracking-wide text-neutral-400 mb-3"
      >
        Risk Flags
      </h2>
      <div className="flex flex-wrap gap-2">
        {flags.map((flag, i) => (
          <span
            key={i}
            className="text-xs rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 px-3 py-1"
          >
            {flag}
          </span>
        ))}
      </div>
    </section>
  );
}

const LEVEL_STYLES = {
  high: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  medium: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  low: "text-red-300 bg-red-500/10 border-red-500/30",
};

export function Confidence({ confidence }) {
  if (!confidence || !confidence.level) return null;
  return (
    <section aria-labelledby="confidence-heading">
      <h2
        id="confidence-heading"
        className="text-sm font-medium uppercase tracking-wide text-neutral-400 mb-2"
      >
        Confidence
      </h2>
      <span
        className={`inline-block text-xs rounded-full border px-3 py-1 mb-2 capitalize ${
          LEVEL_STYLES[confidence.level] || "text-neutral-300 bg-ink-700 border-ink-600"
        }`}
      >
        {confidence.level}
      </span>
      {confidence.reasons && confidence.reasons.length > 0 && (
        <ul className="space-y-1">
          {confidence.reasons.map((reason, i) => (
            <li
              key={i}
              className="text-sm text-neutral-400 flex gap-2 before:content-['•'] before:text-violet-400"
            >
              {reason}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
