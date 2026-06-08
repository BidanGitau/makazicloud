"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Edit2,
  Trash2,
  Shield,
  Loader2,
  UserPlus,
  Search,
} from "lucide-react";
import { Users as UsersRepo, Roles } from "@/app/api/core/core";
import { showToast } from "@/app/_components/CustomToast";
import InviteModal from "./InviteModal";
import EditRoleModal from "./EditRoleModal";

const ROLE_BADGE_TONES = {
  Owner: "border-blue-900 bg-blue-50 text-blue-900",
  Admin: "border-blue-700 bg-blue-50 text-blue-700",
  Manager: "border-stone-300 bg-stone-50 text-black/70",
  Assistant: "border-stone-300 bg-stone-50 text-black/70",
  Viewer: "border-stone-300 bg-stone-50 text-black/55",
};

const isOwnerMember = (member) => member?.role === "OWNER";
const displayRoleName = (member) =>
  isOwnerMember(member) ? "Owner" : member?.roles?.name;

export default function TeamMembers({
  canInviteUsers = false,
  canEditUsers = false,
  canRemoveUsers = false,
}) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [showInviteModal, setShowInviteModal] = useState(false);

  const [editingMember, setEditingMember] = useState(null);
  const [editRoleId, setEditRoleId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        UsersRepo.getAllWithRoles(),
        Roles.getAll(),
      ]);
      setTeamMembers(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (err) {
      showToast.error(err?.message || "Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const safeRoles = Array.isArray(roles) ? roles : [];
  const hasActions = canEditUsers || canRemoveUsers;

  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (Array.isArray(teamMembers) ? teamMembers : []).filter((m) => {
      if (!q) return true;
      return (
        (m?.full_name || "").toLowerCase().includes(q) ||
        (m?.email || "").toLowerCase().includes(q)
      );
    });
  }, [searchTerm, teamMembers]);

  const hasPendingInvites = filteredMembers.some(
    (member) => member.invite_pending,
  );

  const handleInvite = async ({ email, fullName, roleId }) => {
    try {
      await UsersRepo.invite({ email, fullName, roleId });
      showToast.success(`Invite sent to ${email}.`);
      setShowInviteModal(false);
      await loadData();
    } catch (err) {
      showToast.error(err.message || "Failed to create invitation");
      throw err;
    }
  };

  const handleRevokeInvite = async (member) => {
    if (!member?.invitation_id) return;
    if (!confirm(`Revoke the pending invite for ${member.email}?`)) return;
    try {
      await UsersRepo.revokeInvitation(member.invitation_id);
      setTeamMembers((cur) => cur.filter((m) => m.id !== member.id));
      showToast.success(`Invite revoked for ${member.email}.`);
    } catch (err) {
      showToast.error(err.message || "Failed to revoke invitation");
    }
  };

  const handleUpdateRole = async () => {
    if (!editingMember || !editRoleId) return;
    setSaving(true);
    try {
      await UsersRepo.assignRole(editingMember.id, editRoleId);
      setTeamMembers((cur) =>
        cur.map((m) =>
          m.id === editingMember.id
            ? {
                ...m,
                role_id: editRoleId,
                roles: safeRoles.find((r) => r.id === editRoleId) || null,
              }
            : m,
        ),
      );
      showToast.success("Role updated successfully");
      setEditingMember(null);
      setEditRoleId("");
    } catch (err) {
      showToast.error(err.message || "Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (
      !confirm(
        "Remove this team member? They'll lose access to this organization.",
      )
    )
      return;
    try {
      await UsersRepo.remove(memberId);
      setTeamMembers((cur) => cur.filter((m) => m.id !== memberId));
      showToast.success("Team member removed");
    } catch (err) {
      showToast.error(err.message || "Failed to remove team member");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2
          className="h-6 w-6 animate-spin text-blue-700"
          strokeWidth={1.8}
        />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">— Team —</p>
          <h2
            className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Team Members
          </h2>
          <p className="mt-1 text-sm text-black/55">
            Manage who has access and what they can do.
          </p>
        </div>
        {canInviteUsers && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-blue-700 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.8} />
            Invite Member
          </button>
        )}
      </header>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40"
          strokeWidth={1.8}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        />
      </div>

      <div className="space-y-3 md:hidden">
        {filteredMembers.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            canEditUsers={canEditUsers}
            canRemoveUsers={canRemoveUsers}
            onRevoke={() => handleRevokeInvite(member)}
            onEdit={() => {
              setEditingMember(member);
              setEditRoleId(member.role_id || "");
            }}
            onRemove={() => handleRemoveMember(member.id)}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto border border-stone-200 md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <Th>Member</Th>
              <Th>Role</Th>
              {hasPendingInvites && <Th>Invite Link</Th>}
              <Th>Joined</Th>
              {hasActions && <Th className="text-right">Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => (
              <tr
                key={member.id}
                className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50/60"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar member={member} />
                    <div>
                      <p className="text-sm font-bold text-black">
                        {member.full_name || "Unnamed user"}
                      </p>
                      <p className="text-xs text-black/55">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <RoleBadge name={displayRoleName(member)} />
                  {member.invite_pending && (
                    <span className="ml-2 inline-block border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                      Pending
                    </span>
                  )}
                </td>
                {hasPendingInvites && (
                  <td className="max-w-[260px] px-5 py-4">
                    {member.invite_pending && member.invite_link ? (
                      <span
                        className="block truncate text-xs text-blue-700"
                        title={member.invite_link}
                      >
                        {member.invite_link}
                      </span>
                    ) : null}
                  </td>
                )}
                <td className="px-5 py-4 text-sm text-black/55">
                  {member.invite_pending
                    ? "Invite sent"
                    : member.created_at
                      ? new Date(member.created_at).toLocaleDateString()
                      : "—"}
                </td>
                {hasActions && (
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {canEditUsers &&
                        !member.invite_pending &&
                        !isOwnerMember(member) && (
                        <button
                          onClick={() => {
                            setEditingMember(member);
                            setEditRoleId(member.role_id || "");
                          }}
                          className="p-2 text-black/55 transition-colors hover:bg-blue-50 hover:text-blue-700"
                          title="Edit role"
                        >
                          <Edit2 className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                      )}
                      {canRemoveUsers && member.invite_pending && (
                        <button
                          onClick={() => handleRevokeInvite(member)}
                          className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-red-600 transition-colors hover:bg-red-50"
                          title="Revoke invite"
                        >
                          Revoke
                        </button>
                      )}
                      {canRemoveUsers &&
                        !member.invite_pending &&
                        !isOwnerMember(member) && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-black/55 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMembers.length === 0 && (
          <EmptyState searching={!!searchTerm} />
        )}
      </div>

      {filteredMembers.length === 0 && (
        <div className="md:hidden">
          <EmptyState searching={!!searchTerm} />
        </div>
      )}

      {showInviteModal && (
        <InviteModal
          roles={safeRoles}
          onClose={() => setShowInviteModal(false)}
          onSubmit={handleInvite}
        />
      )}

      {editingMember && (
        <EditRoleModal
          editingMember={editingMember}
          roles={safeRoles}
          editRoleId={editRoleId}
          setEditRoleId={setEditRoleId}
          saving={saving}
          onClose={() => {
            setEditingMember(null);
            setEditRoleId("");
          }}
          onSave={handleUpdateRole}
        />
      )}
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      className={`px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.22em] text-black/55 ${className}`}
    >
      {children}
    </th>
  );
}

function Avatar({ member }) {
  const initial =
    member.full_name?.[0]?.toUpperCase() ||
    member.email?.[0]?.toUpperCase() ||
    "U";
  return (
    <div
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center bg-blue-700 text-base font-black text-white"
      style={{ fontFamily: "var(--font-display)" }}
    >
      {initial}
    </div>
  );
}

function RoleBadge({ name }) {
  const tone =
    ROLE_BADGE_TONES[name] || "border-stone-300 bg-stone-50 text-black/55";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${tone}`}
    >
      <Shield className="h-3 w-3" strokeWidth={1.8} />
      {name || "No role"}
    </span>
  );
}

function MemberCard({
  member,
  canEditUsers,
  canRemoveUsers,
  onRevoke,
  onEdit,
  onRemove,
}) {
  return (
    <div className="border border-stone-200 p-4">
      <div className="flex items-start gap-3">
        <Avatar member={member} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-black">
            {member.full_name || "Unnamed user"}
          </p>
          <p className="break-all text-sm text-black/55">{member.email}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <RoleBadge name={displayRoleName(member)} />
        {member.invite_pending && (
          <span className="border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
            Pending
          </span>
        )}
      </div>

      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">
        {member.invite_pending
          ? "Invite sent"
          : member.created_at
            ? `Joined ${new Date(member.created_at).toLocaleDateString()}`
            : "Join date unavailable"}
      </p>

      {member.invite_pending && member.invite_link && (
        <p
          className="mt-2 truncate text-xs text-blue-700"
          title={member.invite_link}
        >
          {member.invite_link}
        </p>
      )}

      {(canEditUsers || canRemoveUsers) && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {canEditUsers && !member.invite_pending && !isOwnerMember(member) && (
            <button
              onClick={onEdit}
              className="inline-flex w-full items-center justify-center gap-2 border border-blue-700 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 transition-colors hover:bg-blue-50"
            >
              <Edit2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              Edit Role
            </button>
          )}
          {canRemoveUsers && member.invite_pending && (
            <button
              onClick={onRevoke}
              className="inline-flex w-full items-center justify-center gap-2 border border-red-300 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              Revoke
            </button>
          )}
          {canRemoveUsers &&
            !member.invite_pending &&
            !isOwnerMember(member) && (
            <button
              onClick={onRemove}
              className="inline-flex w-full items-center justify-center gap-2 border border-red-300 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ searching }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <Users className="mb-4 h-10 w-10 text-black/20" strokeWidth={1.5} />
      <p className="text-sm text-black/55">
        {searching
          ? "No team members match your search."
          : "No team members yet. Invite someone to get started."}
      </p>
    </div>
  );
}
