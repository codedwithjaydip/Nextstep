export default function ErrorBanner({ message, onRetry, onDismiss }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
    >
      <span>{message}</span>
      <div className="flex gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-lg border border-red-400/40 px-3 py-1.5 text-red-100 hover:bg-red-500/20 transition-colors"
          >
            Try again
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded-lg px-3 py-1.5 text-red-200/70 hover:text-red-100 transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
