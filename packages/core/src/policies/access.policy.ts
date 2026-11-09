import { ForbiddenError } from "../errors/app-error";
import type { Permission, PermissionAction } from "../permissions/catalog";

/** Verified requester: who they are, which account they belong to and what they may do. */
export type Actor = {
  personId: string;
  accountId: string;
  permissions: readonly Permission[];
};

/** The resource being accessed, reduced to what decides access. */
export type AccessTarget = {
  accountId: string;
  /** Parent group of a group, department or employee; omit for account-level resources. */
  groupId?: string;
};

/**
 * Access decision. Fails closed: no matching permission means denial, and a resource of another
 * account is never reachable, whatever the actor holds.
 */
export function can(actor: Actor, action: PermissionAction, target: AccessTarget): boolean {
  if (target.accountId !== actor.accountId) {
    return false;
  }
  return actor.permissions.some(
    (permission) =>
      permission.action === action &&
      ((permission.scope === "account" && permission.scopeId === actor.accountId) ||
        (permission.scope === "group" && target.groupId !== undefined && permission.scopeId === target.groupId)),
  );
}

export function assertCan(actor: Actor, action: PermissionAction, target: AccessTarget): void {
  if (!can(actor, action, target)) {
    throw new ForbiddenError("Brak uprawnień do wykonania tej operacji.");
  }
}
