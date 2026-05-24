import { describe, expect, it } from "vitest";
import { createMissionId, parseMissionId, isValidMissionId } from "../src/game/MissionIds";

describe("Mission IDs", () => {
  it("creates and parses versioned hex IDs", () => {
    const value = BigInt("0x0123456789abcdef");
    const id = createMissionId(4, value);
    expect(id).toBe("m4:0123456789abcdef");

    const parsed = parseMissionId(id);
    expect(parsed.version).toBe(4);
    expect(parsed.value).toBe(value);
  });

  it("validates ID format", () => {
    expect(isValidMissionId("m4:0123456789abcdef")).toBe(true);
    expect(isValidMissionId("m1:0000000000000000")).toBe(true);
    expect(isValidMissionId("4:0123456789abcdef")).toBe(false);
    expect(isValidMissionId("m4:0123456789abcde")).toBe(false); // too short
    expect(isValidMissionId("m4:0123456789abcdefg")).toBe(false); // too long
  });

  it("handles serialization to JSON correctly", () => {
    const id = createMissionId(1, 123n);
    const json = JSON.stringify({ id });
    expect(json).toBe('{"id":"m1:000000000000007b"}');
  });
});
