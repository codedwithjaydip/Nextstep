import { useEffect, useState, useCallback } from "react";
import Home from "./components/Home.jsx";
import AnalysisView from "./components/AnalysisView.jsx";
import Spinner from "./components/Spinner.jsx";
import * as api from "./services/nextstepApi.js";

const STORAGE_KEY = "nextstep_situation_id";

export default function App() {
  const [analysis, setAnalysis] = useState(null);
  const [restoring, setRestoring] = useState(true);
  const [creating, setCreating] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [lastAction, setLastAction] = useState(null); // for retry

  // Resume from localStorage on load.
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (!storedId) {
      setRestoring(false);
      return;
    }

    api
      .getSituation(storedId)
      .then((data) => setAnalysis(data))
      .catch((err) => {
        if (err.status === 404) {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          setError(err.message);
        }
      })
      .finally(() => setRestoring(false));
  }, []);

  const handleCreate = useCallback(async (text) => {
    setCreating(true);
    setError(null);
    setLastAction(() => () => handleCreate(text));
    try {
      const data = await api.createSituation(text);
      localStorage.setItem(STORAGE_KEY, data.situation_id);
      setAnalysis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }, []);

  const handleAnswer = useCallback(
    async (questionId, value) => {
      if (!analysis) return;
      setAnswering(true);
      setError(null);
      // API expects an array: [{ question_id, answer }]; answer: null skips.
      const answers = [{ question_id: questionId, answer: value }];
      setLastAction(() => () => handleAnswer(questionId, value));
      try {
        const data = await api.submitAnswers(analysis.situation_id, answers);
        setAnalysis(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setAnswering(false);
      }
    },
    [analysis]
  );

  const handleUpdate = useCallback(
    async (text) => {
      if (!analysis) return;
      setUpdating(true);
      setError(null);
      setLastAction(() => () => handleUpdate(text));
      try {
        const data = await api.submitUpdate(analysis.situation_id, text);
        setAnalysis(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setUpdating(false);
      }
    },
    [analysis]
  );

  const handleStartNew = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAnalysis(null);
    setError(null);
  }, []);

  const handleRetry = useCallback(() => {
    if (lastAction) lastAction();
  }, [lastAction]);

  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner label="Restoring your last situation…" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <Home
        onSubmit={handleCreate}
        loading={creating}
        error={error}
        onRetry={handleRetry}
        onDismissError={() => setError(null)}
      />
    );
  }

  return (
    <AnalysisView
      analysis={analysis}
      version={analysis.version ?? 1}
      onAnswer={handleAnswer}
      onUpdate={handleUpdate}
      answering={answering}
      updating={updating}
      error={error}
      onDismissError={() => setError(null)}
      onStartNew={handleStartNew}
    />
  );
}
