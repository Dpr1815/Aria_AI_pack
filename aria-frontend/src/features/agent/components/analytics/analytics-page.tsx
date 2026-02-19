/* ─────────────────────────────────────────────────────────
 * AnalyticsPage — main layout for /agents/:agentId/analytics
 *
 * Structure:
 *   Stats cards (top)     — KPIs from statistics endpoint
 *   Sessions table        — unified table (participant + session + summary)
 *   Session modal         — two-column detail: overview + conversation
 * ───────────────────────────────────────────────────────── */

import { useState, useCallback } from "react";
import type { SessionStatus } from "../../types/analytics.types";
import { StatsCards } from "./stats-cards";
import { StatisticsSections } from "./statistics-sections";
import { SessionsTable } from "./sessions-table";
import { SessionModal } from "./session-modal";

interface Props {
  agentId: string;
}

export function AnalyticsPage({ agentId }: Props) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<SessionStatus | undefined>();
  const [page, setPage] = useState(1);

  const handleSelectSession = useCallback((id: string) => {
    setSelectedSessionId(id);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedSessionId(null);
  }, []);

  const handleStatusChange = useCallback(
    (status: SessionStatus | undefined) => {
      setStatusFilter(status);
      setPage(1);
    },
    [],
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* ── Stats cards ── */}
      <div className="shrink-0 px-6 pt-5 pb-4">
        <StatsCards agentId={agentId} />
      </div>

      {/* ── Scrollable area: statistics sections + sessions table ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 flex flex-col gap-6">
        {/* ── Detailed analytics sections ── */}
        <StatisticsSections agentId={agentId} />

        {/* ── Sessions table ── */}
        <SessionsTable
          agentId={agentId}
          page={page}
          statusFilter={statusFilter}
          onPageChange={setPage}
          onStatusFilterChange={handleStatusChange}
          onSelectSession={handleSelectSession}
          selectedSessionId={selectedSessionId}
        />
      </div>

      {/* ── Session detail modal ── */}
      {selectedSessionId && (
        <SessionModal
          sessionId={selectedSessionId}
          agentId={agentId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
