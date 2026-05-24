import { describe, expect, it } from "vitest";

import { getHelpSectionForMode, searchHelpContent } from "../src/game/HelpContent";

describe("Signal Glass manual search and contextual help", () => {
  it("maps core screens to contextual manual topics", () => {
    expect(getHelpSectionForMode("trade")).toBe("trading");
    expect(getHelpSectionForMode("missions")).toBe("missions");
    expect(getHelpSectionForMode("map")).toBe("map");
    expect(getHelpSectionForMode("equipment")).toBe("equipment");
    expect(getHelpSectionForMode("shipyard")).toBe("ships");
  });

  it("searches topic titles, body, and tips", () => {
    expect(searchHelpContent("fuel").map((section) => section.id)).toContain("flight");
    expect(searchHelpContent("contract").map((section) => section.id)).toContain("missions");
    expect(searchHelpContent("shipyard").map((section) => section.id)).toContain("ships");
  });

  it("returns all topics for an empty query", () => {
    expect(searchHelpContent("").length).toBeGreaterThan(8);
  });
});
