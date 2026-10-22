import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PlanLimitError,
  UnauthorizedError,
  ValidationError,
  type AppError,
} from "@validuo/core/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiHandler } from "./api-handler";
import { HttpError } from "./http-error";

const { logger, scope } = vi.hoisted(() => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() };
  logger.child.mockReturnValue(logger);
  const scope = { resolve: vi.fn(() => logger), dispose: vi.fn() };
  return { logger, scope };
});

vi.mock("../container", () => ({
  getContainer: () => scope,
  withRequestScope: async <T>(fn: (s: typeof scope) => Promise<T>) => fn(scope),
}));

const noParams = { params: Promise.resolve({}) };
type Route = (request: Request, segment: typeof noParams) => Promise<Response>;
const call = (handler: Route, headers: HeadersInit = {}) =>
  handler(new Request("http://localhost/api/test", { headers }), noParams);

beforeEach(() => {
  vi.clearAllMocks();
  logger.child.mockReturnValue(logger);
});

describe("apiHandler", () => {
  it("wraps data in ApiResult with a request id and no-store caching", async () => {
    const response = await call(apiHandler("test.ok", async () => ({ data: { id: 1 }, status: 201 })));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, data: { id: 1 } });
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("passes awaited params and a logger bound to the request", async () => {
    const handler = apiHandler<string, { groupId: string }>("groups.read", async ({ params }) => ({
      data: params.groupId,
    }));

    const response = await handler(
      new Request("http://localhost/api/groups/g1", { headers: { "x-request-id": "abc-1" } }),
      {
        params: Promise.resolve({ groupId: "g1" }),
      },
    );

    expect(await response.json()).toEqual({ ok: true, data: "g1" });
    expect(logger.child).toHaveBeenCalledWith({ requestId: "abc-1", operation: "groups.read" });
  });

  it("keeps a safe upstream request id and replaces an unsafe one", async () => {
    const handler = apiHandler("test.ok", async () => ({ data: null }));

    expect((await call(handler, { "x-request-id": "edge:42.a_b" })).headers.get("x-request-id")).toBe("edge:42.a_b");
    expect((await call(handler, { "x-request-id": 'x" injected=1' })).headers.get("x-request-id")).not.toContain(
      "injected",
    );
  });

  it.each<[AppError, number]>([
    [new UnauthorizedError("Zaloguj się."), 401],
    [new ForbiddenError("Brak uprawnień."), 403],
    [new NotFoundError("Nie znaleziono."), 404],
    [new ConflictError("Konflikt."), 409],
    [new PlanLimitError("Limit planu."), 409],
  ])("maps %s to HTTP %i", async (error, status) => {
    const response = await call(apiHandler("test.fail", () => Promise.reject(error)));
    const requestId = response.headers.get("x-request-id");

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: error.code, message: error.message, requestId },
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("returns field errors for validation failures with 422", async () => {
    const error = new ValidationError("Popraw formularz.", { email: ["Nieprawidłowy adres e-mail."] });

    const response = await call(apiHandler("test.fail", () => Promise.reject(error)));

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "Validation", fieldErrors: { email: ["Nieprawidłowy adres e-mail."] } },
    });
  });

  it("uses the status of transport errors and logs 5xx ones", async () => {
    const error = new HttpError(503, "ServiceUnavailable", "Usługa jest chwilowo niedostępna.");

    const response = await call(apiHandler("test.fail", () => Promise.reject(error)));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "ServiceUnavailable" } });
    expect(logger.warn).toHaveBeenCalledWith("Request failed", expect.objectContaining({ error }));
  });

  it("hides unexpected errors behind a neutral message and logs them", async () => {
    const error = new Error('duplicate key value violates unique constraint "profiles_pkey"');

    const response = await call(apiHandler("test.fail", () => Promise.reject(error)));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({ ok: false, error: { code: "Internal" } });
    expect(JSON.stringify(body)).not.toContain("profiles_pkey");
    expect(logger.error).toHaveBeenCalledWith("Unexpected error", expect.objectContaining({ error }));
  });
});
