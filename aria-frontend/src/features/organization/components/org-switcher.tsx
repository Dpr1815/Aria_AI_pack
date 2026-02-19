/* ─────────────────────────────────────────────────────────
 * OrgSwitcher — dropdown section embedded in UserMenu
 *
 * Lets the user switch between personal mode and any
 * organization they belong to. Persists selection to
 * localStorage via useOrgStore.
 * ───────────────────────────────────────────────────────── */

import { Link } from "@tanstack/react-router";
import { User, Settings, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLabels } from "@/i18n";
import { cn } from "@/utils";
import { useMyOrganizations } from "../hooks";
import { useOrgStore } from "../stores/organization.store";
import type { Organization, OrgRole } from "../types";
import { useAuthStore } from "@/features/auth";

function OrgLogo({ org, size = 20 }: { org: { name: string; logoUrl?: string }; size?: number }) {
  if (org.logoUrl) {
    return (
      <img
        src={org.logoUrl}
        alt={org.name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
        }}
      />
    );
  }

  const initials = org.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-primary/20 text-primary font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}

function getUserRoleInOrg(org: Organization, userId: string): OrgRole {
  const member = org.members.find((m) => m.userId === userId);
  return member?.role ?? "role_read";
}

export function OrgSwitcher() {
  const { organization: l } = useLabels();
  const { data: orgs, isLoading } = useMyOrganizations();
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);
  const clearActiveOrg = useOrgStore((s) => s.clearActiveOrg);
  const userId = useAuthStore((s) => s.user?._id);
  const qc = useQueryClient();

  function handleSwitchToOrg(org: Organization) {
    if (!userId) return;
    setActiveOrg({
      _id: org._id,
      name: org.name,
      logoUrl: org.logoUrl,
      role: getUserRoleInOrg(org, userId),
    });
    // Invalidate all queries so they refetch with the new X-Organization-ID header
    qc.invalidateQueries();
  }

  function handleSwitchToPersonal() {
    clearActiveOrg();
    qc.invalidateQueries();
  }

  if (isLoading || !orgs?.length) return null;

  return (
    <div className="flex flex-col gap-0.5">
      <p
        className="px-3 pt-2 pb-1 text-text-muted font-medium"
        style={{ fontSize: "var(--pt-xxs, 0.65rem)" }}
      >
        {l.switcher.organizations}
      </p>

      {/* Personal mode option */}
      <button
        type="button"
        onClick={handleSwitchToPersonal}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-button px-3 py-2",
          "text-text-secondary transition-colors",
          "hover:bg-surface hover:text-text",
          !activeOrg && "bg-surface/60 text-text",
        )}
        style={{ fontSize: "var(--pt-sm)" }}
      >
        <User size={15} />
        <span className="flex-1 truncate text-left">{l.switcher.personalMode}</span>
        {!activeOrg && <Check size={14} className="text-primary" />}
      </button>

      {/* Organization options */}
      {orgs.map((org) => {
        const isActive = activeOrg?._id === org._id;
        return (
          <button
            key={org._id}
            type="button"
            onClick={() => handleSwitchToOrg(org)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-button px-3 py-2",
              "text-text-secondary transition-colors",
              "hover:bg-surface hover:text-text",
              isActive && "bg-surface/60 text-text",
            )}
            style={{ fontSize: "var(--pt-sm)" }}
          >
            <OrgLogo org={org} size={18} />
            <span className="flex-1 truncate text-left">{org.name}</span>
            {isActive && <Check size={14} className="text-primary" />}
          </button>
        );
      })}

      {/* Manage link */}
      <Link
        to="/organization"
        className={cn(
          "flex w-full items-center gap-2.5 rounded-button px-3 py-2",
          "text-text-secondary transition-colors",
          "hover:bg-surface hover:text-text",
        )}
        style={{ fontSize: "var(--pt-sm)" }}
      >
        <Settings size={15} />
        <span className="flex-1 truncate text-left">{l.page.title}</span>
      </Link>
    </div>
  );
}
