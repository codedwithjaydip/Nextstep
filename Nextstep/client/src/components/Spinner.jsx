export default function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex items-center gap-3 text-neutral-400" role="status" aria-live="polite">
      <span className="h-4 w-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
