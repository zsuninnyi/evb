import {
  ANY_WEATHER_TAG,
  isWeatherTagSlug,
  type OccasionTagSlug,
  type TagSlug,
  type WeatherTagSlug,
} from "./tags.ts";

export type RankableOutfit = {
  id: string;
  heartRating: number;
  createdAt: Date;
  tags: readonly TagSlug[];
};

export type RankedOutfit<T extends RankableOutfit> = T & {
  matchingWeatherTagCount: number;
};

function weatherOverlap(
  outfitTags: readonly TagSlug[],
  activeWeatherTags: readonly WeatherTagSlug[],
): number {
  const active = new Set(activeWeatherTags);
  let count = 0;
  for (const tag of outfitTags) {
    if (isWeatherTagSlug(tag) && active.has(tag)) {
      count += 1;
    }
  }
  return count;
}

function isAnyWeather(tags: readonly TagSlug[]): boolean {
  return tags.includes(ANY_WEATHER_TAG);
}

/**
 * Keeps outfits that share at least one weather tag with today, or that are
 * tagged any-weather. Any-weather does not add to the match count, so a
 * specific match still ranks ahead of it. Then higher hearts, then newer.
 */
export function rankOutfits<T extends RankableOutfit>(
  outfits: readonly T[],
  activeWeatherTags: readonly WeatherTagSlug[],
  options: { occasion?: OccasionTagSlug } = {},
): RankedOutfit<T>[] {
  const ranked: RankedOutfit<T>[] = [];

  for (const outfit of outfits) {
    if (options.occasion && !outfit.tags.includes(options.occasion)) {
      continue;
    }

    const matchingWeatherTagCount = weatherOverlap(
      outfit.tags,
      activeWeatherTags,
    );
    const anyWeather = isAnyWeather(outfit.tags);
    if (
      matchingWeatherTagCount === 0 &&
      !(anyWeather && activeWeatherTags.length > 0)
    ) {
      continue;
    }

    ranked.push({ ...outfit, matchingWeatherTagCount });
  }

  ranked.sort((a, b) => {
    if (b.matchingWeatherTagCount !== a.matchingWeatherTagCount) {
      return b.matchingWeatherTagCount - a.matchingWeatherTagCount;
    }
    if (b.heartRating !== a.heartRating) {
      return b.heartRating - a.heartRating;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return ranked;
}
