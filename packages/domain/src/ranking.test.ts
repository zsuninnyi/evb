import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankOutfits, type RankableOutfit } from "./ranking.ts";

function outfit(
  partial: Partial<RankableOutfit> & Pick<RankableOutfit, "id" | "tags">,
): RankableOutfit {
  return {
    heartRating: 3,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...partial,
  };
}

describe("rankOutfits", () => {
  it("orders by overlapping weather tags, then hearts, then newer", () => {
    const older = outfit({
      id: "one-tag-high-hearts",
      tags: ["cold"],
      heartRating: 5,
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    const betterMatch = outfit({
      id: "two-tag-lower-hearts",
      tags: ["cold", "rainy", "casual"],
      heartRating: 3,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const newerSameScore = outfit({
      id: "one-tag-same-hearts-newer",
      tags: ["cold"],
      heartRating: 5,
      createdAt: new Date("2026-01-03T00:00:00.000Z"),
    });
    const noMatch = outfit({
      id: "warm-only",
      tags: ["warm"],
      heartRating: 5,
    });

    const ranked = rankOutfits([older, betterMatch, newerSameScore, noMatch], [
      "cold",
      "rainy",
    ]);

    assert.deepEqual(
      ranked.map((item) => item.id),
      ["two-tag-lower-hearts", "one-tag-same-hearts-newer", "one-tag-high-hearts"],
    );
    assert.equal(ranked[0]?.matchingWeatherTagCount, 2);
  });

  it("includes any-weather outfits after specific matches", () => {
    const specific = outfit({
      id: "cold",
      tags: ["cold"],
      heartRating: 1,
    });
    const anyWeather = outfit({
      id: "any",
      tags: ["any", "work"],
      heartRating: 5,
    });

    const ranked = rankOutfits([anyWeather, specific], ["cold", "rainy"]);

    assert.deepEqual(
      ranked.map((item) => item.id),
      ["cold", "any"],
    );
    assert.equal(ranked[1]?.matchingWeatherTagCount, 0);
  });

  it("optionally narrows by a single occasion tag", () => {
    const work = outfit({
      id: "work",
      tags: ["cold", "work"],
    });
    const sporty = outfit({
      id: "sporty",
      tags: ["cold", "sporty"],
    });

    const ranked = rankOutfits([work, sporty], ["cold"], {
      occasion: "work",
    });

    assert.deepEqual(
      ranked.map((item) => item.id),
      ["work"],
    );
  });
});
