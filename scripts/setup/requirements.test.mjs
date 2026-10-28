import { describe, expect, it } from "vitest";

import { checkRequirements, parseMajor } from "./requirements.mjs";

describe("parseMajor", () => {
  it("reads the major version with or without the v prefix", () => {
    expect(parseMajor("24.1.0")).toBe(24);
    expect(parseMajor("v11.19.0")).toBe(11);
  });

  it("returns null when there is no version", () => {
    expect(parseMajor(null)).toBeNull();
    expect(parseMajor(undefined)).toBeNull();
    expect(parseMajor("abc")).toBeNull();
  });
});

describe("checkRequirements", () => {
  it("accepts Node 24 and npm 11 or newer", () => {
    expect(checkRequirements({ nodeVersion: "24.21.0", npmVersion: "11.19.0" })).toEqual([]);
    expect(checkRequirements({ nodeVersion: "24.0.0", npmVersion: "12.0.1" })).toEqual([]);
  });

  it.each(["23.9.0", "25.0.0", "18.0.0"])("rejects Node %s", (nodeVersion) => {
    const problems = checkRequirements({ nodeVersion, npmVersion: "11.0.0" });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`wykryto: ${nodeVersion}`);
  });

  it("reports a missing Node version", () => {
    expect(checkRequirements({ nodeVersion: null, npmVersion: "11.0.0" })[0]).toContain("wykryto: brak");
  });

  it("rejects npm older than 11", () => {
    const problems = checkRequirements({ nodeVersion: "24.0.0", npmVersion: "10.9.2" });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("10.9.2");
  });

  it("reports an unknown npm version", () => {
    const problems = checkRequirements({ nodeVersion: "24.0.0", npmVersion: null });
    expect(problems[0]).toContain("Nie udało się ustalić wersji npm");
  });

  it("reports every problem at once", () => {
    expect(checkRequirements({ nodeVersion: "20.0.0", npmVersion: "9.0.0" })).toHaveLength(2);
  });
});
