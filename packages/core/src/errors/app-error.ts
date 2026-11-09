/**
 * Application error codes. They are the contract between use cases and the transport layer:
 * HTTP maps them to statuses and clients recognise them without comparing messages.
 */
export type AppErrorCode = "Unauthorized" | "Forbidden" | "NotFound" | "Validation" | "Conflict" | "TooManyRequests";

// `Symbol.for` is shared across module copies: Next.js may bundle `@validuo/core` separately for Route
// Handlers and for Server Actions, so `instanceof` on an error thrown by the other copy is false.
const APP_ERROR_BRAND = Symbol.for("@validuo/core/AppError");

/** Field name → messages. */
export type FieldErrors = Readonly<Record<string, readonly string[]>>;

/**
 * Expected use-case failure. It knows nothing about HTTP — the transport layer picks the status.
 * `message` is product text (Polish) and may be shown to the user.
 */
export abstract class AppError extends Error {
  readonly [APP_ERROR_BRAND] = true;
  abstract readonly code: AppErrorCode;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** No verified session. */
export class UnauthorizedError extends AppError {
  readonly code = "Unauthorized";
}

/** The actor is known but may not perform this operation. */
export class ForbiddenError extends AppError {
  readonly code = "Forbidden";
}

/** The resource does not exist or, per access policy, its existence must not be revealed. */
export class NotFoundError extends AppError {
  readonly code = "NotFound";
}

/** Well-formed input that breaks field rules. */
export class ValidationError extends AppError {
  readonly code = "Validation";
  readonly fieldErrors: FieldErrors;

  constructor(message: string, fieldErrors: FieldErrors, options?: ErrorOptions) {
    super(message, options);
    this.fieldErrors = fieldErrors;
  }
}

/** The operation conflicts with the current state (duplicate, concurrent change). */
export class ConflictError extends AppError {
  readonly code = "Conflict";
}

/** Too many attempts in a time window; the caller may retry later. */
export class TooManyRequestsError extends AppError {
  readonly code = "TooManyRequests";
}

/** Bundle-safe replacement for `error instanceof AppError`. */
export function isAppError(value: unknown): value is AppError {
  return (
    value instanceof Error && (value as Partial<Record<typeof APP_ERROR_BRAND, unknown>>)[APP_ERROR_BRAND] === true
  );
}

/** Bundle-safe check for a specific kind of `AppError`, by its `code`. */
export function hasErrorCode<C extends AppErrorCode>(
  value: unknown,
  code: C,
): value is AppError & { readonly code: C } {
  return isAppError(value) && value.code === code;
}

/** Bundle-safe `error instanceof ValidationError`. */
export function isValidationError(value: unknown): value is ValidationError {
  return hasErrorCode(value, "Validation");
}
