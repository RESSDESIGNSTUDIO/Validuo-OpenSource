/**
 * Catalogue of permission actions — the single place that defines them (accepted product spec:
 * `.ai/specs/2026-11-09-accounts-auth-permissions.md`). In v1 a permission covers the whole
 * account; narrower scopes (groups) arrive with the groups themselves (E02).
 */
export const PERMISSION_ACTIONS = ["read", "write", "manage_permissions"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/** Permissions of the person who creates an account: every action on the whole account. */
export function accountOwnerPermissions(): readonly PermissionAction[] {
  return PERMISSION_ACTIONS;
}
