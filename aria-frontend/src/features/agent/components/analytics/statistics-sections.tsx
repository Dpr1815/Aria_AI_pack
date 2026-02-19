/* ─────────────────────────────────────────────────────────
 * StatisticsSections — dynamic, visually rich rendering
 * of the statistics `data.sections` object.
 *
 * Fully dynamic: loops sections by key, detects value
 * types (number, object, array, string) and picks the
 * best visual representation for each.
 *
 * Design: card grid with gradient headers, radial gauges
 * for averageScore, score bars, mini stat grids, and
 * tag chips for arrays.
 * ───────────────────────────────────────────────────────── */

import { useState } from "react";
import { useStatistics } from "../../hooks/use-analytics";
import { BarChart3, ChevronDown } from "lucide-react";

interface Props {
  agentId: string;
}

export function StatisticsSections({ agentId }: Props) {
  const { data: stats, isLoading } = useStatistics(agentId);
  const [open, setOpen] = useState(false);

  const sections =
    stats?.data && isPlainObject(stats.data)
      ? ((stats.data as Record<string, unknown>).sections as
          | Record<string, unknown>
          | undefined)
      : undefined;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel-section animate-pulse h-56" />
        ))}
      </div>
    );
  }

  if (!sections || !isPlainObject(sections)) return null;

  const sectionEntries = Object.entries(sections).filter(
    ([, v]) => isPlainObject(v),
  );

  if (sectionEntries.length === 0) return null;

  return (
    <div className="flex flex-col">
      {/* Accordion trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 py-2 group text-left"
      >
        <BarChart3 size={16} className="text-[var(--color-primary)]" />
        <h3
          className="text-[length:var(--text-base)] font-semibold tracking-[var(--tracking-tight)] text-[var(--color-text)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Detailed Analytics
        </h3>
        <ChevronDown
          size={16}
          className={`ml-auto text-[var(--color-text-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Collapsible content */}
      {open && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3"
          style={{ animation: "fade-in 0.2s var(--ease-out) both" }}
        >
          {sectionEntries.map(([key, value], i) => (
            <SectionCard
              key={key}
              title={key}
              data={value as Record<string, unknown>}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Section Card ─────────────────────────────────────────── */

const SECTION_COLORS = [
  { gradient: "from-[rgba(56,189,248,0.15)] to-transparent", accent: "#38bdf8" },
  { gradient: "from-[rgba(249,115,22,0.15)] to-transparent", accent: "#f97316" },
  { gradient: "from-[rgba(74,222,128,0.15)] to-transparent", accent: "#4ade80" },
  { gradient: "from-[rgba(168,85,247,0.15)] to-transparent", accent: "#a855f7" },
  { gradient: "from-[rgba(251,191,36,0.15)] to-transparent", accent: "#fbbf24" },
  { gradient: "from-[rgba(236,72,153,0.15)] to-transparent", accent: "#ec4899" },
];

function SectionCard({
  title,
  data,
  index,
}: {
  title: string;
  data: Record<string, unknown>;
  index: number;
}) {
  const color = SECTION_COLORS[index % SECTION_COLORS.length]!;
  const entries = Object.entries(data);

  /* Pull out averageScore for the hero gauge, handle all others below */
  const avgScoreEntry = entries.find(([k]) => k === "averageScore");
  const avgScore =
    avgScoreEntry && typeof avgScoreEntry[1] === "number"
      ? avgScoreEntry[1]
      : null;
  const otherEntries = entries.filter(([k]) => k !== "averageScore");

  return (
    <div
      className="panel-section !p-0 overflow-hidden"
      style={{
        animation: `scale-fade-in 0.3s var(--ease-out) ${index * 80}ms both`,
      }}
    >
      {/* Header with gradient */}
      <div
        className={`relative px-5 py-4 bg-gradient-to-r ${color.gradient} border-b border-[rgba(255,255,255,0.04)]`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: color.accent }}
            />
            <h4
              className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)] capitalize tracking-[var(--tracking-tight)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {formatKey(title)}
            </h4>
          </div>

          {/* Hero gauge for averageScore */}
          {avgScore !== null && (
            <RadialGauge value={avgScore} max={10} accent={color.accent} />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex flex-col gap-3.5">
        {otherEntries.map(([key, value], i) => (
          <DynamicField
            key={key}
            label={key}
            value={value}
            accent={color.accent}
            index={i}
          />
        ))}
        {otherEntries.length === 0 && avgScore !== null && (
          <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] italic">
            Average score: {avgScore}/10
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Radial Gauge ─────────────────────────────────────────── */

function RadialGauge({
  value,
  max,
  accent,
}: {
  value: number;
  max: number;
  accent: string;
}) {
  const pct = Math.min(1, value / max);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <svg
        viewBox="0 0 52 52"
        className="w-full h-full -rotate-90"
        style={{ filter: `drop-shadow(0 0 6px ${accent}30)` }}
      >
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="4"
        />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
          style={{
            animation: "gauge-fill 0.8s var(--ease-out) both",
          }}
        />
      </svg>
      <span
        className="absolute text-[length:var(--text-sm)] font-bold tabular-nums"
        style={{ color: accent }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Dynamic Field Renderer ───────────────────────────────── */

function DynamicField({
  label,
  value,
  accent,
  index,
}: {
  label: string;
  value: unknown;
  accent: string;
  index: number;
}) {
  return (
    <div
      style={{
        animation: `fade-in 0.2s var(--ease-out) ${index * 30}ms both`,
      }}
    >
      <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-[var(--tracking-wide)] text-[var(--color-text-secondary)] mb-1.5">
        {formatKey(label)}
      </p>
      <DynamicValue value={value} accent={accent} />
    </div>
  );
}

function DynamicValue({
  value,
  accent,
}: {
  value: unknown;
  accent: string;
}) {
  /* null / undefined */
  if (value == null) {
    return (
      <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] italic">
        —
      </span>
    );
  }

  /* Number → score bar */
  if (typeof value === "number") {
    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      const max = value <= 10 ? 10 : 100;
      return <HorizontalBar value={value} max={max} accent={accent} />;
    }
    return (
      <span className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)] tabular-nums">
        {value}
      </span>
    );
  }

  /* String */
  if (typeof value === "string") {
    if (value.length === 0) {
      return (
        <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] italic">
          —
        </span>
      );
    }
    return (
      <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
        {value}
      </p>
    );
  }

  /* Boolean */
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

  /* Array → chips or nested list */
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] italic">
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
              className="inline-block px-2.5 py-1 rounded-full text-[length:var(--text-xs)] font-medium border"
              style={{
                borderColor: `${accent}25`,
                background: `${accent}10`,
                color: accent,
              }}
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
            <DynamicValue value={item} accent={accent} />
          </div>
        ))}
      </div>
    );
  }

  /* Object → mini stat grid if all numeric, else nested fields */
  if (isPlainObject(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    const isAllNumeric =
      entries.length > 0 && entries.every(([, v]) => typeof v === "number");

    if (isAllNumeric) {
      return <MiniStatGrid entries={entries as [string, number][]} />;
    }

    return (
      <div className="rounded-[var(--radius-input)] bg-[rgba(255,255,255,0.015)] border border-[rgba(255,255,255,0.05)] px-3.5 py-3 flex flex-col gap-2.5">
        {entries.map(([k, v]) => (
          <DynamicField key={k} label={k} value={v} accent={accent} index={0} />
        ))}
      </div>
    );
  }

  /* Fallback */
  return (
    <pre className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)] font-mono bg-[rgba(255,255,255,0.02)] rounded-md p-2 overflow-x-auto">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

/* ── Horizontal Bar ───────────────────────────────────────── */

function HorizontalBar({
  value,
  max,
  accent,
}: {
  value: number;
  max: number;
  accent: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-[7px] rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accent}, ${accent}99)`,
            boxShadow: `0 0 8px ${accent}40`,
            animation: "score-fill 0.6s var(--ease-out) both",
          }}
        />
      </div>
      <span className="text-[length:var(--text-xs)] font-semibold text-[var(--color-text)] tabular-nums shrink-0 min-w-[38px] text-right">
        {value}
        <span className="text-[var(--color-text-muted)] font-normal">
          /{max}
        </span>
      </span>
    </div>
  );
}

/* ── Mini Stat Grid (for all-numeric objects like scoreDistribution) ── */

function MiniStatGrid({ entries }: { entries: [string, number][] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-input)] bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.04)]"
        >
          <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] capitalize">
            {formatKey(key)}
          </span>
          <span className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)] tabular-nums">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .trim();
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
