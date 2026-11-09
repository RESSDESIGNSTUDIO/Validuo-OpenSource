import { describe, expect, it } from "vitest";

import { accountOwnerPermissions, PERMISSION_ACTIONS } from "./catalog";

describe("permission catalogue", () => {
  it("defines the accepted actions", () => {
    expect(PERMISSION_ACTIONS).toEqual(["read", "write", "manage_permissions"]);
  });

  it("gives the account creator every action", () => {
    expect(accountOwnerPermissions()).toEqual(["read", "write", "manage_permissions"]);
  });
});
