import type { EntityManager } from "@mikro-orm/postgresql";
import { describe, expect, it, vi } from "vitest";

import { MikroOrmUnitOfWork } from "./mikro-orm-unit-of-work";

function setup() {
  const calls: string[] = [];
  const em = {
    begin: vi.fn(async () => void calls.push("begin")),
    commit: vi.fn(async () => void calls.push("commit")),
    rollback: vi.fn(async () => void calls.push("rollback")),
  };
  return { calls, unitOfWork: new MikroOrmUnitOfWork({ em: em as unknown as EntityManager }) };
}

describe("MikroOrmUnitOfWork", () => {
  it("commits and returns the result", async () => {
    const { calls, unitOfWork } = setup();

    expect(await unitOfWork.run(async () => 42)).toBe(42);
    expect(calls).toEqual(["begin", "commit"]);
  });

  it("rolls back and rethrows when the work fails", async () => {
    const { calls, unitOfWork } = setup();
    const failure = new Error("boom");

    await expect(
      unitOfWork.run(async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(calls).toEqual(["begin", "rollback"]);
  });
});
