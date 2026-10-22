import { describe, expect, it } from "vitest";

import {
  AppError,
  ConfigurationError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PlanLimitError,
  UnauthorizedError,
  ValidationError,
} from ".";

describe("AppError subclasses", () => {
  it.each([
    [UnauthorizedError, "Unauthorized"],
    [ForbiddenError, "Forbidden"],
    [NotFoundError, "NotFound"],
    [ConflictError, "Conflict"],
    [PlanLimitError, "PlanLimit"],
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
