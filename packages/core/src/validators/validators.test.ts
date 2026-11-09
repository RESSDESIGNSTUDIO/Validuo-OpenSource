import { describe, expect, it } from "vitest";

import { ValidationError } from "../errors/app-error";
import { parseInput, PASSWORD_MAX_LENGTH, registerSchema, signInSchema } from ".";

const valid = {
  email: "  Ala@Example.PL ",
  password: "correct horse battery",
  accountName: " Firma ",
  displayName: "Ala K.",
};

describe("registerSchema", () => {
  it("normalises e-mail and trims names", () => {
    expect(parseInput(registerSchema, valid)).toEqual({
      email: "ala@example.pl",
      password: "correct horse battery",
      accountName: "Firma",
      displayName: "Ala K.",
    });
  });

  it.each([
    ["password", "short"],
    ["password", "x".repeat(PASSWORD_MAX_LENGTH + 1)],
    ["email", "not-an-email"],
    ["email", `${"a".repeat(250)}@x.pl`],
    ["accountName", "   "],
    ["displayName", "x".repeat(121)],
    ["displayName", 5],
  ])("rejects an invalid %s", (field, value) => {
    expect(() => parseInput(registerSchema, { ...valid, [field]: value })).toThrow(ValidationError);
  });

  it("rejects unknown fields", () => {
    expect(() => parseInput(registerSchema, { ...valid, isAdmin: true })).toThrow(ValidationError);
  });
});

describe("signInSchema", () => {
  it("accepts any non-empty password up to the maximum", () => {
    expect(parseInput(signInSchema, { email: "A@b.pl", password: "x" })).toEqual({ email: "a@b.pl", password: "x" });
  });

  it("rejects an empty or oversized password", () => {
    expect(() => parseInput(signInSchema, { email: "a@b.pl", password: "" })).toThrow(ValidationError);
    expect(() => parseInput(signInSchema, { email: "a@b.pl", password: "x".repeat(129) })).toThrow(ValidationError);
  });
});

describe("parseInput", () => {
  it("reports messages per field and no values", () => {
    try {
      parseInput(registerSchema, { ...valid, password: "tooshort" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const { fieldErrors, message } = error as ValidationError;
      expect(fieldErrors.password).toEqual(["Hasło musi mieć co najmniej 12 znaków."]);
      expect(JSON.stringify({ fieldErrors, message })).not.toContain("tooshort");
    }
  });
});
