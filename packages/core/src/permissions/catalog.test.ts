import { describe, expect, it } from "vitest";

import { accountOwnerPermissions, PERMISSION_ACTIONS, PERMISSION_SCOPES } from "./catalog";

describe("permission catalogue", () => {
  it("defines the accepted scopes and actions", () => {
    expect(PERMISSION_SCOPES).toEqual(["account", "group"]);
    expect(PERMISSION_ACTIONS).toEqual(["read", "write", "manage_permissions"]);
  });

  it("gives the account creator every action on the whole account", () => {
    expect(accountOwnerPermissions("acc-1")).toEqual([
      { scope: "account", scopeId: "acc-1", action: "read" },
      { scope: "account", scopeId: "acc-1", action: "write" },
      { scope: "account", scopeId: "acc-1", action: "manage_permissions" },
    ]);
  });
});
