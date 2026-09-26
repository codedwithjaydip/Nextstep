import NextActionCard from "./NextActionCard.jsx";
import IssuesList from "./IssuesList.jsx";
import PrioritiesList from "./PrioritiesList.jsx";
import ClarifyingQuestions from "./ClarifyingQuestions.jsx";
import ChangesList from "./ChangesList.jsx";
import UpdateBox from "./UpdateBox.jsx";
import ErrorBanner from "./ErrorBanner.jsx";
import { MissingInformation, RiskFlags, Confidence } from "./MetaLists.jsx";
import { SupportMode, OutOfScopeMode } from "./SpecialModes.jsx";

export default function AnalysisView({
  analysis,
  version,
  onAnswer,
  onUpdate,
  answering,
  updating,
  error,
  onDismissError,
  onStartNew,
}) {
  const mode = analysis.mode || "standard";
  const meta = analysis._meta || {};

  return (
    <div className="min-h-screen px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Next<span className="text-violet-400">Step</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs rounded-full border border-ink-600 bg-ink-800 px-3 py-1 text-neutral-400">
              Version {version}
            </span>
            <button
              onClick={onStartNew}
              className="text-xs text-neutral-500 hover:text-violet-300 transition-colors"
            >
              Start over
            </button>
          </div>
        </header>

        {error && (
          <ErrorBanner message={error} onDismiss={onDismissError} />
        )}

        {analysis.summary && (
          <section aria-labelledby="summary-heading">
            <h2
              id="summary-heading"
              className="text-sm font-medium uppercase tracking-wide text-neutral-400 mb-2"
            >
              Your Situation
            </h2>
            <p className="text-neutral-200 leading-relaxed">
              {analysis.summary}
            </p>
          </section>
        )}

        {mode === "support" && (
          <SupportMode analysis={analysis} onContinue={() => {}} />
        )}

        {mode === "out_of_scope" && <OutOfScopeMode onStartNew={onStartNew} />}

        {mode === "needs_clarification" && (
          <>
            <ClarifyingQuestions
              questions={analysis.clarifying_questions}
              onAnswer={onAnswer}
              submitting={answering}
            />
            <MissingInformation items={analysis.missing_information} />
          </>
        )}

        {mode === "standard" && (
          <>
            <NextActionCard
              nextAction={analysis.next_action}
              contradiction={meta.contradiction}
            />
            <IssuesList issues={analysis.issues} />
            <PrioritiesList
              priorities={analysis.priorities}
              tied={meta.tiedTopPriorities}
            />
            <MissingInformation items={analysis.missing_information} />
            <RiskFlags flags={analysis.risk_flags} />
            <Confidence confidence={analysis.confidence} />
            <ChangesList changes={analysis.changes} />
          </>
        )}

        {mode !== "out_of_scope" && (
          <UpdateBox onSubmit={onUpdate} loading={updating} />
        )}
      </div>
    </div>
  );
}
