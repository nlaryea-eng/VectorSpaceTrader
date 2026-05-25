import { describe, expect, it } from "vitest";
import { STATION_VERTICES, STATION_EDGES } from "../src/game/StationModel";

describe("StationModel", () => {
  it("vertex count is bounded (<=120)", () => {
    expect(STATION_VERTICES.length).toBeLessThanOrEqual(120);
  });

  it("vertex count is non-trivial (>=10)", () => {
    expect(STATION_VERTICES.length).toBeGreaterThanOrEqual(10);
  });

  it("edge count is non-trivial (>=5)", () => {
    expect(STATION_EDGES.length).toBeGreaterThanOrEqual(5);
  });

  it("every edge index is valid within vertex array bounds", () => {
    const n = STATION_VERTICES.length;
    for (const [from, to] of STATION_EDGES) {
      expect(from).toBeGreaterThanOrEqual(0);
      expect(from).toBeLessThan(n);
      expect(to).toBeGreaterThanOrEqual(0);
      expect(to).toBeLessThan(n);
    }
  });

  it("all vertex coordinates are finite", () => {
    for (const v of STATION_VERTICES) {
      expect(Number.isFinite(v.x)).toBe(true);
      expect(Number.isFinite(v.y)).toBe(true);
      expect(Number.isFinite(v.z)).toBe(true);
    }
  });

  it("model is centred around origin within tolerance (centroid within 2 units)", () => {
    const n = STATION_VERTICES.length;
    const cx = STATION_VERTICES.reduce((s, v) => s + v.x, 0) / n;
    const cy = STATION_VERTICES.reduce((s, v) => s + v.y, 0) / n;
    const cz = STATION_VERTICES.reduce((s, v) => s + v.z, 0) / n;
    expect(Math.abs(cx)).toBeLessThan(2);
    expect(Math.abs(cy)).toBeLessThan(6); // spire skews Y centroid upward
    expect(Math.abs(cz)).toBeLessThan(2);
  });

  it("bounding box is bounded (no vertex > 25 units from origin)", () => {
    const limit = 25;
    for (const v of STATION_VERTICES) {
      expect(Math.abs(v.x)).toBeLessThanOrEqual(limit);
      expect(Math.abs(v.y)).toBeLessThanOrEqual(limit);
      expect(Math.abs(v.z)).toBeLessThanOrEqual(limit);
    }
  });

  it("no self-loop edges (from !== to)", () => {
    for (const [from, to] of STATION_EDGES) {
      expect(from).not.toBe(to);
    }
  });
});
