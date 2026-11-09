import { describe, expect, it } from "vitest";

import { ForbiddenError } from "../errors/app-error";
import type { PermissionAction } from "../permissions/catalog";
import { assertCan, can, type Actor } from "./access.policy";

const actorWith = (permissions: PermissionAction[]): Actor => ({ personId: "p1", accountId: "acc-1", permissions });

describe("can", () => {
  it("denies an actor without permissions", () => {
    expect(can(actorWith([]), "read", { accountId: "acc-1" })).toBe(false);
  });

  it("allows an action the actor holds", () => {
    expect(can(actorWith(["read"]), "read", { accountId: "acc-1" })).toBe(true);
  });

  it("requires the action to match", () => {
    expect(can(actorWith(["read"]), "write", { accountId: "acc-1" })).toBe(false);
  });

  it("never reaches a resource of another account", () => {
    const actor = actorWith(["read"]);

    expect(can(actor, "read", { accountId: "acc-2" })).toBe(false);
  });
});

describe("assertCan", () => {
  it("passes when access is allowed", () => {
    const actor = actorWith(["read"]);

    expect(() => assertCan(actor, "read", { accountId: "acc-1" })).not.toThrow();
  });

  it("throws ForbiddenError when access is denied", () => {
    expect(() => assertCan(actorWith([]), "read", { accountId: "acc-1" })).toThrow(ForbiddenError);
  });
});
