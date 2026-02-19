/* ─────────────────────────────────────────────────────────
 * SessionsTable — unified sessions table with inline
 *                 participant info and summary status
 *
 * Single source of truth for all analytics data.
 * Click a row → opens the session detail modal.
 * ───────────────────────────────────────────────────────── */

import { useState } from "react";
import { useSessions, useParticipantMap, useDeleteSession } from "../../hooks/use-analytics";
import type { SessionStatus } from "../../types/analytics.types";
import { Pagination } from "./pagination";
import { StatusBadge } from "./status-badge";
import { EmptyState } from "./empty-state";
import { TableSkeleton } from "./table-skeleton";
import { MonitorPlay, Clock, ChevronRight, Search, Trash2 } from "lucide-react";
import { useLabels, t } from "@/i18n";
import { useOrgStore } from "@/features/organization/stores/organization.store";

const LIMIT = 15;

interface Props {
  agentId: string;
  page: number;
  statusFilter?: SessionStatus;
  onPageChange: (page: number) => void;
  onStatusFilterChange: (status: SessionStatus | undefined) => void;
  onSelectSession: (id: string) => void;
  selectedSessionId: string | null;
}

export function SessionsTable({
  agentId,
  page,
  statusFilter,
  onPageChange,
  onStatusFilterChange,
  onSelectSession,
  selectedSessionId,
}: Props) {
  const { agent: { analytics: l }, common } = useLabels();
  const { data, isLoading } = useSessions(agentId, {
    page,
    limit: LIMIT,
    status: statusFilter,
  });
  const { participantMap } = useParticipantMap(agentId);
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const isAdmin = activeOrg?.role === "role_admin";
  const deleteMutation = useDeleteSession(agentId);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sessions = data?.data ?? [];
  const meta = data?.meta;

  const statusOptions: { value: SessionStatus | undefined; label: string }[] = [
    { value: undefined, label: l.all },
    { value: "completed", label: l.completed },
    { value: "active", label: l.active },
    { value: "abandoned", label: l.abandoned },
  ];

  const headers = [
    l.participant,
    l.emailHeader,
    l.status,
    l.stepHeader,
    l.lastActivity,
    "",
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-[var(--radius-button)] bg-[rgba(255,255,255,0.03)] p-1">
            {statusOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={() => onStatusFilterChange(opt.value)}
                className={`
                  px-3 py-1.5 rounded-[var(--radius-input)]
                  text-[length:var(--text-xs)] font-medium
                  transition-all duration-[var(--duration-fast)]
                  ${
                    statusFilter === opt.value
                      ? "bg-[rgba(255,255,255,0.08)] text-[var(--color-text)] shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.04)]"
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {meta && (
          <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] tabular-nums">
            {meta.total} {meta.total !== 1 ? l.sessions : l.session}
          </span>
        )}
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={statusFilter ? Search : MonitorPlay}
          title={statusFilter ? l.noMatchingSessions : l.noSessionsYet}
          description={
            statusFilter
              ? t(l.noFilteredDescription, { status: statusFilter })
              : l.noSessionsDescription
          }
        />
      ) : (
        <div className="panel-section !p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                {headers.map((header) => (
                  <th
                    key={header || "action"}
                    className={`text-left px-4 py-3 text-[length:var(--text-xs)] font-semibold uppercase tracking-[var(--tracking-wide)] text-[var(--color-text-muted)] ${header === "" ? "w-10" : ""}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, i) => {
                const participant =
                  session.participant ??
                  participantMap.get(session.participantId);
                const isSelected = selectedSessionId === session._id;

                return (
                  <tr
                    key={session._id}
                    onClick={() => onSelectSession(session._id)}
                    style={{
                      animation: `fade-in 0.2s var(--ease-out) ${i * 25}ms both`,
                    }}
                    className={`
                      border-b border-[rgba(255,255,255,0.03)] cursor-pointer group
                      transition-colors duration-[var(--duration-fast)]
                      ${isSelected ? "bg-[rgba(249,115,22,0.06)]" : "hover:bg-[rgba(255,255,255,0.02)]"}
                    `}
                  >
                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <span className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                        {participant?.name || "—"}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3.5">
                      <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                        {participant?.email ?? "—"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={session.status} />
                    </td>

                    {/* Step */}
                    <td className="px-4 py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[rgba(255,255,255,0.04)] text-[length:var(--text-xs)] text-[var(--color-text-secondary)] font-mono">
                        {session.currentStep}
                      </span>
                    </td>

                    {/* Last activity */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                        <Clock size={12} />
                        {formatRelativeTime(session.lastActivityAt, l)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <button
                            type="button"
                            title={l.deleteSession}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(session._id);
                            }}
                            className="p-1 rounded-[var(--radius-button)] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-all duration-[var(--duration-fast)] hover:text-[var(--color-error,#ef4444)] hover:bg-[rgba(239,68,68,0.1)]"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <ChevronRight
                          size={15}
                          className="text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-fast)]"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {meta && meta.totalPages > 1 && (
        <Pagination meta={meta} onPageChange={onPageChange} />
      )}

      {/* ── Delete confirmation overlay ── */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="w-full max-w-sm rounded-[var(--radius-card,0.75rem)] border border-[rgba(255,255,255,0.08)] bg-[var(--color-surface-overlay,#1e1e2e)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
              {l.deleteSession}
            </h3>
            <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              {l.deleteSessionConfirm}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-[var(--radius-button)] px-4 py-2 text-[length:var(--text-sm)] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.06)]"
              >
                {common.cancel}
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(confirmDeleteId, {
                    onSettled: () => setConfirmDeleteId(null),
                  });
                }}
                className="rounded-[var(--radius-button)] bg-[var(--color-error,#ef4444)] px-4 py-2 text-[length:var(--text-sm)] font-medium text-white transition-colors hover:bg-[#dc2626] disabled:opacity-50"
              >
                {deleteMutation.isPending ? l.deleting : common.remove}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

interface TimeLabels {
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
}

function formatRelativeTime(iso: string, labels: TimeLabels): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return labels.justNow;
  if (mins < 60) return t(labels.minutesAgo, { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t(labels.hoursAgo, { n: hrs });
  const days = Math.floor(hrs / 24);
  if (days < 7) return t(labels.daysAgo, { n: days });
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
