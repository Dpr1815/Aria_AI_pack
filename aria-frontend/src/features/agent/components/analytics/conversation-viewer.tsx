/* ─────────────────────────────────────────────────────────
 * ConversationViewer — chat-style message display
 *
 * Renders messages as bubbles, grouped by step key.
 * System messages shown as centered labels.
 * ───────────────────────────────────────────────────────── */

import type { MessageDTO } from "../../types/analytics.types";
import { Bot, User } from "lucide-react";
import { useLabels } from "@/i18n";

interface Props {
  messages: MessageDTO[];
}

export function ConversationViewer({ messages }: Props) {
  const { agent: { analytics: l } } = useLabels();

  if (messages.length === 0) {
    return (
      <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] italic text-center py-4">
        {l.noMessages}
      </p>
    );
  }

  // Group messages by stepKey for visual separation
  const groups = groupByStep(messages);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.stepKey} className="flex flex-col gap-1.5">
          {/* Step label */}
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.05)]" />
            <span className="text-[length:10px] font-mono uppercase tracking-[var(--tracking-wide)] text-[var(--color-text-muted)] px-2">
              {group.stepKey}
            </span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.05)]" />
          </div>

          {group.messages.map((msg) => {
            if (msg.role === "system") {
              return (
                <div
                  key={msg.sequence}
                  className="text-center text-[length:var(--text-xs)] text-[var(--color-text-muted)] italic py-1"
                >
                  {msg.content}
                </div>
              );
            }

            const isUser = msg.role === "user";

            return (
              <div
                key={msg.sequence}
                className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5
                    ${isUser ? "bg-[rgba(249,115,22,0.12)]" : "bg-[rgba(139,92,246,0.12)]"}
                  `}
                >
                  {isUser ? (
                    <User size={12} className="text-[var(--color-primary)]" />
                  ) : (
                    <Bot size={12} className="text-[rgba(139,92,246,0.8)]" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`
                    max-w-[85%] rounded-2xl px-3 py-2
                    text-[length:var(--text-sm)] leading-[var(--leading-normal)]
                    ${
                      isUser
                        ? "bg-[rgba(249,115,22,0.1)] text-[var(--color-text)] rounded-br-md"
                        : "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-secondary)] rounded-bl-md"
                    }
                  `}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  {msg.latencyMs != null && (
                    <span className="block text-[length:10px] text-[var(--color-text-muted)] mt-1 text-right">
                      {msg.latencyMs}ms
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

interface MessageGroup {
  stepKey: string;
  messages: MessageDTO[];
}

function groupByStep(messages: MessageDTO[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let current: MessageGroup | null = null;

  for (const msg of messages) {
    if (!current || current.stepKey !== msg.stepKey) {
      current = { stepKey: msg.stepKey, messages: [] };
      groups.push(current);
    }
    current.messages.push(msg);
  }

  return groups;
}
