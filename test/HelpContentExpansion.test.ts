import { describe, expect, it } from "vitest";
import { HELP_CONTENT } from "../src/game/HelpContent";

describe("Pilot Manual Content", () => {
  it("has meaningful content in all sections", () => {
    HELP_CONTENT.forEach(section => {
      expect(section.pages.length).toBeGreaterThan(0);
      section.pages.forEach(page => {
        expect(page.heading.length).toBeGreaterThan(3);
        expect(page.body.length).toBeGreaterThan(0);
        page.body.forEach(line => {
          expect(line.length).toBeGreaterThan(10);
        });
      });
    });
  });

  it("mentions key concepts in respective sections", () => {
    const missionSection = HELP_CONTENT.find(s => s.id === "missions")!;
    const missionText = JSON.stringify(missionSection);
    expect(missionText).toContain("deterministic");
    expect(missionText).toContain("route-validated");
    expect(missionText).toContain("snapshot");

    const mapSection = HELP_CONTENT.find(s => s.id === "map")!;
    const mapText = JSON.stringify(mapSection);
    expect(mapText).toContain("HAZ");
    expect(mapText).toContain("ECO");
    expect(mapText).toContain("DISC");
    expect(mapText).toContain("SVC");
    expect(mapText).toContain("CLASS");
    expect(mapText).toContain("lightly shape market stock");
    expect(mapText).not.toContain("hidden");

    const reputationSection = HELP_CONTENT.find(s => s.id === "reputation")!;
    expect(JSON.stringify(reputationSection)).toContain("Trusted");

    const equipmentSection = HELP_CONTENT.find(s => s.id === "equipment")!;
    expect(JSON.stringify(equipmentSection)).toContain("categories");

    const tradingSection = HELP_CONTENT.find(s => s.id === "trading")!;
    const tradingText = JSON.stringify(tradingSection);
    expect(tradingText).toContain("BUY");
    expect(tradingText).toContain("SELL");
    expect(tradingText).toContain("spread");
    expect(tradingText).toContain("SURPLUS");
    expect(tradingText).toContain("fuel costs");
  });

  it("does not contain banned terms (compliance)", () => {
    const banned = ["eli" + "te", "cob" + "ra", "jam" + "eson", "cre" + "dits", "fron" + "tier"];
    const allText = JSON.stringify(HELP_CONTENT).toLowerCase();
    banned.forEach(term => {
      expect(allText).not.toContain(term);
    });
  });
});
