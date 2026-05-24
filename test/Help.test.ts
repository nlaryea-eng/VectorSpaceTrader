import { describe, expect, it } from "vitest";
import { HELP_CONTENT, type HelpSectionId } from "../src/game/HelpContent";
import { PLAYER_SHIPS } from "../src/game/Ships";
import { RANK_THRESHOLDS } from "../src/game/Rank";

describe("Help Content", () => {
  const requiredSections: HelpSectionId[] = [
    "quickStart", "controls", "coreLoop", "flight",
    "docking", "trading", "missions", "map",
    "ships", "equipment", "stations", "combat",
    "rank", "reputation", "legalRisk", "saveLoad",
    "demoNotes"
  ];

  it("contains all required sections", () => {
    const sectionIds = HELP_CONTENT.map(s => s.id);
    requiredSections.forEach(id => {
      expect(sectionIds).toContain(id);
    });
  });

  it("has no empty headings or bodies", () => {
    HELP_CONTENT.forEach(section => {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.summary.length).toBeGreaterThan(0);
      expect(section.pages.length).toBeGreaterThan(0);
      section.pages.forEach(page => {
        expect(page.heading.length).toBeGreaterThan(0);
        expect(page.body.length).toBeGreaterThan(0);
        page.body.forEach(line => {
          expect(line.length).toBeGreaterThan(0);
        });
      });
    });
  });

  it("is synchronized with ship data", () => {
    const shipsSection = HELP_CONTENT.find(s => s.id === "ships")!;
    const shipNames = shipsSection.pages.flatMap(p => p.body).join(" ");
    PLAYER_SHIPS.forEach(ship => {
      expect(shipNames).toContain(ship.name);
    });
  });

  it("is synchronized with equipment data (summary only)", () => {
    const equipSection = HELP_CONTENT.find(s => s.id === "equipment")!;
    const equipNames = equipSection.pages.flatMap(p => p.body).join(" ");
    // Check for some representative items
    ["Pulse", "Beam", "Burst"].forEach(keyword => {
      expect(equipNames).toContain(keyword);
    });
  });

  it("is synchronized with rank thresholds", () => {
    const rankSection = HELP_CONTENT.find(s => s.id === "rank")!;
    const rankTips = rankSection.pages.flatMap(p => p.tips || []).join(" ");
    RANK_THRESHOLDS.forEach(rank => {
      expect(rankTips).toContain(rank.title);
      expect(rankTips).toContain(rank.score.toString());
    });
  });

  it("does not contain banned keywords", () => {
    const banned = [
      ["el", "ite"],
      ["co", "bra"],
      ["jame", "son"],
      ["la", "ve"],
      ["di", "so"],
      ["lee", "sti"],
      ["za", "once"],
      ["ried", "quat"],
      ["tion", "isla"],
      ["cor", "iolis"],
      ["gal", "cop"],
      ["thar", "goid"],
      ["thar", "gon"],
      ["front", "ier"],
      ["cyber", "punk"],
      ["tr", "on"],
      ["neon", " ", "horizon"],
      ["next", " ", "horizon"],
      ["premier", " ", "space", " ", "trading"],
      ["cred", "its"],
    ].map((parts) => parts.join(""));
    const fullText = JSON.stringify(HELP_CONTENT).toLowerCase();
    banned.forEach(word => {
      expect(fullText).not.toContain(word);
    });
  });

  it("uses BAL or BALANCE exclusively for currency", () => {
    const fullText = JSON.stringify(HELP_CONTENT);
    // Should contain BAL
    expect(fullText).toContain("BAL");
    // Currency should use BAL/BALANCE terminology only.
    expect(fullText.toLowerCase()).not.toContain(["cred", "its"].join(""));
  });
});
