import { useEffect, useState } from "react";
import { DEFAULT_MODELS, runAiReview, type AiProvider, type AiReview } from "../lib/ai.ts";

const SESSION_KEY = "policylens.ai.session";

interface SessionAi {
  enabled: boolean;
  provider: AiProvider;
  model: string;
  apiKey: string;
}

const initial: SessionAi = {
  enabled: false,
  provider: "openai",
  model: DEFAULT_MODELS.openai,
  apiKey: "",
};

function readSession(): SessionAi {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<SessionAi>;
    const provider: AiProvider = parsed.provider === "anthropic" ? "anthropic" : "openai";
    return {
      enabled: Boolean(parsed.enabled),
      provider,
      model: typeof parsed.model === "string" && parsed.model ? parsed.model : DEFAULT_MODELS[provider],
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
    };
  } catch {
    return initial;
  }
}

export function AiPanel({ text }: { text: string }) {
  const [session, setSession] = useState<SessionAi>(initial);
  const [hydrated, setHydrated] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<AiReview | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    setSession(readSession());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // The key still lives in component state for this view.
    }
  }, [session, hydrated]);

  function update(patch: Partial<SessionAi>) {
    setSession((current) => ({ ...current, ...patch }));
  }

  async function run() {
    setRunning(true);
    setError("");
    try {
      const result = await runAiReview({
        provider: session.provider,
        apiKey: session.apiKey,
        model: session.model,
        text,
      });
      setReview(result.review);
      setTruncated(result.truncated);
    } catch (caught) {
      setReview(null);
      setError(caught instanceof Error ? caught.message : "The model review failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker">Optional · off until you run it</p>
          <h3 className="mt-1 font-serif text-xl">Model review</h3>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={session.enabled}
            onChange={(event) => update({ enabled: event.target.checked })}
          />
          Enable
        </label>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        This is separate from the QA score. Your key is kept in session storage for this tab and is sent only to the
        provider you pick, together with the document text. PolicyLens has no server in the middle.
      </p>
      {session.enabled ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Provider
              <select
                className="field mt-1"
                value={session.provider}
                onChange={(event) => {
                  const provider = event.target.value as AiProvider;
                  update({ provider, model: DEFAULT_MODELS[provider] });
                }}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Model
              <input
                className="field mt-1 font-mono"
                value={session.model}
                onChange={(event) => update({ model: event.target.value })}
              />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            API key
            <input
              className="field mt-1 font-mono"
              type="password"
              autoComplete="off"
              value={session.apiKey}
              onChange={(event) => update({ apiKey: event.target.value })}
              placeholder={session.provider === "openai" ? "sk-…" : "sk-ant-…"}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={running || !text.trim()} onClick={() => void run()}>
              {running ? "Running…" : "Run model review"}
            </button>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                update({ apiKey: "", enabled: false });
                setReview(null);
                setError("");
              }}
            >
              Forget key
            </button>
          </div>
          {error ? (
            <p className="text-sm text-clay" role="alert">
              {error}
            </p>
          ) : null}
          {review ? (
            <div className="rounded-xl border border-line bg-paper p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Model output · not part of the QA score
                {truncated ? " · first 12,000 characters were sent" : ""}
              </p>
              <p className="mt-2 text-sm">{review.summary}</p>
              {review.findings.length === 0 ? (
                <p className="mt-2 text-sm text-ink-soft">The model returned no findings.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {review.findings.map((finding) => (
                    <li key={`${finding.title}-${finding.message}`} className="text-sm">
                      <p className="font-semibold">
                        <span className="mr-2 uppercase tracking-wide text-ink-soft">{finding.severity}</span>
                        {finding.title}
                      </p>
                      <p className="mt-1 text-ink-soft">{finding.message}</p>
                      {finding.suggestion ? <p className="mt-1">Suggestion: {finding.suggestion}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm">Enable it when you want a model to read this draft. Nothing is sent before that.</p>
      )}
    </section>
  );
}
