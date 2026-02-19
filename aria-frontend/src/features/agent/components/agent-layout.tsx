import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Settings, BarChart3, ExternalLink, Play } from "lucide-react";
import { cn } from "@/utils";
import { useLabels } from "@/i18n";
import type { Agent } from "../types";

interface AgentLayoutProps {
  agent: Agent;
  agentId: string;
}

export function AgentLayout({ agent, agentId }: AgentLayoutProps) {
  const { agent: l } = useLabels();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    {
      to: "/agents/$agentId/config" as const,
      label: l.tabs.configuration,
      icon: Settings,
    },
    {
      to: "/agents/$agentId/analytics" as const,
      label: l.tabs.analytics,
      icon: BarChart3,
    },
  ] as const;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center gap-4 border-b border-border px-[var(--spacing-page-x)] py-2.5">
        <Link
          to="/agents"
          className="rounded-button p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text"
          aria-label={l.tabs.backToAgents}
        >
          <ArrowLeft size={18} />
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-semibold text-text">
            {agent.label}
          </h1>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1.5">
          {tabs.map((tab) => {
            const isActive = pathname.endsWith(tab.to.split("/").pop()!);

            return (
              <Link
                key={tab.to}
                to={tab.to}
                params={{ agentId }}
                className={cn(
                  "flex items-center gap-2 rounded-button px-4 py-2",
                  "font-medium transition-colors",
                  isActive
                    ? "bg-primary-light text-primary"
                    : "text-text-secondary hover:bg-surface hover:text-text",
                )}
                style={{ fontSize: "var(--pt-base)" }}
              >
                <tab.icon size={16} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-1.5 h-5 w-px bg-border" />

        <a
          href={`/room/${agentId}?mode=test`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-button bg-primary-light px-3 py-2 font-medium text-primary transition-colors hover:bg-primary/20"
          style={{ fontSize: "var(--pt-base)" }}
        >
          <Play size={15} />
          {l.tabs.testConversation}
        </a>

        <a
          href={`/room/${agentId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-button px-3 py-2 font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text"
          style={{ fontSize: "var(--pt-base)" }}
        >
          <ExternalLink size={15} />
          {l.tabs.openRoom}
        </a>
      </div>

      {/* ── Route outlet ── */}
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
