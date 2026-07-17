import { Bot, Sparkles, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { useToast } from "../components/ToastProvider";
import { apiFetch } from "../lib/api";
import { demoCopilotResponse, fallbackNotice } from "../lib/demoData";
import type { CopilotResponse } from "../types";

type Message = { role: "user" | "assistant"; content: string };

const starterPrompts = [
  "Where did most of my money go this month?",
  "Can I afford a new EMI?",
  "Should I save this month or pay debt first?",
  "What subscriptions are draining money?",
  "Why is my savings rate low?",
];

export function CopilotPage() {
  const { showToast } = useToast();
  const [question, setQuestion] = useState(starterPrompts[0]);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ask a money question and I will answer with computed facts first, then a short explanation." },
  ]);
  const [response, setResponse] = useState<CopilotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ question: string; answer: string; created_at: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<{ items: { question: string; answer: string; created_at: string }[] }> ("/copilot/history").then((data) => setHistory(data.items)).catch(() => {
      setHistory([]);
      showToast(fallbackNotice, "info");
    });
  }, [showToast]);

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    const current = question;
    setMessages((items) => [...items, { role: "user", content: current }]);
    setQuestion("");
    try {
      const result = await apiFetch<CopilotResponse>("/copilot/ask", {
        method: "POST",
        body: JSON.stringify({ question: current }),
      });
      setResponse(result);
      setMessages((items) => [...items, { role: "assistant", content: result.answer }]);
      const latest = await apiFetch<{ items: { question: string; answer: string; created_at: string }[] }>("/copilot/history");
      setHistory(latest.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to answer question";
      setError(message);
      setResponse(demoCopilotResponse);
      setMessages((items) => [...items, { role: "assistant", content: demoCopilotResponse.answer }]);
      showToast(fallbackNotice, "info");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !response && !history.length) return <LoadingSkeleton variant="chat" />;

  return (
    <div className="space-y-6">
      {error ? <ErrorState title="Copilot fallback active" body={error} /> : null}
      <section className="hero-panel">
        <p className="section-kicker">AI CFO</p>
        <h2 className="section-title">Financial copilot</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Ask about spending, debt, salary allocation, subscriptions, or savings. Computed facts are shown separately from the AI explanation.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {starterPrompts.map((prompt) => (
          <button className="panel text-left transition hover:-translate-y-0.5 hover:border-teal-400" key={prompt} onClick={() => setQuestion(prompt)} type="button">
            <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-300" />
            <p className="mt-2 text-sm font-medium">{prompt}</p>
          </button>
        ))}
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel flex flex-col h-[640px] p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="panel-title text-xl">Conversational CFO</h3>
              <p className="mt-0.5 text-xs font-semibold text-slate-400 dark:text-slate-500">Grounded in transactions, debts, & budgets.</p>
            </div>
            {response ? <span className="badge-success capitalize text-xs tracking-wider">{response.provider} active</span> : <span className="badge-success text-xs">Ready</span>}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-2">
            {messages.map((message, index) => {
              const isAssistant = message.role === "assistant";
              return (
                <div key={`${message.role}-${index}`} className={`flex items-end gap-2.5 ${isAssistant ? "justify-start" : "justify-end"}`}>
                  {isAssistant && (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-500 text-white shadow-xs">
                      <Bot className="h-4 w-4" aria-hidden="true" />
                    </div>
                  )}
                  <div className={`p-4 text-sm leading-relaxed max-w-[75%] ${isAssistant ? "bg-slate-100 border border-slate-200/50 rounded-2xl rounded-bl-none text-slate-800 dark:bg-slate-900 dark:border-slate-800/60 dark:text-slate-100" : "bg-linear-to-r from-teal-600 to-cyan-600 text-white rounded-2xl rounded-br-none shadow-xs"}`}>
                    <p className="whitespace-pre-line">{message.content}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <form className="flex flex-col gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 sm:flex-row" onSubmit={ask}>
            <label className="sr-only" htmlFor="question">Ask the copilot</label>
            <input className="input" id="question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about subscriptions, debt, or cash flow..." />
            <button className="primary-button sm:w-auto whitespace-nowrap" disabled={loading} type="submit">
              {loading ? "Thinking..." : "Send query"}
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
          {error ? <p className="alert-error text-xs font-semibold">{error}</p> : null}
        </div>

        <div className="space-y-6">
          <div className="panel space-y-3.5">
            <h3 className="panel-title">Computed facts</h3>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 -mt-2">Hard numbers compiled from your local profile databases.</p>
            <div className="space-y-3 mt-4">
              {response?.facts.map((fact) => (
                <div className="rounded-2xl border border-slate-200/50 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-950/40" key={fact.label}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{fact.label}</p>
                    <p className="text-base font-extrabold text-teal-650 dark:text-teal-400">{fact.value}</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">{fact.detail}</p>
                </div>
              ))}
            </div>
            {response ? <p className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 font-medium">Facts are calculated locally on your data. The copilot does not guess or hallucinate balances.</p> : null}
          </div>

          <div className="panel space-y-3">
            <h3 className="panel-title">Suggested starter prompts</h3>
            {(response?.starter_prompts?.length ? response.starter_prompts : starterPrompts).map((prompt) => (
              <button className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-teal-400 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200" key={prompt} onClick={() => setQuestion(prompt)} type="button">
                {prompt}
              </button>
            ))}
          </div>

          <div className="panel space-y-3">
            <h3 className="panel-title">Recent history</h3>
            {history.length ? history.map((item) => (
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60" key={`${item.created_at}-${item.question}`}>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
                <p className="mt-1 text-sm font-semibold">{item.question}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.answer}</p>
              </div>
            )) : <p className="text-sm text-slate-500 dark:text-slate-400">Ask a question to start your chat history.</p>}
          </div>

          <div className="panel space-y-2">
            <h3 className="panel-title">Context policy</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">Context is assembled from transactions, budgets, debts, salary plan, and investment profile.</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">OpenAI or Gemini is used only when an API key exists; otherwise the deterministic fallback answers from local facts.</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Example fact: emergency buffer can be compared with current emergency fund to explain why recommendations change.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
