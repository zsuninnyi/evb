import {
  ANY_WEATHER_TAG,
  isOccasionTagSlug,
  isWeatherTagSlug,
  type OccasionTagSlug,
  type TagSlug,
  type WeatherTagSlug,
} from "./tags.ts";
import type { OutfitStatus } from "./status.ts";

export type OutfitVisibility = "private" | "public";

export type FilterableOutfit = {
  heartRating: number;
  visibility: OutfitVisibility;
  status: OutfitStatus;
  tags: readonly TagSlug[];
};

export type OutfitListFilters = {
  weatherTags?: readonly WeatherTagSlug[];
  occasionTags?: readonly OccasionTagSlug[];
  minHearts?: number;
  visibility?: OutfitVisibility | "all";
  status?: OutfitStatus | "all";
};

function hasAny(
  outfitTags: readonly TagSlug[],
  selected: readonly TagSlug[],
): boolean {
  const owned = new Set(outfitTags);
  return selected.some((tag) => owned.has(tag));
}

/**
 * Library and Discover filters: OR inside a tag category, AND across
 * categories. Heart rating is a minimum. Empty category selections are ignored.
 */
export function matchesOutfitFilters(
  outfit: FilterableOutfit,
  filters: OutfitListFilters,
): boolean {
  const weatherTags = filters.weatherTags ?? [];
  const matchesWeather =
    weatherTags.length === 0 ||
    outfit.tags.includes(ANY_WEATHER_TAG) ||
    hasAny(outfit.tags, weatherTags);
  if (!matchesWeather) {
    return false;
  }

  const occasionTags = filters.occasionTags ?? [];
  if (occasionTags.length > 0 && !hasAny(outfit.tags, occasionTags)) {
    return false;
  }

  if (
    filters.minHearts !== undefined &&
    outfit.heartRating < filters.minHearts
  ) {
    return false;
  }

  if (
    filters.visibility !== undefined &&
    filters.visibility !== "all" &&
    outfit.visibility !== filters.visibility
  ) {
    return false;
  }

  if (
    filters.status !== undefined &&
    filters.status !== "all" &&
    outfit.status !== filters.status
  ) {
    return false;
  }

  return true;
}

export function filterOutfits<T extends FilterableOutfit>(
  outfits: readonly T[],
  filters: OutfitListFilters,
): T[] {
  return outfits.filter((outfit) => matchesOutfitFilters(outfit, filters));
}

export function partitionSelectedTags(tags: readonly TagSlug[]): {
  weatherTags: WeatherTagSlug[];
  occasionTags: OccasionTagSlug[];
} {
  return {
    weatherTags: tags.filter(isWeatherTagSlug),
    occasionTags: tags.filter(isOccasionTagSlug),
  };
}
