/**
 * Catalogue of permission scopes and actions — the single place that defines them (accepted
 * product spec: `.ai/specs/2026-11-09-accounts-auth-permissions.md`). Departments and employees
 * have no scope of their own: access to them is decided by their parent group.
 */
export const PERMISSION_SCOPES = ["account", "group"] as const;
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export const PERMISSION_ACTIONS = ["read", "write", "manage_permissions"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/** A permission held by one person: scope (+ the scoped resource) and action. */
export type Permission = {
  scope: PermissionScope;
  /** Account id for `account`, group id for `group`. */
  scopeId: string;
  action: PermissionAction;
};

/** Permissions of the person who creates an account: everything on the whole account. */
export function accountOwnerPermissions(accountId: string): Permission[] {
  return PERMISSION_ACTIONS.map((action) => ({ scope: "account", scopeId: accountId, action }));
}
