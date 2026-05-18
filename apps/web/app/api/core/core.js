import { apiFetch } from "../../_lib/api/client";

// Users (org memberships) — backed by GET /users which joins user +
// custom role + permissions on the server. No client-side N+1.
export const Users = {
  list: () => apiFetch("/users"),

  // Kept for back-compat with callers that used the old createCRUD shape.
  getAllWithRoles: () => apiFetch("/users"),

  assignRole: (userId, roleId) =>
    apiFetch(`/users/${userId}/role`, {
      method: "PATCH",
      body: { roleId },
    }),

  remove: (userId) =>
    apiFetch(`/users/${userId}`, { method: "DELETE" }),

  /**
   * Invite a new user by email. Backend creates an invitation row and
   * sends the email via Resend (if configured). Always returns an
   * acceptUrl so the admin can share it manually as a fallback.
   */
  invite: ({ email, fullName, roleId } = {}) =>
    apiFetch("/users/invite", {
      method: "POST",
      body: { email, fullName, roleId },
    }),
};

// Roles
export const Roles = {
  list: () => apiFetch("/roles"),
  getById: (id) => apiFetch(`/roles/${id}`),

  // Back-compat aliases
  getAll: () => apiFetch("/roles"),
  getAllWithPermissions: () => apiFetch("/roles"),
  getWithPermissions: (id) => apiFetch(`/roles/${id}`),

  create: ({ name, description } = {}) =>
    apiFetch("/roles", { method: "POST", body: { name, description } }),

  update: (id, { name, description } = {}) =>
    apiFetch(`/roles/${id}`, { method: "PATCH", body: { name, description } }),

  remove: (id) => apiFetch(`/roles/${id}`, { method: "DELETE" }),

  // Back-compat aliases for the old method names
  createRole: (name, description) =>
    apiFetch("/roles", { method: "POST", body: { name, description } }),
  updateRole: (id, name, description) =>
    apiFetch(`/roles/${id}`, { method: "PATCH", body: { name, description } }),
  deleteRole: (id) => apiFetch(`/roles/${id}`, { method: "DELETE" }),

  /**
   * Replace the role's permission set in a single transaction.
   * @param {string} roleId
   * @param {string[]} permissionIds
   */
  setPermissions: (roleId, permissionIds) =>
    apiFetch(`/roles/${roleId}/permissions`, {
      method: "PUT",
      body: { permissionIds },
    }),
};

// Permissions catalog (read-only)
export const Permissions = {
  list: () => apiFetch("/permissions"),
  getAll: () => apiFetch("/permissions"),

  // Group by prefix (e.g. "tenants:view" → "tenants")
  async getAllGrouped() {
    const perms = await apiFetch("/permissions");
    return (perms || []).reduce((acc, perm) => {
      const [category] = perm.name.split(":");
      if (!acc[category]) acc[category] = [];
      acc[category].push(perm);
      return acc;
    }, {});
  },
};
