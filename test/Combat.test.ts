import { describe, expect, it } from "vitest";
import { applyDamage, createEnemyShip } from "../src/game/Combat";

describe("Combat", () => {
  it("destroys an enemy when damage exceeds shield and hull", () => {
    const enemy = createEnemyShip();
    const damaged = applyDamage(enemy, enemy.maxShield + enemy.maxHull + 1);

    expect(damaged.hull).toBe(0);
    expect(damaged.alive).toBe(false);
  });
});
