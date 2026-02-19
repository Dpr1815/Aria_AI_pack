/* ─────────────────────────────────────────────────────────
 * StatsCards — top-level KPI metrics row
 *
 * Pulls from GET /statistics/agent/:agentId
 * Shows 4 cards: total sessions, completion rate,
 *                completed, abandoned (derived)
 * ───────────────────────────────────────────────────────── */

import {
  useStatistics,
  useCalculateStatistics,
} from "../../hooks/use-analytics";
import {
  Activity,
  CheckCircle2,
  TrendingUp,
  XCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useLabels } from "@/i18n";

interface Props {
  agentId: string;
}

interface StatCard {
  label: string;
  value: string | number;
  icon: typeof Activity;
  color: string;
  bgColor: string;
}

export function StatsCards({ agentId }: Props) {
  const { agent: { analytics: l } } = useLabels();
  const { data: stats, isLoading, error } = useStatistics(agentId);
  const calculate = useCalculateStatistics(agentId);

  const cards: StatCard[] = stats
    ? [
        {
          label: l.totalSessions,
          value: stats.totalSessions,
          icon: Activity,
          color: "var(--color-accent)",
          bgColor: "rgba(56, 189, 248, 0.1)",
        },
        {
          label: l.completionRate,
          value: `${Math.round(stats.averageCompletionRate)}%`,
          icon: TrendingUp,
          color: "var(--color-success)",
          bgColor: "rgba(74, 222, 128, 0.1)",
        },
        {
          label: l.completed,
          value: stats.completedSessions,
          icon: CheckCircle2,
          color: "var(--color-primary)",
          bgColor: "rgba(249, 115, 22, 0.1)",
        },
        {
          label: l.abandoned,
          value: stats.totalSessions - stats.completedSessions,
          icon: XCircle,
          color: "var(--color-error)",
          bgColor: "rgba(248, 113, 113, 0.1)",
        },
      ]
    : [];

  if (error && !stats) {
    return (
      <div className="panel-section flex items-center gap-3 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
        <AlertCircle size={16} className="text-[var(--color-warning)]" />
        <span>{l.noStatistics}</span>
        <button
          onClick={() => calculate.mutate()}
          disabled={calculate.isPending}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-input)] bg-[rgba(255,255,255,0.06)] text-[length:var(--text-sm)] font-medium text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.1)] hover:text-[var(--color-text)] transition-all"
        >
          <RefreshCw
            size={13}
            className={calculate.isPending ? "animate-spin" : ""}
          />
          {l.calculate}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4">
      {/* Cards */}
      <div className="flex-1 grid grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="panel-section animate-pulse h-[88px]" />
            ))
          : cards.map((card) => (
              <div
                key={card.label}
                className="panel-section flex items-start gap-3 group"
                style={{ animation: "scale-fade-in 0.3s var(--ease-out) both" }}
              >
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-[var(--radius-input)] shrink-0 transition-transform duration-[var(--duration-normal)] group-hover:scale-110"
                  style={{ background: card.bgColor }}
                >
                  <card.icon size={18} style={{ color: card.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)] uppercase tracking-[var(--tracking-wide)]">
                    {card.label}
                  </p>
                  <p
                    className="text-[length:var(--text-2xl)] font-semibold tracking-[var(--tracking-tight)] leading-[var(--leading-tight)] mt-0.5"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {card.value}
                  </p>
                </div>
              </div>
            ))}
      </div>

      {/* Refresh button */}
      {!isLoading && (
        <button
          onClick={() => calculate.mutate()}
          disabled={calculate.isPending}
          title={l.recalculate}
          className="mt-1 flex items-center justify-center w-9 h-9 rounded-[var(--radius-input)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[var(--color-text-muted)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--color-text)] transition-all shrink-0"
        >
          <RefreshCw
            size={14}
            className={calculate.isPending ? "animate-spin" : ""}
          />
        </button>
      )}
    </div>
  );
}
