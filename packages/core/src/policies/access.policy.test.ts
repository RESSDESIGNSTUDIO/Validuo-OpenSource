import { describe, expect, it } from "vitest";

import { ForbiddenError } from "../errors/app-error";
import type { Permission } from "../permissions/catalog";
import { assertCan, can, type Actor } from "./access.policy";

const actorWith = (permissions: Permission[]): Actor => ({ personId: "p1", accountId: "acc-1", permissions });

describe("can", () => {
  it("denies an actor without permissions", () => {
    expect(can(actorWith([]), "read", { accountId: "acc-1" })).toBe(false);
  });

  it("lets an account-wide permission cover the account and every group in it", () => {
    const actor = actorWith([{ scope: "account", scopeId: "acc-1", action: "read" }]);

    expect(can(actor, "read", { accountId: "acc-1" })).toBe(true);
    expect(can(actor, "read", { accountId: "acc-1", groupId: "g1" })).toBe(true);
  });

  it("requires the action to match", () => {
    const actor = actorWith([{ scope: "account", scopeId: "acc-1", action: "read" }]);

    expect(can(actor, "write", { accountId: "acc-1" })).toBe(false);
  });

  it("limits a group permission to that group", () => {
    const actor = actorWith([{ scope: "group", scopeId: "g1", action: "write" }]);

    expect(can(actor, "write", { accountId: "acc-1", groupId: "g1" })).toBe(true);
    expect(can(actor, "write", { accountId: "acc-1", groupId: "g2" })).toBe(false);
    expect(can(actor, "write", { accountId: "acc-1" })).toBe(false);
  });

  it("ignores an account permission that names another account", () => {
    const actor = actorWith([{ scope: "account", scopeId: "acc-2", action: "read" }]);

    expect(can(actor, "read", { accountId: "acc-1" })).toBe(false);
  });

  it("never reaches a resource of another account", () => {
    const actor = actorWith([{ scope: "account", scopeId: "acc-1", action: "read" }]);

    expect(can(actor, "read", { accountId: "acc-2" })).toBe(false);
  });
});

describe("assertCan", () => {
  it("passes when access is allowed", () => {
    const actor = actorWith([{ scope: "account", scopeId: "acc-1", action: "read" }]);

    expect(() => assertCan(actor, "read", { accountId: "acc-1" })).not.toThrow();
  });

  it("throws ForbiddenError when access is denied", () => {
    expect(() => assertCan(actorWith([]), "read", { accountId: "acc-1" })).toThrow(ForbiddenError);
  });
});
