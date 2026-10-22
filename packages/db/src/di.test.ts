import { createAppContainer } from "@validuo/core/di";
import { describe, expect, it, vi } from "vitest";

import { dbRegistrations, type DbCradle } from "./di";

// Nothing listens on port 1: the ORM connects lazily, so no test here opens a connection.
const database = { url: "postgres://postgres@127.0.0.1:1/validuo_unit", poolMin: 0, poolMax: 1, debug: false };

describe("dbRegistrations", () => {
  it("shares one ORM per container and forks an EntityManager per scope", () => {
    const container = createAppContainer<DbCradle>(dbRegistrations(database));
    const orm = container.resolve("orm");
    const first = container.createScope();
    const second = container.createScope();

    expect(first.resolve("orm")).toBe(orm);
    expect(first.resolve("em")).toBe(first.resolve("em"));
    expect(first.resolve("em")).not.toBe(second.resolve("em"));
    expect(first.resolve("em")).not.toBe(orm.em);
    expect(orm.config.get("clientUrl")).toBe(database.url);
  });

  it("closes the ORM when the container is disposed", async () => {
    const container = createAppContainer<DbCradle>(dbRegistrations(database));
    const close = vi.spyOn(container.resolve("orm"), "close");

    await container.dispose();

    expect(close).toHaveBeenCalledOnce();
  });
});
