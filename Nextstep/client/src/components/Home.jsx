import { useState } from "react";
import Spinner from "./Spinner.jsx";
import ErrorBanner from "./ErrorBanner.jsx";

const EXAMPLES = [
  "I have an exam Monday, my laptop is broken, and I also need to travel home this weekend.",
  "Viva is at 10am tomorrow, laptop won't boot, project partner ignoring calls for 2 days, dad admitted hospital in Surat, I'm in Pune.",
  "Kal submission hai, laptop dead ho gaya, aur landlord bol raha hai 5 tareekh tak flat khaali karo. Paise bhi nahi hai abhi.",
];

export default function Home({ onSubmit, loading, error, onRetry, onDismissError }) {
  const [text, setText] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    onSubmit(text.trim());
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Next<span className="text-violet-400">Step</span>
          </h1>
          <p className="mt-3 text-lg text-neutral-300">What's on your mind?</p>
          <p className="mt-1 text-sm text-neutral-500">
            Tell NextStep what's going on. We'll help you figure out what
            matters first.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="situation-input" className="sr-only">
            Describe your situation
          </label>
          <textarea
            id="situation-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="e.g. I have an exam Monday, my laptop is broken, and I also need to travel home this weekend."
            className="w-full resize-none rounded-2xl border border-ink-600 bg-ink-800 px-5 py-4 text-base text-neutral-100 placeholder:text-neutral-500 shadow-inner focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-colors"
          />

          {error && (
            <ErrorBanner message={error} onRetry={onRetry} onDismiss={onDismissError} />
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-base font-medium text-white shadow-lg shadow-violet-950/40 transition-colors hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
            >
              {loading ? <Spinner label="Analyzing…" /> : "Find My Next Step →"}
            </button>
          </div>
        </form>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
            Try an example
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setText(ex)}
                className="rounded-full border border-ink-600 bg-ink-800/70 px-3.5 py-1.5 text-xs text-neutral-400 hover:text-violet-300 hover:border-violet-500/50 transition-colors"
              >
                {ex.length > 46 ? ex.slice(0, 46) + "…" : ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
