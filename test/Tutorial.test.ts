import { describe, expect, it } from "vitest";

import {
  advanceTutorial,
  COMPLETE_TUTORIAL_STAGE,
  getActiveTutorialHint,
  getTutorialEventForFlightProgress,
  INITIAL_TUTORIAL_STAGE,
  type TutorialEvent,
  type TutorialState,
} from "../src/game/Tutorial";

describe("First-flight tutorial reducer", () => {
  it("advances through the required sequence in order", () => {
    const events: TutorialEvent[] = [
      "beginFlight",
      "stationOriented",
      "docked",
      "marketOpened",
      "commodityBought",
      "mapOpened",
      "jumped",
      "cargoSold",
    ];
    const expected = [
      "orientStation",
      "dock",
      "openMarket",
      "buyCommodity",
      "openMap",
      "jumpNearby",
      "sellCargo",
      "complete",
    ];
    let state: TutorialState = { stage: INITIAL_TUTORIAL_STAGE };

    events.forEach((event, index) => {
      state = advanceTutorial(state, event);
      expect(state.stage).toBe(expected[index]);
    });
  });

  it("does not skip ahead on out-of-order events", () => {
    let state: TutorialState = { stage: INITIAL_TUTORIAL_STAGE };
    state = advanceTutorial(state, "commodityBought");
    expect(state.stage).toBe(INITIAL_TUTORIAL_STAGE);

    state = advanceTutorial(state, "beginFlight");
    state = advanceTutorial(state, "mapOpened");
    expect(state.stage).toBe("orientStation");
  });

  it("keeps completion sticky", () => {
    const complete: TutorialState = { stage: COMPLETE_TUTORIAL_STAGE };
    expect(advanceTutorial(complete, "beginFlight")).toBe(complete);
    expect(advanceTutorial(complete, "cargoSold")).toBe(complete);
  });

  it("returns concise hints only while active", () => {
    expect(getActiveTutorialHint({ stage: "openMap" })).toContain("map");
    expect(getActiveTutorialHint({ stage: COMPLETE_TUTORIAL_STAGE })).toBeNull();
  });
});

describe("First-flight station orientation progress", () => {
  it("advances when the station is meaningfully ahead", () => {
    expect(getTutorialEventForFlightProgress(
      { x: 0, y: 0, z: 0 },
      { pitch: 0, yaw: 0, roll: 0 },
      { x: 0, y: 0, z: 180 },
      { x: 0, y: 0, z: 0 },
    )).toBe("stationOriented");
  });

  it("uses flight movement as a safe fallback", () => {
    expect(getTutorialEventForFlightProgress(
      { x: 100, y: 0, z: 0 },
      { pitch: 0, yaw: Math.PI, roll: 0 },
      { x: 0, y: 0, z: 180 },
      { x: 0, y: 0, z: 0 },
    )).toBe("flightProgress");
  });

  it("waits when neither facing nor movement progress is present", () => {
    expect(getTutorialEventForFlightProgress(
      { x: 10, y: 0, z: 0 },
      { pitch: 0, yaw: Math.PI, roll: 0 },
      { x: 0, y: 0, z: 180 },
      { x: 0, y: 0, z: 0 },
    )).toBeNull();
  });
});
