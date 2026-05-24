import { describe, expect, it } from "vitest";
import { getPriceTrend } from "../src/game/Economy";

describe("getPriceTrend", () => {
  it("returns rising for a significant price increase", () => {
    const trend = getPriceTrend(100, 115);
    expect(trend.symbol).toBe("▲");
    expect(trend.label).toBe("rising");
    expect(trend.delta).toBe(15);
  });

  it("returns falling for a significant price decrease", () => {
    const trend = getPriceTrend(100, 85);
    expect(trend.symbol).toBe("▼");
    expect(trend.label).toBe("falling");
    expect(trend.delta).toBe(-15);
  });

  it("returns stable for a small price change under 3%", () => {
    const trend = getPriceTrend(100, 102);
    expect(trend.symbol).toBe("—");
    expect(trend.label).toBe("stable");
  });

  it("returns stable for no price change", () => {
    const trend = getPriceTrend(100, 100);
    expect(trend.symbol).toBe("—");
    expect(trend.label).toBe("stable");
  });

  it("returns unknown when previous price is undefined", () => {
    const trend = getPriceTrend(undefined, 100);
    expect(trend.symbol).toBe("—");
    expect(trend.label).toBe("unknown");
    expect(trend.delta).toBe(0);
  });

  it("returns unknown when previous price is zero", () => {
    const trend = getPriceTrend(0, 100);
    expect(trend.symbol).toBe("—");
    expect(trend.label).toBe("unknown");
  });

  it("rounds delta to nearest integer percent", () => {
    const trend = getPriceTrend(100, 112);
    expect(trend.delta).toBe(12);
  });

  it("treats exactly 3% change as not stable", () => {
    const trend = getPriceTrend(100, 103);
    expect(trend.label).toBe("rising");
  });
});
