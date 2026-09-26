// Urgency from the API is an integer 1 (low) to 5 (high).
function urgencyLabel(urgency) {
  if (urgency >= 4) return "High";
  if (urgency === 3) return "Medium";
  return "Low";
}

function urgencyStyle(urgency) {
  if (urgency >= 4) return "text-red-300 bg-red-500/10 border-red-500/30";
  if (urgency === 3) return "text-amber-300 bg-amber-500/10 border-amber-500/30";
  return "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";
}

function categoryLabel(category) {
  if (!category) return null;
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function IssuesList({ issues }) {
  if (!issues || issues.length === 0) return null;

  return (
    <section aria-labelledby="issues-heading">
      <h2 id="issues-heading" className="text-sm font-medium uppercase tracking-wide text-neutral-400 mb-3">
        Issues
      </h2>
      <ul className="space-y-2">
        {issues.map((issue, i) => (
          <li
            key={issue.id || i}
            className="rounded-xl border border-ink-600 bg-ink-800 px-4 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-neutral-100">
                {issue.title || "Untitled issue"}
              </span>
              {typeof issue.urgency === "number" && (
                <span
                  className={`text-xs rounded-full border px-2.5 py-0.5 ${urgencyStyle(
                    issue.urgency
                  )}`}
                >
                  Urgency: {urgencyLabel(issue.urgency)}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
              {issue.category && <span>Category: {categoryLabel(issue.category)}</span>}
              {issue.deadline && <span>Deadline: {issue.deadline}</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
