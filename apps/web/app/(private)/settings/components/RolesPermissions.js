"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { Roles, Permissions } from "@/app/api/core/core";
import RolesList from "./RolesList";
import PermissionsPanel from "./PermissionsPanel";

export default function RolesPermissionsSettings() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [selectedRole, setSelectedRole] = useState(null);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  const [rolePermissions, setRolePermissions] = useState([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        Roles.getAllWithPermissions(),
        Permissions.getAll(),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);
      if (rolesData.length > 0 && !selectedRole) {
        setSelectedRole(rolesData[0]);
        setRolePermissions(rolesData[0].permissions?.map((p) => p.id) || []);
      }
    } catch {
      setMessage({
        type: "error",
        text: "Failed to load roles and permissions",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const [category] = perm.name.split(":");
    if (!acc[category]) acc[category] = [];
    acc[category].push(perm);
    return acc;
  }, {});

  const filteredGroupedPermissions = Object.entries(groupedPermissions).reduce(
    (acc, [category, perms]) => {
      const filtered = perms.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      if (filtered.length > 0) acc[category] = filtered;
      return acc;
    },
    {},
  );

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setRolePermissions(role.permissions?.map((p) => p.id) || []);
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setSavingRole(true);
    try {
      const newRole = await Roles.createRole(newRoleName.trim());
      setRoles([...roles, { ...newRole, permissions: [] }]);
      setNewRoleName("");
      setIsAddingRole(false);
      setMessage({ type: "success", text: "Role created successfully" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to create role",
      });
    } finally {
      setSavingRole(false);
    }
  };

  const handleUpdateRole = async (roleId) => {
    if (!editRoleName.trim()) return;
    setSavingRole(true);
    try {
      await Roles.updateRole(roleId, editRoleName.trim());
      setRoles(
        roles.map((r) =>
          r.id === roleId ? { ...r, name: editRoleName.trim() } : r,
        ),
      );
      if (selectedRole?.id === roleId)
        setSelectedRole({ ...selectedRole, name: editRoleName.trim() });
      setEditingRoleId(null);
      setEditRoleName("");
      setMessage({ type: "success", text: "Role updated successfully" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to update role",
      });
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (
      !confirm(
        "Are you sure you want to delete this role? Users with this role will lose their permissions.",
      )
    )
      return;
    try {
      await Roles.deleteRole(roleId);
      const updatedRoles = roles.filter((r) => r.id !== roleId);
      setRoles(updatedRoles);
      if (selectedRole?.id === roleId) {
        setSelectedRole(updatedRoles[0] || null);
        setRolePermissions(
          updatedRoles[0]?.permissions?.map((p) => p.id) || [],
        );
      }
      setMessage({ type: "success", text: "Role deleted successfully" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to delete role",
      });
    }
  };

  const handleTogglePermission = (permissionId) => {
    setRolePermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId],
    );
  };

  const handleToggleCategory = (categoryPerms) => {
    const categoryIds = categoryPerms.map((p) => p.id);
    const allSelected = categoryIds.every((id) => rolePermissions.includes(id));
    if (allSelected) {
      setRolePermissions((prev) =>
        prev.filter((id) => !categoryIds.includes(id)),
      );
    } else {
      setRolePermissions((prev) => [...new Set([...prev, ...categoryIds])]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSavingPermissions(true);
    try {
      await Roles.setPermissions(selectedRole.id, rolePermissions);
      setRoles(
        roles.map((r) =>
          r.id === selectedRole.id
            ? {
                ...r,
                permissions: permissions.filter((p) =>
                  rolePermissions.includes(p.id),
                ),
              }
            : r,
        ),
      );
      setSelectedRole({
        ...selectedRole,
        permissions: permissions.filter((p) => rolePermissions.includes(p.id)),
      });
      setMessage({ type: "success", text: "Permissions saved successfully" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to save permissions",
      });
    } finally {
      setSavingPermissions(false);
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
          <p className="section-label">— Access —</p>
          <h2
            className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Roles & Permissions
          </h2>
          <p className="mt-1 text-sm text-black/55">
            Manage user roles and their associated permissions.
          </p>
        </div>
      </header>

      {message.text && (
        <div
          className={`flex items-start gap-3 border p-4 sm:items-center ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0" strokeWidth={1.8} />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" strokeWidth={1.8} />
          )}
          <span className="text-sm font-medium">{message.text}</span>
          <button
            onClick={() => setMessage({ type: "", text: "" })}
            className="ml-auto p-1 text-current/70 transition-colors hover:bg-white/60 hover:text-current"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RolesList
          roles={roles}
          selectedRole={selectedRole}
          isAddingRole={isAddingRole}
          newRoleName={newRoleName}
          editingRoleId={editingRoleId}
          editRoleName={editRoleName}
          savingRole={savingRole}
          onSelectRole={handleSelectRole}
          onCreateRole={handleCreateRole}
          onUpdateRole={handleUpdateRole}
          onDeleteRole={handleDeleteRole}
          setIsAddingRole={setIsAddingRole}
          setNewRoleName={setNewRoleName}
          setEditingRoleId={setEditingRoleId}
          setEditRoleName={setEditRoleName}
        />
        <PermissionsPanel
          selectedRole={selectedRole}
          filteredGroupedPermissions={filteredGroupedPermissions}
          rolePermissions={rolePermissions}
          expandedCategories={expandedCategories}
          searchTerm={searchTerm}
          savingPermissions={savingPermissions}
          onTogglePermission={handleTogglePermission}
          onToggleCategory={handleToggleCategory}
          onSavePermissions={handleSavePermissions}
          onToggleCategoryExpand={(category) =>
            setExpandedCategories((prev) => ({
              ...prev,
              [category]: !prev[category],
            }))
          }
          setSearchTerm={setSearchTerm}
        />
      </div>
    </div>
  );
}
