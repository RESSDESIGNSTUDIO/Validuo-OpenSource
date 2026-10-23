import "server-only";

import { AppError, ValidationError, type AppErrorCode } from "@validuo/core/errors";

import type { ApiFailure, ApiResult } from "@/lib/api/api-result";

import { getContainer, withRequestScope, type RequestScope } from "../container";
import { createJsonLogger, type Logger } from "../logging/logger";
import { HttpError } from "./http-error";

export type ApiHandlerContext<TParams> = {
  request: Request;
  params: TParams;
  scope: RequestScope;
  requestId: string;
  /** Logger bound to `requestId` and `operation`. */
  logger: Logger;
};

export type ApiReply<T> = { data: T; status?: number };

const appErrorStatus: Record<AppErrorCode, number> = {
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  Validation: 422,
  Conflict: 409,
};

const UNEXPECTED_ERROR_MESSAGE = "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.";

// Accept an upstream correlation id only if it cannot smuggle anything into logs.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

/**
 * Wraps a Route Handler: one DI scope per request, a correlation id, `ApiResult` responses and a
 * single mapping of errors to HTTP statuses. Unexpected errors are logged and answered with a
 * neutral message — no SQL, stack traces or provider responses reach the client.
 */
export function apiHandler<TData, TParams = Record<string, never>>(
  operation: string,
  handler: (context: ApiHandlerContext<TParams>) => Promise<ApiReply<TData>>,
) {
  return async (request: Request, segment: { params: Promise<TParams> }): Promise<Response> => {
    const incomingId = request.headers.get("x-request-id");
    const requestId = incomingId && SAFE_REQUEST_ID.test(incomingId) ? incomingId : crypto.randomUUID();

    try {
      const params = await segment.params;
      const reply = await withRequestScope((scope) => {
        const logger = scope.resolve("logger").child({ requestId, operation });
        return handler({ request, params, scope, requestId, logger });
      });
      return json({ ok: true, data: reply.data }, reply.status ?? 200, requestId);
    } catch (error) {
      const logger = rootLogger().child({ requestId, operation });
      const { status, body } = toFailure(error, requestId, logger);
      return json(body, status, requestId);
    }
  };
}

function toFailure(error: unknown, requestId: string, logger: Logger): { status: number; body: ApiFailure } {
  if (error instanceof AppError) {
    const fieldErrors = error instanceof ValidationError ? copyFieldErrors(error) : undefined;
    return {
      status: appErrorStatus[error.code],
      body: {
        ok: false,
        error: { code: error.code, message: error.message, ...(fieldErrors && { fieldErrors }), requestId },
      },
    };
  }
  if (error instanceof HttpError) {
    if (error.status >= 500) {
      logger.warn("Request failed", { code: error.code, status: error.status, error });
    }
    return {
      status: error.status,
      body: { ok: false, error: { code: error.code, message: error.message, requestId } },
    };
  }
  logger.error("Unexpected error", { code: "Internal", error });
  return {
    status: 500,
    body: { ok: false, error: { code: "Internal", message: UNEXPECTED_ERROR_MESSAGE, requestId } },
  };
}

function copyFieldErrors(error: ValidationError): Record<string, string[]> {
  return Object.fromEntries(Object.entries(error.fieldErrors).map(([field, messages]) => [field, [...messages]]));
}

// The container itself may be what failed (e.g. invalid configuration), so error reporting
// cannot depend on it.
function rootLogger(): Logger {
  try {
    return getContainer().resolve("logger");
  } catch {
    return createJsonLogger();
  }
}

function json<T>(body: ApiResult<T>, status: number, requestId: string): Response {
  return Response.json(body, {
    status,
    // API responses may carry tenant data; never let shared caches store them.
    headers: { "x-request-id": requestId, "cache-control": "no-store" },
  });
}
