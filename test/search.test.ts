import { describe, expect, it } from "vitest";
import { containsPattern } from "../src/lib/search.js";

describe("containsPattern", () => {
  it("wraps the term for a partial match", () => {
    expect(containsPattern("northwind")).toBe("%northwind%");
  });

  it("matches LIKE wildcards literally", () => {
    expect(containsPattern("50%_off")).toBe("%50\\%\\_off%");
    expect(containsPattern("a\\b")).toBe("%a\\\\b%");
  });
});
