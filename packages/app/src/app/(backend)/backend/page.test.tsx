import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BackendDashboardPage from "./page";

const { checkDatabase, connection, logger } = vi.hoisted(() => ({
  checkDatabase: vi.fn(),
  connection: vi.fn(),
  logger: { warn: vi.fn() },
}));

vi.mock("next/server", () => ({ connection }));
vi.mock("@validuo/db", () => ({ checkDatabase }));
vi.mock("@/server/container", () => ({
  getContainer: () => ({ resolve: (name: string) => (name === "logger" ? logger : { name: "orm" }) }),
}));

const render = async () => renderToStaticMarkup(await BackendDashboardPage());

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BackendDashboardPage", () => {
  it("renders at request time and shows a connected database", async () => {
    checkDatabase.mockResolvedValue({ ok: true });

    const markup = await render();

    expect(connection).toHaveBeenCalledOnce();
    expect(markup).toContain("Połączono");
    expect(markup).toContain('href="/api/health"');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("shows only the status when the database is down and logs the reason", async () => {
    checkDatabase.mockResolvedValue({ ok: false, reason: "connect ECONNREFUSED 10.0.0.5:5432" });

    const markup = await render();

    expect(markup).toContain("Niedostępna");
    expect(markup).not.toContain("ECONNREFUSED");
    expect(logger.warn).toHaveBeenCalledWith("Database unavailable", {
      operation: "backend.dashboard",
      reason: "connect ECONNREFUSED 10.0.0.5:5432",
    });
  });
});
