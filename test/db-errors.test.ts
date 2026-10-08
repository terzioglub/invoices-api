import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "../src/lib/db-errors.js";

describe("isUniqueViolation", () => {
  it("detects Postgres unique violations", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
