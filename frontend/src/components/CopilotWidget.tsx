import { Bot, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch, isAuthError } from "../lib/api";
import { useAuthStore } from "../store/auth";
import type { CopilotResponse } from "../types";

type Message = { role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  role: "assistant",
  content:
    "Ask me anything about your spending, debt, salary, or savings. I answer using your actual financial data — no guesses.",
};

const STARTER_PROMPTS = [
  "Where did most of my money go this month?",
  "What subscriptions are draining money?",
  "Why is my savings rate low?",
  "Should I save or pay debt first?",
];

/**
 * Minimal markdown renderer for copilot answers.
 *
 * The model replies with **bold**, bullet lists, and pipe tables. Rendering the
 * raw string leaks asterisks and pipes into the UI, so translate the subset the
 * model actually emits. Text is split on markers and emitted as React nodes —
 * never dangerouslySetInnerHTML, since this string comes from an LLM.
 */
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableRows.length === 0) return;
    const [head, ...body] = tableRows;
    blocks.push(
      <div className="my-2 overflow-x-auto" key={key}>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {head.map((cell, i) => (
                <th
                  className="border-b border-slate-300 px-2 py-1 text-left font-semibold dark:border-slate-600"
                  key={i}
                >
                  {inline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td className="border-b border-slate-200 px-2 py-1 dark:border-slate-700" key={c}>
                    {inline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableRows = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
      // Skip the |---|---| separator row.
      if (!cells.every((c) => /^:?-+:?$/.test(c))) tableRows.push(cells);
      return;
    }
    flushTable(`table-${index}`);

    if (!trimmed) return;

    if (/^[-*•]\s+/.test(trimmed)) {
      blocks.push(
        <li className="ml-4 list-disc" key={index}>
          {inline(trimmed.replace(/^[-*•]\s+/, ""))}
        </li>,
      );
      return;
    }

    blocks.push(<p key={index}>{inline(trimmed)}</p>);
  });

  flushTable("table-end");
  return blocks;
}

/** Render **bold** segments inside a single line. */
function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function CopilotWidget() {
  const token = useAuthStore((state) => state.token);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyLoaded = useRef(false);

  // Load prior conversation the first time the panel is opened.
  useEffect(() => {
    if (!open || historyLoaded.current) return;
    historyLoaded.current = true;
    apiFetch<Array<{ role: string; message: string }>>("/copilot/history")
      .then((rows) => {
        if (rows.length > 0) {
          const history = rows.map((r) => ({ role: r.role as "user" | "assistant", content: r.message }));
          // Keep anything asked while history was loading: it comes after the saved
          // conversation. prev[0] is the welcome message.
          setMessages((prev) => [WELCOME, ...history, ...prev.slice(1)]);
        }
      })
      .catch(() => {
        // Non-fatal: start a fresh conversation.
      });
  }, [open]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setErrorText("");
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const result = await apiFetch<CopilotResponse>("/copilot/ask", {
        method: "POST",
        body: JSON.stringify({ question: trimmed }),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer }]);
    } catch (err) {
      // Auth errors stay silent — the 401 handler is already routing to /login.
      if (!isAuthError(err)) {
        setErrorText(err instanceof Error ? err.message : "Could not reach the copilot.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Hidden until signed in — every answer needs the user's own data.
  if (!token) return null;

  return (
    <>
      {!open && (
        <button
          aria-label="Open financial copilot"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {open && (
        <div
          aria-label="Financial copilot"
          className="fixed bottom-5 right-5 z-50 flex h-[min(34rem,calc(100vh-2.5rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          role="dialog"
        >
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                <Bot className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Financial copilot</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Grounded in your data</p>
              </div>
            </div>
            <button
              aria-label="Close copilot"
              className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((message, index) => (
              <div
                className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
                key={index}
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-teal-700 px-3 py-2 text-sm text-white"
                      : "max-w-[85%] space-y-1 rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  }
                >
                  {message.role === "user" ? message.content : renderMarkdown(message.content)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Analyzing your data…
                </div>
              </div>
            )}

            {errorText && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-200">
                {errorText}
              </p>
            )}

            {/* Starter prompts send immediately — they are the question, not a draft. */}
            {messages.length === 1 && !loading && (
              <div className="space-y-1.5 pt-1">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 transition hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-500"
                    key={prompt}
                    onClick={() => void send(prompt)}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            className="flex items-center gap-2 border-t border-slate-200 px-3 py-3 dark:border-slate-700"
            onSubmit={(event) => {
              event.preventDefault();
              void send(question);
            }}
          >
            <label className="sr-only" htmlFor="copilot-input">
              Ask the copilot
            </label>
            <input
              autoComplete="off"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              disabled={loading}
              id="copilot-input"
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about spending, debt, savings…"
              ref={inputRef}
              value={question}
            />
            <button
              aria-label="Send"
              className="rounded-lg bg-teal-700 p-2 text-white transition hover:bg-teal-800 disabled:opacity-50"
              disabled={loading || !question.trim()}
              type="submit"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
