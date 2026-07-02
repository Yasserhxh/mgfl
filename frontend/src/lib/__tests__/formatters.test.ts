import { describe, expect, it } from "vitest";
import { kg, mad } from "../api";

/**
 * The "fr-MA" group separator differs between ICU builds (narrow no-break
 * space in browsers, "." in some Node builds). Assertions must not depend on
 * it: `digits` strips every grouping character and keeps digits + the decimal
 * comma, which fr-MA uses consistently everywhere.
 */
const digits = (s: string) => s.replace(/[^\d,]/g, "");

describe("mad", () => {
  it("formats amounts in Moroccan dirhams with two decimals", () => {
    const s = mad(1234.5);
    expect(s).toContain("MAD");
    expect(digits(s)).toBe("1234,50");
  });

  it("formats zero", () => {
    const s = mad(0);
    expect(s).toContain("MAD");
    expect(digits(s)).toBe("0,00");
  });
});

describe("kg", () => {
  it("formats weights with the kg suffix and up to three decimals", () => {
    const s = kg(2500.125);
    expect(s.endsWith(" kg")).toBe(true);
    expect(digits(s)).toBe("2500,125");
  });

  it("does not pad integers with decimals", () => {
    const s = kg(3000);
    expect(s.endsWith(" kg")).toBe(true);
    expect(digits(s)).toBe("3000");
  });
});
