import { describe, expect, it } from "vitest";
import {
  applyEconomyDrift,
  applyTradeToEconomy,
  createEconomyState,
  generateDynamicMarket,
  recordPriceHistory
} from "../src/game/Economy";
import { generateUniverse } from "../src/game/Universe";

describe("Economy", () => {
  it("applies deterministic economy drift", () => {
    const systems = generateUniverse(22);
    const state = createEconomyState(systems);

    expect(applyEconomyDrift(state, systems, 22)).toEqual(applyEconomyDrift(state, systems, 22));
  });

  it("records price history for each market commodity", () => {
    const systems = generateUniverse(22);
    const state = createEconomyState(systems);
    const market = generateDynamicMarket(systems[0], state);
    const next = recordPriceHistory(state, systems[0].id, market);

    expect(next.priceHistory).toHaveLength(market.length);
    expect(next.priceHistory[0]).toMatchObject({
      day: 0,
      systemId: systems[0].id,
      commodityId: market[0].id,
      price: market[0].price
    });
  });

  it("updates supply and price pressure after a purchase", () => {
    const systems = generateUniverse(22);
    const state = createEconomyState(systems);
    const before = generateDynamicMarket(systems[0], state).find((item) => item.id === "grain");
    const next = applyTradeToEconomy(state, systems[0].id, "grain", -1);
    const after = generateDynamicMarket(systems[0], next).find((item) => item.id === "grain");

    expect(before).toBeDefined();
    expect(after).toBeDefined();
    expect(after?.quantity).toBeLessThan(before?.quantity ?? 0);
    expect(after?.price).toBeGreaterThanOrEqual(before?.price ?? 0);
  });
});
