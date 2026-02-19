/* ─────────────────────────────────────────────────────────
 * OrgDetailPage — organization management page
 * ───────────────────────────────────────────────────────── */

import { useState } from "react";
import { Building2, Plus, Pencil, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLabels } from "@/i18n";
import { useAuth } from "@/features/auth";
import { useMyOrganizations, useOrganization, useOrganizationMutations } from "../hooks";
import { useOrgStore } from "../stores/organization.store";
import { OrgFormModal } from "./org-form-modal";
import { MemberList } from "./member-list";
import type { Organization } from "../types";

/* ── Empty state ───────────────────────────────────────── */

function EmptyState({
  onCreateClick,
  labels,
}: {
  onCreateClick: () => void;
  labels: { title: string; description: string; createOrg: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Building2 size={36} className="text-primary" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-text">{labels.title}</p>
        <p className="mt-1 text-sm text-text-muted">{labels.description}</p>
      </div>
      <Button onClick={onCreateClick} className="gap-2">
        <Plus size={16} />
        {labels.createOrg}
      </Button>
    </div>
  );
}

/* ── Org logo display ──────────────────────────────────── */

function OrgLogo({ org }: { org: Organization }) {
  if (!org.logoUrl) {
    const initials = org.name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

    return (
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 font-display text-xl font-bold text-primary">
        {initials}
      </span>
    );
  }

  return (
    <img
      src={org.logoUrl}
      alt={org.name}
      className="h-16 w-16 rounded-full object-cover border border-border"
    />
  );
}

/* ── Org detail card ───────────────────────────────────── */

function OrgCard({
  org,
  isAdmin,
  onEdit,
  onLeave,
  leavePending,
  userId,
}: {
  org: Organization;
  isAdmin: boolean;
  onEdit: () => void;
  onLeave: () => void;
  leavePending: boolean;
  userId: string;
}) {
  const { organization: l } = useLabels();

  return (
    <div className="flex flex-col gap-8">
      {/* Header card */}
      <div className="flex items-center gap-6 rounded-card border border-border bg-surface p-6">
        <OrgLogo org={org} />
        <div className="flex-1">
          <h2 className="font-display text-xl font-semibold text-text">{org.name}</h2>
          <p className="mt-1 text-sm text-text-muted">
            {org.members.length} {org.members.length === 1 ? "member" : "members"}
          </p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
            <Pencil size={14} />
            {l.form.editTitle}
          </Button>
        )}
      </div>

      {/* Members */}
      <MemberList
        orgId={org._id}
        members={org.members}
        currentUserId={userId}
        isAdmin={isAdmin}
      />

      {/* Actions */}
      <div className="flex items-center justify-end border-t border-border pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLeave}
          disabled={leavePending}
          className="gap-1.5 text-error hover:bg-error/10 hover:text-error"
        >
          <LogOut size={14} />
          {l.actions.leaveOrg}
        </Button>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────── */

export function OrgDetailPage() {
  const { organization: l } = useLabels();
  const { user } = useAuth();
  const { data: orgs, isLoading: orgsLoading } = useMyOrganizations();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // Use the first org the user belongs to for display
  const selectedOrg = orgs?.[0];
  const orgId = selectedOrg?._id;

  const { data: fullOrg, isLoading: orgLoading } = useOrganization(orgId ?? "");
  const { createOrg, updateOrg, leaveOrg } = useOrganizationMutations(orgId);
  const clearActiveOrg = useOrgStore((s) => s.clearActiveOrg);

  const org = fullOrg ?? selectedOrg;
  const isAdmin = org?.members.some(
    (m) => m.userId === user?._id && m.role === "role_admin",
  );
  const isCreator = org?.creatorId === user?._id;

  function handleLeave() {
    if (!window.confirm(l.actions.leaveOrgConfirm)) return;
    leaveOrg.mutate(undefined, {
      onSuccess: () => clearActiveOrg(),
    });
  }

  if (orgsLoading || orgLoading) {
    return (
      <div className="px-[var(--spacing-page-x)] py-[var(--spacing-page-y)]">
        <div className="h-8 w-48 animate-pulse rounded bg-surface" />
        <div className="mt-4 h-32 animate-pulse rounded-card bg-surface" />
      </div>
    );
  }

  return (
    <div className="px-[var(--spacing-page-x)] py-[var(--spacing-page-y)]">
      {/* Hero */}
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-text">{l.page.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{l.page.subtitle}</p>
      </header>

      {/* Content */}
      {!org ? (
        <>
          <EmptyState
            onCreateClick={() => setShowCreateModal(true)}
            labels={{
              title: l.page.noOrganizations,
              description: l.page.noOrganizationsDescription,
              createOrg: l.page.createOrg,
            }}
          />
          {/* Also show create button at top for non-empty case */}
        </>
      ) : (
        <OrgCard
          org={org}
          isAdmin={isAdmin || isCreator || false}
          onEdit={() => setEditingOrg(org)}
          onLeave={handleLeave}
          leavePending={leaveOrg.isPending}
          userId={user?._id ?? ""}
        />
      )}

      {/* Floating create button when user has an org but might want another */}
      {org && (isAdmin || isCreator) && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-1.5"
          >
            <Plus size={14} />
            {l.page.createOrg}
          </Button>
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <OrgFormModal
          isPending={createOrg.isPending}
          error={createOrg.error?.message}
          onSubmit={(data) => {
            createOrg.mutate(data, {
              onSuccess: () => setShowCreateModal(false),
            });
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit modal */}
      {editingOrg && (
        <OrgFormModal
          organization={editingOrg}
          isPending={updateOrg.isPending}
          error={updateOrg.error?.message}
          onSubmit={(data) => {
            updateOrg.mutate(data, {
              onSuccess: () => setEditingOrg(null),
            });
          }}
          onClose={() => setEditingOrg(null)}
        />
      )}
    </div>
  );
}
