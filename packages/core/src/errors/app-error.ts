/**
 * Application error codes. They are the contract between use cases and the transport layer:
 * HTTP maps them to statuses and clients recognise them without comparing messages.
 */
export type AppErrorCode = "Unauthorized" | "Forbidden" | "NotFound" | "Validation" | "Conflict" | "PlanLimit";

/** Field name → messages. */
export type FieldErrors = Readonly<Record<string, readonly string[]>>;

/**
 * Expected use-case failure. It knows nothing about HTTP — the transport layer picks the status.
 * `message` is product text (Polish) and may be shown to the user.
 */
export abstract class AppError extends Error {
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

/** The operation would exceed an account plan limit. */
export class PlanLimitError extends AppError {
  readonly code = "PlanLimit";
}
