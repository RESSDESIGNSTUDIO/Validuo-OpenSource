import type { MikroORM } from "@mikro-orm/postgresql";
import { describe, expect, it, vi } from "vitest";

import { checkDatabase } from "./health";

// Only the part of MikroORM that `checkDatabase` touches.
const ormExecuting = (execute: () => Promise<unknown>) =>
  ({ em: { getConnection: () => ({ execute }) } }) as unknown as MikroORM;

describe("checkDatabase", () => {
  it("runs a real query and reports success", async () => {
    const execute = vi.fn().mockResolvedValue([{ "?column?": 1 }]);

    expect(await checkDatabase(ormExecuting(execute))).toEqual({ ok: true });
    expect(execute).toHaveBeenCalledWith("select 1");
  });

  it("reports the driver error message instead of throwing", async () => {
    const result = await checkDatabase(ormExecuting(() => Promise.reject(new Error("connect ECONNREFUSED"))));

    expect(result).toEqual({ ok: false, reason: "connect ECONNREFUSED" });
  });

  it("stringifies non-Error rejections", async () => {
    const result = await checkDatabase(ormExecuting(() => Promise.reject("socket closed")));

    expect(result).toEqual({ ok: false, reason: "socket closed" });
  });
});
