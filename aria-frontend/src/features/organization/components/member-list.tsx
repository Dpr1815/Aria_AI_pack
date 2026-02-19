/* ─────────────────────────────────────────────────────────
 * MemberList — organization members table with inline actions
 * ───────────────────────────────────────────────────────── */

import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLabels } from "@/i18n";
import { cn } from "@/utils";
import type { OrganizationMember, OrgRole } from "../types";
import { useOrganizationMutations } from "../hooks";

/* ── Role badge ────────────────────────────────────────── */

const ROLE_STYLES: Record<OrgRole, string> = {
  role_admin: "bg-primary/15 text-primary",
  role_write: "bg-info/15 text-info",
  role_read: "bg-success/15 text-success",
};

function RoleBadge({ role }: { role: OrgRole }) {
  const { organization: l } = useLabels();
  const label = { role_admin: l.members.roleAdmin, role_write: l.members.roleWrite, role_read: l.members.roleRead }[role];
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", ROLE_STYLES[role])}>
      {label}
    </span>
  );
}

/* ── Add Member Form (inline) ──────────────────────────── */

function AddMemberForm({
  orgId,
  isPending,
}: {
  orgId: string;
  isPending: boolean;
}) {
  const { organization: l } = useLabels();
  const { addMember } = useOrganizationMutations(orgId);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("role_read");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  function validate(): boolean {
    const errors: Record<string, string | undefined> = {};
    if (!email.trim()) errors.email = l.validation.emailRequired;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errors.email = l.validation.emailInvalid;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setApiError(null);
    try {
      await addMember.mutateAsync({ email: email.trim(), role });
      setEmail("");
      setRole("role_read");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid items-end gap-3 pt-4 border-t border-border"
      style={{ gridTemplateColumns: "2fr 1fr auto" }}
    >
      <Input
        label={l.members.email}
        placeholder={l.members.emailPlaceholder}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setFieldErrors((p) => ({ ...p, email: undefined }));
          setApiError(null);
        }}
        error={fieldErrors.email || apiError || undefined}
      />

      <div className="flex flex-col gap-1.5">
        <label className="panel-field-label">{l.members.role}</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as OrgRole)}
          className={cn(
            "rounded-input border border-border bg-surface px-3 py-2.5",
            "text-sm text-text outline-none",
            "transition-[border-color,box-shadow] duration-200 ease-out",
            "focus:border-primary focus:ring-1 focus:ring-primary/40",
          )}
        >
          <option value="role_read">{l.members.roleRead}</option>
          <option value="role_write">{l.members.roleWrite}</option>
          <option value="role_admin">{l.members.roleAdmin}</option>
        </select>
      </div>

      <Button type="submit" size="sm" disabled={isPending || addMember.isPending} className="gap-1.5">
        <UserPlus size={14} />
        {l.members.addMember}
      </Button>
    </form>
  );
}

/* ── Main component ────────────────────────────────────── */

interface MemberListProps {
  orgId: string;
  members: OrganizationMember[];
  currentUserId: string;
  isAdmin: boolean;
}

export function MemberList({ orgId, members, currentUserId, isAdmin }: MemberListProps) {
  const { organization: l } = useLabels();
  const { removeMember, updateMemberRole } = useOrganizationMutations(orgId);

  function handleRoleChange(memberId: string, newRole: OrgRole) {
    updateMemberRole.mutate({ memberId, role: newRole });
  }

  function handleRemove(memberId: string) {
    if (window.confirm(l.members.removeMemberConfirm)) {
      removeMember.mutate(memberId);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-display text-base font-semibold text-text">{l.members.title}</h3>

      {members.length === 0 ? (
        <p className="text-sm text-text-muted">{l.members.noMembers}</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-text-secondary">
                <th className="px-4 py-2.5 font-medium">{l.members.email}</th>
                <th className="px-4 py-2.5 font-medium">{l.members.role}</th>
                <th className="px-4 py-2.5 font-medium">{l.members.addedAt}</th>
                {isAdmin && <th className="px-4 py-2.5 font-medium w-12" />}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isSelf = m.userId === currentUserId;
                return (
                  <tr key={m.userId} className="border-b border-border last:border-0 hover:bg-surface/50">
                    <td className="px-4 py-3 text-text">{m.email}</td>
                    <td className="px-4 py-3">
                      {isAdmin && !isSelf ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value as OrgRole)}
                          className={cn(
                            "rounded-input border border-border bg-surface px-2 py-1",
                            "text-xs text-text outline-none",
                            "focus:border-primary focus:ring-1 focus:ring-primary/40",
                          )}
                        >
                          <option value="role_read">{l.members.roleRead}</option>
                          <option value="role_write">{l.members.roleWrite}</option>
                          <option value="role_admin">{l.members.roleAdmin}</option>
                        </select>
                      ) : (
                        <RoleBadge role={m.role} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(m.addedAt).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => handleRemove(m.userId)}
                            className="rounded-button p-1.5 text-text-muted transition-colors hover:bg-error/10 hover:text-error"
                            aria-label={l.members.removeMember}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && (
        <AddMemberForm
          orgId={orgId}
          isPending={false}
        />
      )}
    </div>
  );
}
