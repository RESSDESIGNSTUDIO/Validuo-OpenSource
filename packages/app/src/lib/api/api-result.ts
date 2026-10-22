/**
 * JSON API response format, shared by Route Handlers (`server/http/api-handler.ts`) and the
 * browser-side API helper. Type-only, so it is safe to import from Client Components.
 */
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type ApiSuccess<T> = { ok: true; data: T };

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    requestId?: string;
  };
};
