/* ─────────────────────────────────────────────────────────
 * SessionDetailPanel — slide-over panel (right side)
 *
 * Shows session metadata, summary preview, and the
 * full conversation in a chat-bubble layout.
 * Uses the panel-root absolute positioning pattern.
 * ───────────────────────────────────────────────────────── */

import { useState } from "react";
import {
  useSessionDetail,
  useConversation,
  useSummaryBySession,
} from "../../hooks/use-analytics";
import { ConversationViewer } from "./conversation-viewer";
import { StatusBadge } from "./status-badge";
import {
  X,
  Clock,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";

interface Props {
  sessionId: string;
  onClose: () => void;
}

type PanelSection = "info" | "summary" | "conversation";

export function SessionDetailPanel({ sessionId, onClose }: Props) {
  const { data: session, isLoading: sessionLoading } =
    useSessionDetail(sessionId);
  const { data: conversation, isLoading: conversationLoading } =
    useConversation(sessionId);
  const { data: summary } = useSummaryBySession(sessionId);

  const [expanded, setExpanded] = useState<Set<PanelSection>>(
    new Set(["info", "conversation"]),
  );

  const toggleSection = (section: PanelSection) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  return (
    <div
      className="fixed top-[var(--header-height)] right-0 bottom-0 bg-[var(--color-surface)] border-l border-[rgba(255,255,255,0.06)] flex flex-col z-20"
      style={{
        width: "var(--panel-width)",
        animation: "slide-in-right 0.25s var(--ease-out) both",
      }}
    >
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-[var(--panel-px)] py-3 border-b border-[rgba(255,255,255,0.06)] panel-header-gradient">
        <div className="flex items-center gap-2 min-w-0 relative z-10">
          <MessageSquare
            size={16}
            className="text-[var(--color-primary)] shrink-0"
          />
          <span className="panel-title truncate">Session Detail</span>
        </div>
        <button
          onClick={onClose}
          className="relative z-10 flex items-center justify-center w-7 h-7 rounded-[var(--radius-input)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.06)] transition-all"
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Body (scrollable) ── */}
      <div className="panel-body panel-scroll px-[var(--panel-px)] py-[var(--panel-py)] flex flex-col gap-[var(--panel-gap)]">
        {sessionLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="panel-section animate-pulse h-12" />
            ))}
          </div>
        ) : session ? (
          <>
            {/* ── Session Info ── */}
            <CollapsibleSection
              title="Session Info"
              icon={User}
              isOpen={expanded.has("info")}
              onToggle={() => toggleSection("info")}
            >
              <div className="flex flex-col gap-2.5">
                <InfoRow label="Status">
                  <StatusBadge status={session.status} />
                </InfoRow>
                <InfoRow label="Current Step">
                  <span className="font-mono text-[length:var(--text-xs)]">
                    {session.currentStep}
                  </span>
                </InfoRow>
                <InfoRow label="Started">
                  {new Date(session.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </InfoRow>
                <InfoRow label="Last Activity">
                  <div className="flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(session.lastActivityAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </InfoRow>
                {session.completedAt && (
                  <InfoRow label="Completed">
                    {new Date(session.completedAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </InfoRow>
                )}
              </div>
            </CollapsibleSection>

            {/* ── Summary ── */}
            {summary && (
              <CollapsibleSection
                title="Summary"
                icon={FileText}
                isOpen={expanded.has("summary")}
                onToggle={() => toggleSection("summary")}
              >
                <SummaryPreview data={summary.data} />
              </CollapsibleSection>
            )}

            {/* ── Conversation ── */}
            <CollapsibleSection
              title={`Conversation${conversation ? ` (${conversation.messageCount})` : ""}`}
              icon={MessageSquare}
              isOpen={expanded.has("conversation")}
              onToggle={() => toggleSection("conversation")}
            >
              {conversationLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={`animate-pulse h-8 rounded-lg ${i % 2 === 0 ? "w-3/4" : "w-2/3 ml-auto"}`}
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    />
                  ))}
                </div>
              ) : conversation ? (
                <ConversationViewer messages={conversation.messages} />
              ) : (
                <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] italic">
                  No conversation data available.
                </p>
              )}
            </CollapsibleSection>
          </>
        ) : (
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Session not found.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Collapsible section ─────────────────────────────────── */

function CollapsibleSection({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: typeof User;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="panel-section !p-0 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-[var(--color-text-muted)]" />
          <span className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
            {title}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp size={14} className="text-[var(--color-text-muted)]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4 pt-0">{children}</div>}
    </div>
  );
}

/* ── Info row ─────────────────────────────────────────────── */

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] uppercase tracking-[var(--tracking-wide)] font-medium">
        {label}
      </span>
      <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
        {children}
      </span>
    </div>
  );
}

/* ── Summary preview ──────────────────────────────────────── */

function SummaryPreview({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).slice(0, 6);

  if (entries.length === 0) {
    return (
      <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] italic">
        Empty summary data.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([key, value]) => (
        <div key={key}>
          <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] font-medium uppercase tracking-[var(--tracking-wide)] mb-0.5">
            {key.replace(/([A-Z])/g, " $1").trim()}
          </p>
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] leading-[var(--leading-normal)]">
            {typeof value === "string"
              ? value
              : typeof value === "number"
                ? value
                : JSON.stringify(value, null, 2)}
          </p>
        </div>
      ))}
    </div>
  );
}
