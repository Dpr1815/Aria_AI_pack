/* ─────────────────────────────────────────────────────────
 * SessionModal — two-tab modal: Summary | Conversation
 *
 * Summary tab renders a general-purpose, visually rich
 * report from arbitrary nested data (scores, arrays,
 * strings, objects). No hardcoded section names.
 *
 * Conversation tab shows the full chat history.
 * ───────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useSessionDetail,
  useConversation,
  useSummaryBySession,
  useParticipantMap,
  useSessionVideoUrls,
} from "../../hooks/use-analytics";
import { ConversationViewer } from "./conversation-viewer";
import { SessionVideoPlayer } from "./session-video-player";
import { StatusBadge } from "./status-badge";
import {
  X,
  Clock,
  User,
  Mail,
  MessageSquare,
  FileText,
  Layers,
  Calendar,
  Timer,
  ChevronRight,
} from "lucide-react";

type ModalTab = "summary" | "conversation";

interface Props {
  sessionId: string;
  agentId: string;
  onClose: () => void;
}

export function SessionModal({ sessionId, agentId, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<ModalTab>("summary");
  const { data: session, isLoading: sessionLoading } =
    useSessionDetail(sessionId);
  const { data: conversation, isLoading: conversationLoading } =
    useConversation(sessionId);
  const { data: summary, isLoading: summaryLoading } =
    useSummaryBySession(sessionId);
  const { participantMap } = useParticipantMap(agentId);

  const participant = session
    ? participantMap.get(session.participantId)
    : undefined;

  /* Escape to close */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ animation: "fade-in 0.15s var(--ease-out) both" }}
    >
      {/* ── Backdrop ── */}
      <div
        className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
        onClick={onClose}
      />

      {/* ── Modal ── */}
      <div
        className="relative w-[92vw] max-w-[1000px] h-[85vh] rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[rgba(255,255,255,0.06)] shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
        style={{ animation: "scale-fade-in 0.2s var(--ease-out) both" }}
      >
        {/* ── Header ── */}
        <div className="shrink-0 border-b border-[rgba(255,255,255,0.06)] panel-header-gradient">
          {/* Top row: title + close */}
          <div className="flex items-center justify-between px-6 pt-4 pb-3">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-[var(--radius-input)] bg-[var(--color-primary-light)] flex items-center justify-center">
                <Layers size={17} className="text-[var(--color-primary)]" />
              </div>
              <div>
                <h2
                  className="text-[length:var(--text-lg)] font-semibold tracking-[var(--tracking-tight)] text-[var(--color-text)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {participant?.name || participant?.email || "Session Detail"}
                </h2>
                <div className="flex items-center gap-3 mt-0.5">
                  {session && <StatusBadge status={session.status} />}
                  {session && (
                    <span className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
                      {formatDateTime(session.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="relative z-10 flex items-center justify-center w-8 h-8 rounded-[var(--radius-input)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.06)] transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tab bar */}
          <div className="px-6 flex gap-0 relative z-10">
            <TabButton
              active={activeTab === "summary"}
              icon={FileText}
              label="Summary"
              onClick={() => setActiveTab("summary")}
            />
            <TabButton
              active={activeTab === "conversation"}
              icon={MessageSquare}
              label="Conversation"
              badge={conversation?.messageCount}
              onClick={() => setActiveTab("conversation")}
            />
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto panel-scroll">
          {activeTab === "summary" ? (
            <SummaryTab
              session={session}
              participant={participant}
              summary={summary}
              conversation={conversation}
              isLoading={sessionLoading || summaryLoading}
            />
          ) : (
            <ConversationTab
              conversation={conversation}
              isLoading={conversationLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Tab button ──────────────────────────────────────────── */

function TabButton({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: typeof FileText;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2.5
        text-[length:var(--text-sm)] font-medium
        border-b-2 transition-all duration-[var(--duration-fast)]
        ${
          active
            ? "border-[var(--color-primary)] text-[var(--color-text)]"
            : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
        }
      `}
    >
      <Icon size={15} />
      {label}
      {badge != null && (
        <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-[rgba(255,255,255,0.05)] text-[length:var(--text-xs)] tabular-nums">
          {badge}
        </span>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────
 * SUMMARY TAB
 * ───────────────────────────────────────────────────────── */

function SummaryTab({
  session,
  participant,
  summary,
  conversation,
  isLoading,
}: {
  session: ReturnType<typeof useSessionDetail>["data"];
  participant: { name?: string; email: string } | undefined;
  summary: ReturnType<typeof useSummaryBySession>["data"];
  conversation: ReturnType<typeof useConversation>["data"];
  isLoading: boolean;
}) {
  const { data: videoUrls } = useSessionVideoUrls(
    session?.videoLinks && Object.keys(session.videoLinks).length > 0
      ? session?._id ?? null
      : null,
  );

  /* Derive step order from conversation messages (first appearance) */
  const orderedSteps = useMemo(() => {
    if (!conversation?.messages) return [];
    const seen = new Set<string>();
    const order: string[] = [];
    for (const msg of conversation.messages) {
      if (!seen.has(msg.stepKey)) {
        seen.add(msg.stepKey);
        order.push(msg.stepKey);
      }
    }
    return order;
  }, [conversation?.messages]);

  if (isLoading) return <LoadingSkeleton />;

  const hasVideos = videoUrls && Object.keys(videoUrls).length > 0;

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* ── Session overview strip ── */}
      {session && (
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          style={{ animation: "fade-in 0.2s var(--ease-out) both" }}
        >
          <MiniCard
            icon={User}
            label="Participant"
            value={participant?.name || "—"}
          />
          <MiniCard
            icon={Mail}
            label="Email"
            value={participant?.email || "—"}
          />
          <MiniCard
            icon={Calendar}
            label="Started"
            value={formatDateTime(session.createdAt)}
          />
          <MiniCard
            icon={session.completedAt ? Timer : Clock}
            label={session.completedAt ? "Completed" : "Last Active"}
            value={formatDateTime(
              session.completedAt || session.lastActivityAt,
            )}
          />
        </div>
      )}

      {/* ── Video player (shown only when videos exist) ── */}
      {hasVideos && (
        <SessionVideoPlayer
          videoUrls={videoUrls}
          orderedSteps={orderedSteps}
        />
      )}

      {/* ── Summary report ── */}
      {summary ? (
        <div className="flex flex-col gap-5">
          {/* Type badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-primary-light)] text-[length:var(--text-xs)] font-medium text-[var(--color-primary)]">
              <FileText size={12} />
              {formatKey(summary.typeId)}
            </span>
            <span className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
              Generated {formatDateTime(summary.generatedAt)}
            </span>
          </div>

          {/* Sections — one per top-level key */}
          {Object.entries(summary.data).map(([sectionKey, sectionValue], i) => (
            <ReportSection
              key={sectionKey}
              title={sectionKey}
              data={sectionValue}
              index={i}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
            <FileText size={22} className="text-[var(--color-text-muted)]" />
          </div>
          <p className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
            No summary available
          </p>
          <p className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)] max-w-[280px] text-center">
            A summary will appear here once generated for this session.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── MiniCard (overview strip) ───────────────────────────── */

function MiniCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="panel-section flex items-start gap-2.5 !py-3">
      <Icon
        size={14}
        className="text-[var(--color-primary)] mt-0.5 shrink-0 opacity-70"
      />
      <div className="min-w-0">
        <p className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)] uppercase tracking-[var(--tracking-wide)] font-medium">
          {label}
        </p>
        <p className="text-[length:var(--text-sm)] text-[var(--color-text)] font-medium mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * REPORT SECTION — renders a top-level key as a card
 * ───────────────────────────────────────────────────────── */

function ReportSection({
  title,
  data,
  index,
}: {
  title: string;
  data: unknown;
  index: number;
}) {
  if (isPlainObject(data)) {
    const entries = Object.entries(data as Record<string, unknown>);
    const isScoreMap =
      entries.length > 0 && entries.every(([, v]) => typeof v === "number");

    return (
      <section
        className="panel-section !p-0 overflow-hidden"
        style={{
          animation: `scale-fade-in 0.25s var(--ease-out) ${index * 60}ms both`,
        }}
      >
        {/* Section header */}
        <div className="px-5 py-3.5 border-b border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.015)]">
          <div className="flex items-center gap-2">
            <ChevronRight size={14} className="text-[var(--color-primary)]" />
            <h3
              className="text-[length:var(--text-base)] font-semibold tracking-[var(--tracking-tight)] text-[var(--color-text)] capitalize"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {formatKey(title)}
            </h3>
          </div>
        </div>

        {/* Section body */}
        <div className="px-5 py-4">
          {isScoreMap ? (
            <ScoreMapRenderer entries={entries as [string, number][]} />
          ) : (
            <div className="flex flex-col gap-4">
              {entries.map(([key, value]) => (
                <FieldRenderer key={key} label={key} value={value} />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className="panel-section"
      style={{
        animation: `scale-fade-in 0.25s var(--ease-out) ${index * 60}ms both`,
      }}
    >
      <FieldRenderer label={title} value={data} />
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
 * FIELD RENDERER — recursive, type-aware
 *
 * Detects value types and picks the best visual:
 *   number  → score bar (0–10 or 0–100) or bold number
 *   string  → text block (long) or inline (short)
 *   array   → chips / tag list
 *   object  → nested card with its own fields
 *   boolean → yes/no badge
 * ───────────────────────────────────────────────────────── */

function FieldRenderer({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-[var(--tracking-wide)] text-[var(--color-text-secondary)] mb-1.5">
        {formatKey(label)}
      </p>
      <ValueRenderer value={value} />
    </div>
  );
}

function ValueRenderer({ value }: { value: unknown }) {
  // Null / undefined
  if (value == null) {
    return (
      <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] italic">
        —
      </span>
    );
  }

  // Boolean
  if (typeof value === "boolean") {
    return (
      <span
        className={`
          inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[length:var(--text-xs)] font-medium
          ${value ? "bg-[rgba(74,222,128,0.1)] text-[var(--color-success)]" : "bg-[rgba(248,113,113,0.08)] text-[var(--color-error)]"}
        `}
      >
        {value ? "Yes" : "No"}
      </span>
    );
  }

  // Number
  if (typeof value === "number") {
    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      return <ScoreBar value={value} max={value <= 10 ? 10 : 100} />;
    }
    return (
      <span className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)] tabular-nums">
        {value}
      </span>
    );
  }

  // String
  if (typeof value === "string") {
    if (value.length === 0) {
      return (
        <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] italic">
          —
        </span>
      );
    }
    if (value.length < 80) {
      return (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
          {value}
        </p>
      );
    }
    return (
      <div className="rounded-[var(--radius-input)] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] px-4 py-3">
        <p className="text-[length:var(--text-sm)] text-[var(--color-text)] leading-[var(--leading-relaxed)] whitespace-pre-wrap">
          {value}
        </p>
      </div>
    );
  }

  // Array
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)] italic">
          None
        </span>
      );
    }
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, i) => (
            <span
              key={i}
              className="inline-block px-2.5 py-1 rounded-[var(--radius-input)] bg-[var(--color-primary-light)] border border-[rgba(249,115,22,0.1)] text-[length:var(--text-xs)] text-[var(--color-text)] font-medium"
            >
              {String(item)}
            </span>
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        {value.map((item, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-input)] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] px-3 py-2"
          >
            <ValueRenderer value={item} />
          </div>
        ))}
      </div>
    );
  }

  // Nested object
  if (isPlainObject(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    const isScoreMap =
      entries.length > 0 && entries.every(([, v]) => typeof v === "number");
    if (isScoreMap) {
      return <ScoreMapRenderer entries={entries as [string, number][]} />;
    }
    return (
      <div className="rounded-[var(--radius-input)] bg-[rgba(255,255,255,0.015)] border border-[rgba(255,255,255,0.05)] px-4 py-3 flex flex-col gap-3">
        {entries.map(([key, val]) => (
          <FieldRenderer key={key} label={key} value={val} />
        ))}
      </div>
    );
  }

  // Fallback
  return (
    <pre className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)] font-mono bg-[rgba(255,255,255,0.02)] rounded-md p-2 overflow-x-auto">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

/* ── Score bar — always uses primary orange ───────────────── */

function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, var(--color-primary), var(--color-secondary))`,
            animation: "score-fill 0.6s var(--ease-out) both",
          }}
        />
      </div>
      <span className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)] tabular-nums shrink-0 min-w-[42px] text-right">
        {value}
        <span className="text-[var(--color-text-secondary)] font-normal">
          /{max}
        </span>
      </span>
    </div>
  );
}

/* ── Score map renderer (all-numeric objects) ─────────────── */

function ScoreMapRenderer({ entries }: { entries: [string, number][] }) {
  const max = entries.every(([, v]) => v <= 10) ? 10 : 100;

  return (
    <div className="flex flex-col gap-3.5">
      {entries.map(([key, value], i) => (
        <div
          key={key}
          style={{ animation: `fade-in 0.2s var(--ease-out) ${i * 40}ms both` }}
        >
          <p className="text-[length:var(--text-xs)] text-[var(--color-text)] mb-1.5">
            {formatKey(key)}
          </p>
          <ScoreBar value={value} max={max} />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * CONVERSATION TAB
 * ───────────────────────────────────────────────────────── */

function ConversationTab({
  conversation,
  isLoading,
}: {
  conversation: Awaited<ReturnType<typeof useConversation>["data"]>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`animate-pulse rounded-2xl ${i % 2 === 0 ? "w-3/4 h-12" : "w-2/3 h-12 ml-auto"}`}
            style={{ background: "rgba(255,255,255,0.04)" }}
          />
        ))}
      </div>
    );
  }

  if (!conversation || conversation.messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
          <MessageSquare size={22} className="text-[var(--color-text-muted)]" />
        </div>
        <p className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
          No conversation data
        </p>
        <p className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
          Messages will appear here once the session has activity.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[720px] mx-auto">
      <ConversationViewer messages={conversation.messages} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * SHARED
 * ───────────────────────────────────────────────────────── */

function LoadingSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel-section animate-pulse h-16" />
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="panel-section animate-pulse h-40" />
      ))}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .trim();
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
