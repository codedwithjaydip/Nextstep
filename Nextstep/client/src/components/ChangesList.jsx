function humanizeField(field) {
  if (!field) return "Something";
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ChangesList({ changes }) {
  if (!changes || changes.length === 0) return null;

  return (
    <section aria-labelledby="changes-heading">
      <h2
        id="changes-heading"
        className="text-sm font-medium uppercase tracking-wide text-neutral-400 mb-3"
      >
        What changed?
      </h2>
      <ul className="space-y-2">
        {changes.map((c, i) => (
          <li
            key={i}
            className="rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-sm"
          >
            <p className="text-neutral-100 font-medium">
              {humanizeField(c.field)} changed
            </p>
            {(c.from || c.to) && (
              <p className="text-neutral-500 mt-0.5">
                {c.from ?? "—"} → {c.to ?? "—"}
              </p>
            )}
            {c.reason && (
              <p className="text-neutral-400 mt-1">Because {c.reason}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
