import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterOutfits,
  matchesOutfitFilters,
  type FilterableOutfit,
} from "./filters.ts";

function outfit(
  partial: Partial<FilterableOutfit> & Pick<FilterableOutfit, "tags">,
): FilterableOutfit {
  return {
    heartRating: 3,
    visibility: "private",
    status: "ready",
    ...partial,
  };
}

describe("matchesOutfitFilters", () => {
  it("uses OR inside a category and AND across categories", () => {
    const matching = outfit({
      tags: ["hot", "smart"],
      heartRating: 4,
    });
    const missingOccasion = outfit({
      tags: ["hot", "casual"],
      heartRating: 5,
    });
    const missingWeather = outfit({
      tags: ["cold", "work"],
      heartRating: 5,
    });
    const lowHearts = outfit({
      tags: ["rainy", "work"],
      heartRating: 3,
    });

    const filters = {
      weatherTags: ["hot", "rainy"] as const,
      occasionTags: ["smart", "work"] as const,
      minHearts: 4,
    };

    assert.equal(matchesOutfitFilters(matching, filters), true);
    assert.equal(matchesOutfitFilters(missingOccasion, filters), false);
    assert.equal(matchesOutfitFilters(missingWeather, filters), false);
    assert.equal(matchesOutfitFilters(lowHearts, filters), false);
  });

  it("filters visibility and status when set", () => {
    const publicReady = outfit({
      tags: ["mild"],
      visibility: "public",
      status: "ready",
    });
    const privateReady = outfit({
      tags: ["mild"],
      visibility: "private",
      status: "ready",
    });
    const publicPending = outfit({
      tags: ["mild"],
      visibility: "public",
      status: "pending_review",
    });

    assert.deepEqual(
      filterOutfits([publicReady, privateReady, publicPending], {
        visibility: "public",
        status: "ready",
      }),
      [publicReady],
    );
  });

  it("treats any-weather as a match for a weather filter", () => {
    const anyWeather = outfit({
      tags: ["any", "smart"],
      heartRating: 4,
    });

    assert.equal(
      matchesOutfitFilters(anyWeather, {
        weatherTags: ["hot", "rainy"],
        occasionTags: ["smart"],
        minHearts: 4,
      }),
      true,
    );
  });

  it("ignores empty category selections", () => {
    const item = outfit({ tags: ["cool", "lounge"], heartRating: 2 });
    assert.equal(matchesOutfitFilters(item, { weatherTags: [], minHearts: 2 }), true);
  });
});
