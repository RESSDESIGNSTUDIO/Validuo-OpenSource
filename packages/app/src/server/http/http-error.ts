/**
 * Transport-level failure that is not a domain rule (e.g. a dependency is down). Domain failures
 * use `AppError` from `@validuo/core/errors` instead.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}
