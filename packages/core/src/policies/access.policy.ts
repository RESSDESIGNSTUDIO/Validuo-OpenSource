import { ForbiddenError } from "../errors/app-error";
import type { PermissionAction } from "../permissions/catalog";

/** Verified requester: who they are, which account they belong to and what they may do. */
export type Actor = {
  personId: string;
  accountId: string;
  /** Actions the person holds on their whole account (v1 has no narrower scope). */
  permissions: readonly PermissionAction[];
};

/** The resource being accessed, reduced to what decides access. */
export type AccessTarget = {
  accountId: string;
};

/**
 * Access decision. Fails closed: no matching permission means denial, and a resource of another
 * account is never reachable, whatever the actor holds.
 */
export function can(actor: Actor, action: PermissionAction, target: AccessTarget): boolean {
  if (target.accountId !== actor.accountId) {
    return false;
  }
  return actor.permissions.includes(action);
}

export function assertCan(actor: Actor, action: PermissionAction, target: AccessTarget): void {
  if (!can(actor, action, target)) {
    throw new ForbiddenError("Brak uprawnień do wykonania tej operacji.");
  }
}
