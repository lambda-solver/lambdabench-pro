/**
 * fixture-import.test.ts — Tests for the fixture-import utility.
 */
import { describe, expect, it } from "@effect/vitest";
import {
  fixtureNames,
  getFixture,
  leaderboardData,
} from "./fixture-import";

describe("fixture-import", () => {
  it("fixtureNames is a non-empty array", () => {
    expect(Array.isArray(fixtureNames)).toBe(true);
    expect(fixtureNames.length).toBeGreaterThan(0);
  });

  it("getFixture returns correct data for known names", () => {
    const perfectScore = getFixture("perfect-score");
    expect(perfectScore).toBeDefined();
    expect(perfectScore?.["name"]).toBe("perfect-score");
    expect(perfectScore?.["pct"]).toBe(100);

    const defaultLeaderboard = getFixture("Default Leaderboard");
    expect(defaultLeaderboard).toBeDefined();
    expect(defaultLeaderboard?.["name"]).toBe("Default Leaderboard");
    expect(defaultLeaderboard?.["data"]).toBeDefined();

    const iconButton = getFixture("icon-button");
    expect(iconButton).toBeDefined();
    expect(iconButton?.["name"]).toBe("icon-button");
    expect(iconButton?.["size"]).toBe("icon");
  });

  it("getFixture returns undefined for unknown names", () => {
    expect(getFixture("nonexistent-fixture")).toBeUndefined();
    expect(getFixture("")).toBeUndefined();
    expect(getFixture("   ")).toBeUndefined();
  });

  it("re-exports work — can import leaderboardData directly", () => {
    expect(leaderboardData).toBeDefined();
    expect(leaderboardData.rankings.length).toBeGreaterThan(0);
    expect(leaderboardData.tasks.length).toBeGreaterThan(0);
    expect(leaderboardData.categories.length).toBeGreaterThan(0);
  });
});
