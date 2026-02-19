import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLabels } from "@/i18n";
import { useAuth } from "@/features/auth";
import { useOrgStore } from "@/features/organization/stores/organization.store";
import { OrgSwitcher } from "@/features/organization/components/org-switcher";
import { cn } from "@/utils";

export function Header() {
  const { layout: l, auth: a } = useLabels();
  const { user, isAuthenticated, openModal, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface-raised/80 backdrop-blur-sm">
      <div className="flex h-[var(--header-height)] items-center justify-between px-[var(--spacing-page-x)]">
        <Link
          to="/"
          className="flex items-center gap-2 font-display font-semibold tracking-tight"
          style={{ fontSize: "var(--pt-lg)" }}
        >
          {l.header.project}
        </Link>

        <div className="flex items-center gap-[clamp(1rem,2vw,2rem)]">
          <nav className="flex items-center gap-[clamp(0.75rem,1.5vw,1.5rem)]">
            <Link
              to="/"
              className="text-text-secondary transition-colors hover:text-text [&.active]:text-primary [&.active]:font-medium"
              style={{ fontSize: "var(--pt-base)" }}
            >
              {l.nav.home}
            </Link>
            <Link
              to="/agents"
              activeOptions={{ exact: true }}
              className="text-text-secondary transition-colors hover:text-text [&.active]:text-primary [&.active]:font-medium"
              style={{ fontSize: "var(--pt-base)" }}
            >
              {l.nav.agents}
            </Link>

            {isAuthenticated && (
              <Link
                to="/organization"
                className="text-text-secondary transition-colors hover:text-text [&.active]:text-primary [&.active]:font-medium"
                style={{ fontSize: "var(--pt-base)" }}
              >
                {l.nav.organization}
              </Link>
            )}
          </nav>

          {isAuthenticated && (
            <Link
              to="/agents/generate"
              className="text-text-secondary transition-colors hover:text-text [&.active]:text-primary [&.active]:font-medium"
              style={{ fontSize: "var(--pt-base)" }}
            >
              {l.nav.createAgent}
            </Link>
          )}

          {isAuthenticated && user ? (
            <UserMenu
              user={user}
              onLogout={logout}
              labels={{ accountMenu: l.header.accountMenu, logout: a.logout }}
            />
          ) : (
            <Button size="sm" onClick={() => openModal("login")}>
              {a.login}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── User Menu (avatar + dropdown) ───────────────────────── */

interface UserMenuProps {
  user: { name: string; email: string };
  onLogout: () => void;
  labels: { accountMenu: string; logout: string };
}

function UserMenu({ user, onLogout, labels }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeOrg = useOrgStore((s) => s.activeOrg);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex items-center justify-center rounded-full overflow-hidden",
          "h-[clamp(2rem,2.2vw,2.75rem)] w-[clamp(2rem,2.2vw,2.75rem)]",
          !activeOrg?.logoUrl && "bg-primary font-semibold text-text-inverse",
          "transition-shadow hover:ring-2 hover:ring-primary-glow",
        )}
        style={{ fontSize: "var(--pt-xs)" }}
        aria-label={labels.accountMenu}
        aria-expanded={open}
      >
        {activeOrg?.logoUrl ? (
          <img
            src={activeOrg.logoUrl}
            alt={activeOrg.name}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2",
            "w-[clamp(14rem,15vw,18rem)]",
            "rounded-card border border-border bg-surface-overlay shadow-card",
            "animate-[scale-fade-in_150ms_ease-out]",
          )}
        >
          <div className="border-b border-border px-4 py-3">
            <p
              className="truncate font-medium text-text"
              style={{ fontSize: "var(--pt-base)" }}
            >
              {user.name}
            </p>
            <p
              className="truncate text-text-muted"
              style={{ fontSize: "var(--pt-xs)" }}
            >
              {user.email}
            </p>
          </div>

          {/* Organization switcher */}
          <div className="border-b border-border p-1.5">
            <OrgSwitcher />
          </div>

          <div className="p-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-button px-3 py-2",
                "text-text-secondary transition-colors",
                "hover:bg-surface hover:text-error",
              )}
              style={{ fontSize: "var(--pt-sm)" }}
            >
              <LogOut size={15} />
              {labels.logout}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
