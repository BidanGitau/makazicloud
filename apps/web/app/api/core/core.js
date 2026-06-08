import { apiFetch } from "../../_lib/api/client";


export const Users = {
  list: () => apiFetch("/users"),


  getAllWithRoles: () => apiFetch("/users"),

  assignRole: (userId, roleId) =>
    apiFetch(`/users/${userId}/role`, {
      method: "PATCH",
      body: { roleId },
    }),

  remove: (userId) =>
    apiFetch(`/users/${userId}`, { method: "DELETE" }),

  revokeInvitation: (invitationId) =>
    apiFetch(`/users/invitations/${invitationId}`, { method: "DELETE" }),


  invite: ({ email, fullName, roleId } = {}) =>
    apiFetch("/users/invite", {
      method: "POST",
      body: { email, fullName, roleId },
    }),
};


export const Roles = {
  list: () => apiFetch("/roles"),
  getById: (id) => apiFetch(`/roles/${id}`),


  getAll: () => apiFetch("/roles"),
  getAllWithPermissions: () => apiFetch("/roles"),
  getWithPermissions: (id) => apiFetch(`/roles/${id}`),

  create: ({ name, description } = {}) =>
    apiFetch("/roles", { method: "POST", body: { name, description } }),

  update: (id, { name, description } = {}) =>
    apiFetch(`/roles/${id}`, { method: "PATCH", body: { name, description } }),

  remove: (id) => apiFetch(`/roles/${id}`, { method: "DELETE" }),


  createRole: (name, description) =>
    apiFetch("/roles", { method: "POST", body: { name, description } }),
  updateRole: (id, name, description) =>
    apiFetch(`/roles/${id}`, { method: "PATCH", body: { name, description } }),
  deleteRole: (id) => apiFetch(`/roles/${id}`, { method: "DELETE" }),


  setPermissions: (roleId, permissionIds) =>
    apiFetch(`/roles/${roleId}/permissions`, {
      method: "PUT",
      body: { permissionIds },
    }),
};


export const Permissions = {
  list: () => apiFetch("/permissions"),
  getAll: () => apiFetch("/permissions"),


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
