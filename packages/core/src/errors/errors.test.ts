import { describe, expect, it } from "vitest";

import {
  AppError,
  ConfigurationError,
  ConflictError,
  ForbiddenError,
  hasErrorCode,
  isAppError,
  isValidationError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from ".";

describe("AppError subclasses", () => {
  it.each([
    [UnauthorizedError, "Unauthorized"],
    [ForbiddenError, "Forbidden"],
    [NotFoundError, "NotFound"],
    [ConflictError, "Conflict"],
    [TooManyRequestsError, "TooManyRequests"],
  ] as const)("%o carries code %s, its own name and the cause", (ErrorClass, code) => {
    const cause = new Error("root cause");
    const error = new ErrorClass("Komunikat dla użytkownika.", { cause });

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(code);
    expect(error.name).toBe(ErrorClass.name);
    expect(error.message).toBe("Komunikat dla użytkownika.");
    expect(error.cause).toBe(cause);
  });

  it("keeps field errors on ValidationError", () => {
    const error = new ValidationError("Popraw formularz.", { email: ["Wymagane."] });

    expect(error.code).toBe("Validation");
    expect(error.name).toBe("ValidationError");
    expect(error.fieldErrors).toEqual({ email: ["Wymagane."] });
  });
});

describe("ConfigurationError", () => {
  it("is a plain Error, never an AppError", () => {
    const error = new ConfigurationError("Invalid environment configuration");

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(AppError);
    expect(error.name).toBe("ConfigurationError");
  });
});

describe("bundle-safe guards", () => {
  // What another bundled copy of `@validuo/core` produces: same brand, different class identity.
  const foreign = (code: string) =>
    Object.assign(new Error("z innej paczki"), { [Symbol.for("@validuo/core/AppError")]: true, code });

  it("recognise AppError instances and errors thrown by another copy of the module", () => {
    expect(isAppError(new ConflictError("x"))).toBe(true);
    expect(isAppError(foreign("Conflict"))).toBe(true);
    expect(foreign("Conflict") instanceof AppError).toBe(false);
  });

  it("do not mistake other values for AppError", () => {
    expect(isAppError(new Error("x"))).toBe(false);
    expect(isAppError({ code: "Conflict", [Symbol.for("@validuo/core/AppError")]: true })).toBe(false);
    expect(isAppError(null)).toBe(false);
  });

  it("match a specific kind by code", () => {
    expect(hasErrorCode(foreign("TooManyRequests"), "TooManyRequests")).toBe(true);
    expect(hasErrorCode(foreign("Conflict"), "TooManyRequests")).toBe(false);
    expect(hasErrorCode(new Error("x"), "Conflict")).toBe(false);
    expect(isValidationError(new ValidationError("x", {}))).toBe(true);
    expect(isValidationError(new ConflictError("x"))).toBe(false);
  });
});
