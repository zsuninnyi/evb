import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OCCASION_TAG_SLUGS,
  TAG_CATEGORIES,
  tagCatalog,
  WEATHER_TAG_SLUGS,
} from "./tags.ts";

describe("tagCatalog", () => {
  it("contains the product weather and occasion slugs exactly once", () => {
    const slugs = tagCatalog.map((tag) => tag.slug);
    assert.deepEqual(
      slugs.filter((slug) =>
        (WEATHER_TAG_SLUGS as readonly string[]).includes(slug),
      ),
      [...WEATHER_TAG_SLUGS],
    );
    assert.deepEqual(
      slugs.filter((slug) =>
        (OCCASION_TAG_SLUGS as readonly string[]).includes(slug),
      ),
      [...OCCASION_TAG_SLUGS],
    );
    assert.equal(new Set(slugs).size, slugs.length);
  });

  it("only uses known categories", () => {
    for (const tag of tagCatalog) {
      assert.ok((TAG_CATEGORIES as readonly string[]).includes(tag.category));
    }
  });
});
