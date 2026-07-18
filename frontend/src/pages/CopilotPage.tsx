import { Bot, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "../components/ToastProvider";
import { apiFetch } from "../lib/api";
import { demoCopilotResponse, fallbackNotice } from "../lib/demoData";
import { isDemoSession } from "../store/auth";
import type { CopilotResponse } from "../types";

type Message = { role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  role: "assistant",
  content:
    "Ask me anything about your spending, debt, salary, or savings. I answer using your actual financial data — no guesses.",
};

const STARTER_PROMPTS = [
  "Where did most of my money go this month?",
  "Can I afford a new EMI?",
  "Should I save this month or pay debt first?",
  "What subscriptions are draining money?",
  "Why is my savings rate low?",
];

export function CopilotPage() {
  const { showToast } = useToast();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation history on mount so context is preserved across sessions.
  useEffect(() => {
    const token = localStorage.getItem("finflow_token") ?? "";
    if (isDemoSession(token)) {
      setHistoryLoading(false);
      return;
    }
    apiFetch<Array<{ role: string; message: string }>>("/copilot/history")
      .then((rows) => {
        if (rows.length > 0) {
          setMessages([
            WELCOME,
            ...rows.map((r) => ({ role: r.role as "user" | "assistant", content: r.message })),
          ]);
        }
      })
      .catch(() => {
        // History load failure is non-fatal — start fresh.
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setIsDemo(false);
    const current = trimmed;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", content: current }]);

    try {
      const result = await apiFetch<CopilotResponse>("/copilot/ask", {
        method: "POST",
        body: JSON.stringify({ question: current }),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to reach copilot";
      setIsDemo(true);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: demoCopilotResponse.answer },
      ]);
      showToast(fallbackNotice, "info");
      void message; // suppress unused var
    } finally {
      setLoading(false);
    }
  }

  function selectPrompt(prompt: string) {
    setQuestion(prompt);
  }

  return (
    <div className="space-y-6">
      <section className="hero-panel">
        <p className="section-kicker">AI CFO</p>
        <h2 className="section-title">Financial copilot</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Ask about spending, debt, salary allocation, or savings. Answers are computed
          from your real transaction data — no guessing.
        </p>
      </section>

      {/* Starter prompts */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            className="panel text-left transition hover:-translate-y-0.5 hover:border-teal-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
            key={prompt}
            onClick={() => selectPrompt(prompt)}
            type="button"
          >
            <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-300" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium leading-snug">{prompt}</p>
          </button>
        ))}
      </div>

      {/* Chat panel */}
      <div className="panel flex flex-col" style={{ minHeight: "520px", maxHeight: "70vh" }}>
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <h3 className="panel-title text-xl">Conversational CFO</h3>
            <p className="mt-0.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
              Grounded in your transactions, debts, and budgets.
            </p>
          </div>
          {isDemo ? (
            <span className="badge-danger text-xs">Demo mode</span>
          ) : historyLoading ? (
            <span className="badge-neutral text-xs">Loading…</span>
          ) : (
            <span className="badge-success text-xs flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
              Claude AI
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {messages.map((message, index) => {
            const isAssistant = message.role === "assistant";
            return (
              <div
                key={`${message.role}-${index}`}
                className={`flex items-end gap-2.5 ${isAssistant ? "justify-start" : "justify-end"}`}
              >
                {isAssistant && (
                  <div
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-500 text-white shadow-sm"
                    aria-hidden="true"
                  >
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`px-4 py-3 text-sm leading-relaxed max-w-[78%] ${
                    isAssistant
                      ? "bg-slate-100 border border-slate-200/50 rounded-2xl rounded-bl-none text-slate-800 dark:bg-slate-900 dark:border-slate-800/60 dark:text-slate-100"
                      : "bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-2xl rounded-br-none shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-line">{message.content}</p>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-end gap-2.5 justify-start">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-500 text-white shadow-sm" aria-hidden="true">
                <Bot className="h-4 w-4" />
              </div>
              <div className="px-4 py-3 bg-slate-100 border border-slate-200/50 rounded-2xl rounded-bl-none dark:bg-slate-900 dark:border-slate-800/60">
                <div className="flex gap-1 items-center h-5">
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          className="flex flex-col gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80 sm:flex-row"
          onSubmit={ask}
        >
          <label className="sr-only" htmlFor="copilot-question">
            Ask the copilot
          </label>
          <input
            className="input flex-1"
            id="copilot-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about subscriptions, debt, or cash flow…"
            disabled={loading}
            autoComplete="off"
          />
          <button
            className="primary-button sm:w-auto whitespace-nowrap"
            disabled={loading || !question.trim()}
            type="submit"
          >
            {loading ? "Thinking…" : "Send"}
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>

      {/* Context policy note */}
      <div className="panel space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <h3 className="panel-title">How it works</h3>
        <p>
          The copilot reads your transactions, budgets, debt accounts, and salary plan to
          compute answers — it never guesses balances or invents figures.
        </p>
        <p className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 font-medium">
          Import a bank statement CSV first so the copilot has enough data to work with.
        </p>
      </div>
    </div>
  );
}
