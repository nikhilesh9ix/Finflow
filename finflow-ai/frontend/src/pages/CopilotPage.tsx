import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Send } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card, CardHeader } from "../components/Card";
import { Input } from "../components/Input";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/State";
import { useToast } from "../components/Toast";
import { api, type ChatMessage } from "../services/api";
import { copilotPrompts } from "../store/sampleData";

export function CopilotPage() {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(() => {
    setLoading(true);
    api.getChatHistory()
      .then((rows) => {
        if (rows.length === 0) {
          setMessages([]);
          setUsingSampleData(true);
        } else {
          setMessages(rows);
          setUsingSampleData(false);
        }
        setError("");
      })
      .catch((err) => {
        setMessages([]);
        setUsingSampleData(true);
        setError(err instanceof Error ? err.message : "Unable to load copilot history");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const visibleMessages = useMemo(() => {
    if (messages.length > 0) return messages;
    return [{ id: 0, role: "assistant", message: "Welcome to FinFlow AI. Ask me about budgets, debt payoff, or salary allocation.", created_at: "", updated_at: "" }];
  }, [messages]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      const userMessage = await api.createChatMessage({ role: "user", message: trimmed });
      const answer = await api.askCopilot(trimmed);
      const assistantMessage = await api.createChatMessage({ role: "assistant", message: answer.answer });
      setMessages((current) => [...current, userMessage, assistantMessage]);
      setDraft("");
      showToast("Message sent to the copilot thread.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to send message", "error");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="cards" />;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
      <Card>
        <CardHeader eyebrow="Suggested prompts" title="Ask your AI CFO" />
        <div className="space-y-3">
          {copilotPrompts.map((prompt) => (
            <button
              className="w-full rounded-lg bg-slate-50 p-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              key={prompt}
              onClick={() => setDraft(prompt)}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>
      </Card>

      <Card className="min-h-140">
        <CardHeader
          title="Financial copilot"
          action={<Badge tone={usingSampleData ? "warning" : "success"}>{usingSampleData ? "Demo thread" : "Live thread"}</Badge>}
        />
        {error && <ErrorState message={error} action={<Button onClick={loadHistory} type="button" variant="secondary">Retry</Button>} />}
        {visibleMessages.length === 0 ? (
          <EmptyState title="No messages yet" body="Ask a question to start a new conversation thread." />
        ) : (
          <div className="space-y-4">
            {visibleMessages.map((message) => (
              <div
                className={message.role === "assistant"
                  ? "mr-auto flex max-w-2xl gap-3 rounded-xl bg-slate-100 p-4 dark:bg-slate-950"
                  : "ml-auto flex max-w-2xl flex-row-reverse gap-3 rounded-xl bg-teal-50 p-4 dark:bg-teal-500/10"}
                key={`${message.id}-${message.created_at}`}
              >
                <Bot className={message.role === "assistant" ? "h-5 w-5 shrink-0 text-teal-600" : "h-5 w-5 shrink-0 text-teal-700 dark:text-teal-300"} />
                <p className="text-sm text-slate-700 dark:text-slate-200">{message.message}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Input className="sm:min-w-0" label="Message" onChange={(event) => setDraft(event.target.value)} placeholder="Ask about spending, debt, or salary allocation" value={draft} />
          <Button className="self-end" disabled={sending} icon={<Send className="h-4 w-4" />} onClick={handleSend} type="button">
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
