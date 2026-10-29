export {
  ANY_WEATHER_TAG,
  getTag,
  isOccasionTagSlug,
  isTagSlug,
  isWeatherTagSlug,
  OCCASION_TAG_SLUGS,
  occasionTagsOf,
  TAG_CATEGORIES,
  tagCatalog,
  WEATHER_TAG_SLUGS,
  weatherTagsOf,
  type OccasionTagSlug,
  type TagCategory,
  type TagDefinition,
  type TagSlug,
  type WeatherTagSlug,
} from "./tags.ts";

export {
  deriveWeatherTags,
  isRainWeatherCode,
  isSnowWeatherCode,
  type WeatherObservation,
} from "./weather.ts";

export {
  rankOutfits,
  type RankableOutfit,
  type RankedOutfit,
} from "./ranking.ts";

export {
  filterOutfits,
  matchesOutfitFilters,
  partitionSelectedTags,
  type FilterableOutfit,
  type OutfitListFilters,
  type OutfitVisibility,
} from "./filters.ts";

export {
  IllegalStatusTransitionError,
  isOutfitStatus,
  isTerminalOutfitStatus,
  OUTFIT_STATUSES,
  transition,
  type OutfitStatus,
  type OutfitStatusEvent,
} from "./status.ts";
