import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const { checkDatabase, logger, orm } = vi.hoisted(() => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() };
  logger.child.mockReturnValue(logger);
  return { checkDatabase: vi.fn(), logger, orm: { name: "orm" } };
});

vi.mock("@validuo/db", () => ({ checkDatabase }));
vi.mock("@/server/container", () => {
  const scope = { resolve: (name: string) => (name === "logger" ? logger : orm) };
  return { getContainer: () => scope, withRequestScope: (fn: (s: typeof scope) => unknown) => fn(scope) };
});

const get = () => GET(new Request("http://localhost/api/health"), { params: Promise.resolve({}) });

beforeEach(() => {
  vi.clearAllMocks();
  logger.child.mockReturnValue(logger);
});

describe("GET /api/health", () => {
  it("reports ok when the database answers", async () => {
    checkDatabase.mockResolvedValue({ ok: true });

    const response = await get();

    expect(checkDatabase).toHaveBeenCalledWith(orm);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { status: "ok", db: "ok" } });
  });

  it("answers 503 without leaking the database error, which goes to the log", async () => {
    checkDatabase.mockResolvedValue({ ok: false, reason: "password authentication failed for user app" });

    const response = await get();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body)).toMatchObject({ ok: false, error: { code: "ServiceUnavailable" } });
    expect(body).not.toContain("password");
    expect(logger.warn).toHaveBeenCalledWith(
      "Request failed",
      expect.objectContaining({ error: expect.objectContaining({ cause: expect.any(Error) }) }),
    );
  });
});
