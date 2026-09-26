import { useState } from "react";
import Spinner from "./Spinner.jsx";

export default function UpdateBox({ onSubmit, loading }) {
  const [text, setText] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    onSubmit(text.trim());
    setText("");
  }

  return (
    <section
      aria-labelledby="update-heading"
      className="rounded-2xl border border-ink-600 bg-ink-800 p-5"
    >
      <h2 id="update-heading" className="font-medium text-neutral-100 mb-1">
        Something changed?
      </h2>
      <p className="text-sm text-neutral-500 mb-3">
        Tell NextStep what changed.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="update-input" className="sr-only">
          What changed
        </label>
        <textarea
          id="update-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="e.g. My laptop is fixed, but the exam has been moved to Tuesday."
          className="w-full resize-none rounded-xl border border-ink-600 bg-ink-900 px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Spinner label="Reassessing…" /> : "Reassess →"}
        </button>
      </form>
    </section>
  );
}
