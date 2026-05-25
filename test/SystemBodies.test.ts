import { describe, expect, it } from "vitest";
import { computeBodies } from "../src/game/SystemBodies";
import { generateUniverse } from "../src/game/Universe";

const GAME_SEED = 492017;

describe("SystemBodies", () => {
  it("is deterministic for the same system and seed", () => {
    const a = computeBodies(5, 5 * 31337);
    const b = computeBodies(5, 5 * 31337);
    expect(a.length).toBe(b.length);
    a.forEach((bodyA, i) => {
      const bodyB = b[i];
      expect(bodyA.kind).toBe(bodyB.kind);
      expect(bodyA.position).toEqual(bodyB.position);
      expect(bodyA.vertices.length).toBe(bodyB.vertices.length);
      expect(bodyA.edges.length).toBe(bodyB.edges.length);
    });
  });

  it("produces stable differences between different systems", () => {
    const sys3 = computeBodies(3, 3 * 31337);
    const sys7 = computeBodies(7, 7 * 31337);
    const posA = sys3[0].position;
    const posB = sys7[0].position;
    const samePos = posA.x === posB.x && posA.y === posB.y && posA.z === posB.z;
    expect(samePos).toBe(false);
  });

  it("always returns at least one body (sun) and at most 4 (sun + 3 planets)", () => {
    for (let id = 0; id < 20; id++) {
      const bodies = computeBodies(id, id * 31337);
      expect(bodies.length).toBeGreaterThanOrEqual(2);
      expect(bodies.length).toBeLessThanOrEqual(4);
    }
  });

  it("first body is always the sun", () => {
    for (let id = 0; id < 10; id++) {
      const bodies = computeBodies(id, id * 31337);
      expect(bodies[0].kind).toBe("sun");
    }
  });

  it("remaining bodies are planets", () => {
    for (let id = 0; id < 10; id++) {
      const bodies = computeBodies(id, id * 31337);
      bodies.slice(1).forEach(b => expect(b.kind).toBe("planet"));
    }
  });

  it("vertex count per body is bounded (<=14 sun, <=6 planet)", () => {
    for (let id = 0; id < 20; id++) {
      const bodies = computeBodies(id, id * 31337);
      bodies.forEach(body => {
        if (body.kind === "sun") {
          expect(body.vertices.length).toBeLessThanOrEqual(14);
        } else {
          expect(body.vertices.length).toBeLessThanOrEqual(6);
        }
      });
    }
  });

  it("all body positions have finite coordinates", () => {
    for (let id = 0; id < 30; id++) {
      const bodies = computeBodies(id, id * 31337);
      bodies.forEach(body => {
        expect(Number.isFinite(body.position.x)).toBe(true);
        expect(Number.isFinite(body.position.y)).toBe(true);
        expect(Number.isFinite(body.position.z)).toBe(true);
      });
    }
  });

  it("all vertices have finite coordinates — no NaN or Infinity", () => {
    for (let id = 0; id < 20; id++) {
      const bodies = computeBodies(id, id * 31337);
      bodies.forEach(body => {
        body.vertices.forEach(v => {
          expect(Number.isFinite(v.x)).toBe(true);
          expect(Number.isFinite(v.y)).toBe(true);
          expect(Number.isFinite(v.z)).toBe(true);
        });
      });
    }
  });

  it("all edge indices are valid for the vertex array", () => {
    for (let id = 0; id < 20; id++) {
      const bodies = computeBodies(id, id * 31337);
      bodies.forEach(body => {
        body.edges.forEach(([from, to]) => {
          expect(from).toBeGreaterThanOrEqual(0);
          expect(from).toBeLessThan(body.vertices.length);
          expect(to).toBeGreaterThanOrEqual(0);
          expect(to).toBeLessThan(body.vertices.length);
        });
      });
    }
  });

  it("bodies are positioned far from the station (z < -80) — no collision with station at z=62", () => {
    for (let id = 0; id < 20; id++) {
      const bodies = computeBodies(id, id * 31337);
      bodies.forEach(body => {
        expect(body.position.z).toBeLessThan(-80);
      });
    }
  });

  it("does not alter universe system IDs or names", () => {
    const systems = generateUniverse(GAME_SEED);
    const before = systems.map(s => ({ id: s.id, name: s.name }));
    // computeBodies must not touch universe state
    for (let id = 0; id < systems.length; id++) {
      computeBodies(id, id * 31337);
    }
    const after = systems.map(s => ({ id: s.id, name: s.name }));
    expect(before).toEqual(after);
  });
});
