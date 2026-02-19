/* ─────────────────────────────────────────────────────────
 * AgentsPage — grid of all agents for the current user
 * ───────────────────────────────────────────────────────── */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Layers,
  Globe,
  Activity,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLabels } from "@/i18n";
import { useAgents } from "../hooks";
import type { Agent } from "../types";

/* deterministic gradient per agent based on label */
const GRADIENTS = [
  "linear-gradient(135deg, #f97316, #fb923c)",
  "linear-gradient(135deg, #8b5cf6, #a78bfa)",
  "linear-gradient(135deg, #38bdf8, #7dd3fc)",
  "linear-gradient(135deg, #f43f5e, #fb7185)",
  "linear-gradient(135deg, #10b981, #6ee7b7)",
  "linear-gradient(135deg, #f59e0b, #fcd34d)",
] as const;

function pickGradient(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++)
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function AgentCard({
  agent,
  index,
  stepLabel,
  stepsLabel,
}: {
  agent: Agent;
  index: number;
  stepLabel: string;
  stepsLabel: string;
}) {
  const stepCount = agent.stepOrder?.length ?? 0;
  const isActive = agent.status === "active";
  const initials = agent.label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Link
      to="/agents/$agentId/config"
      params={{ agentId: agent._id }}
      className="ag-card"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Accent stripe */}
      <div
        className="ag-card-stripe"
        style={{ background: pickGradient(agent.label) }}
      />

      {/* Hover glow */}
      <div className="ag-card-glow" />

      {/* Top row: monogram + status */}
      <div className="ag-card-head">
        <div
          className="ag-card-avatar"
          style={{ background: pickGradient(agent.label) }}
        >
          {initials}
        </div>

        <span
          className={`ag-status ${isActive ? "ag-status--on" : "ag-status--off"}`}
        >
          <span className={`ag-status-dot ${isActive ? "ag-status-dot--on" : ""}`} />
          {agent.status}
        </span>
      </div>

      {/* Name */}
      <p className="ag-card-name">{agent.label}</p>

      {/* Meta row */}
      <div className="ag-card-meta">
        <span className="ag-card-chip">
          <Layers size={12} />
          {stepCount} {stepCount === 1 ? stepLabel : stepsLabel}
        </span>
        <span className="ag-card-chip">
          <Globe size={12} />
          {agent.voice.languageCode}
        </span>

        <span className="ag-card-go">
          <ArrowUpRight size={14} />
        </span>
      </div>
    </Link>
  );
}

function GridSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="ag-skel"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <div className="ag-skel-shimmer" />
        </div>
      ))}
    </>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="ag-empty">
      <div className="ag-empty-orb" />
      <div className="ag-empty-ring">
        <span className="ag-empty-plus">+</span>
      </div>
      <div className="ag-empty-text">
        <p className="ag-empty-title">{title}</p>
        <p className="ag-empty-sub">{description}</p>
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 20;

function Pagination({
  page,
  totalPages,
  onPage,
  previousLabel,
  nextLabel,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  previousLabel: string;
  nextLabel: string;
}) {
  if (totalPages <= 1) return null;

  /* Build visible page numbers: always show first, last, current ± 1 */
  const pages: (number | "ellipsis")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis");
    }
  }

  return (
    <nav className="ag-pagination">
      <button
        className="ag-pg-btn"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label={previousLabel}
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e${i}`} className="ag-pg-ellipsis">
            ...
          </span>
        ) : (
          <button
            key={p}
            className={`ag-pg-num ${p === page ? "ag-pg-num--active" : ""}`}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        ),
      )}

      <button
        className="ag-pg-btn"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label={nextLabel}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}

export function AgentsPage() {
  const { agent: l } = useLabels();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAgents(page, ITEMS_PER_PAGE);

  const agents = data?.data;
  const meta = data?.meta;
  const activeCount = agents?.filter((a) => a.status === "active").length ?? 0;
  const total = meta?.total ?? 0;

  return (
    <div className="ag-page">
      {/* ── Hero ── */}
      <header className="ag-hero">
        <div className="ag-hero-orb" />
        <div className="ag-hero-inner">
          <div className="ag-hero-left">
            <h1 className="ag-hero-title">{l.page.title}</h1>
            <p className="ag-hero-sub">{l.page.subtitle}</p>
          </div>

          {!isLoading && total > 0 && (
            <div className="ag-kpi-row">
              <div className="ag-kpi">
                <span className="ag-kpi-val">{total}</span>
                <span className="ag-kpi-label">{l.page.total}</span>
              </div>
              <div className="ag-kpi-sep" />
              <div className="ag-kpi">
                <span className="ag-kpi-val ag-kpi-val--on">
                  <Activity size={14} />
                  {activeCount}
                </span>
                <span className="ag-kpi-label">{l.page.active}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Grid ── */}
      <section className="ag-grid">
        {isLoading ? (
          <GridSkeleton />
        ) : agents?.length ? (
          agents.map((agent, i) => (
            <AgentCard
              key={agent._id}
              agent={agent}
              index={i}
              stepLabel={l.page.step}
              stepsLabel={l.page.steps}
            />
          ))
        ) : null}
      </section>

      {!isLoading && !agents?.length && (
        <EmptyState title={l.empty.title} description={l.empty.description} />
      )}

      {/* ── Pagination ── */}
      {meta && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          onPage={setPage}
          previousLabel={l.page.previousPage}
          nextLabel={l.page.nextPage}
        />
      )}
    </div>
  );
}
