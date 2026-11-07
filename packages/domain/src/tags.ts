export const TAG_CATEGORIES = ["weather", "occasion"] as const;

export type TagCategory = (typeof TAG_CATEGORIES)[number];

export const WEATHER_TAG_SLUGS = [
  "hot",
  "warm",
  "mild",
  "cool",
  "cold",
  "rainy",
  "snowy",
  "windy",
  "humid",
  "any",
] as const;

export const OCCASION_TAG_SLUGS = [
  "casual",
  "smart",
  "elegant",
  "sporty",
  "work",
  "formal",
  "outdoor",
  "party",
  "lounge",
] as const;

export type WeatherTagSlug = (typeof WEATHER_TAG_SLUGS)[number];
export type OccasionTagSlug = (typeof OCCASION_TAG_SLUGS)[number];

/** Wearer does not mind the weather. Matches every derived day and every weather filter. */
export const ANY_WEATHER_TAG = "any" as const satisfies WeatherTagSlug;
export type TagSlug = WeatherTagSlug | OccasionTagSlug;

export type TagDefinition = {
  slug: TagSlug;
  label: string;
  category: TagCategory;
};

export const tagCatalog: readonly TagDefinition[] = [
  { slug: "hot", label: "Hot", category: "weather" },
  { slug: "warm", label: "Warm", category: "weather" },
  { slug: "mild", label: "Mild", category: "weather" },
  { slug: "cool", label: "Cool", category: "weather" },
  { slug: "cold", label: "Cold", category: "weather" },
  { slug: "rainy", label: "Rainy", category: "weather" },
  { slug: "snowy", label: "Snowy", category: "weather" },
  { slug: "windy", label: "Windy", category: "weather" },
  { slug: "humid", label: "Humid", category: "weather" },
  { slug: "any", label: "Any weather", category: "weather" },
  { slug: "casual", label: "Casual", category: "occasion" },
  { slug: "smart", label: "Smart", category: "occasion" },
  { slug: "elegant", label: "Elegant", category: "occasion" },
  { slug: "sporty", label: "Sporty", category: "occasion" },
  { slug: "work", label: "Work", category: "occasion" },
  { slug: "formal", label: "Formal", category: "occasion" },
  { slug: "outdoor", label: "Outdoor", category: "occasion" },
  { slug: "party", label: "Party", category: "occasion" },
  { slug: "lounge", label: "Lounge", category: "occasion" },
] as const;

const weatherSlugSet = new Set<string>(WEATHER_TAG_SLUGS);
const occasionSlugSet = new Set<string>(OCCASION_TAG_SLUGS);
const catalogBySlug = new Map(
  tagCatalog.map((tag) => [tag.slug, tag] as const),
);

export function isWeatherTagSlug(slug: string): slug is WeatherTagSlug {
  return weatherSlugSet.has(slug);
}

export function isOccasionTagSlug(slug: string): slug is OccasionTagSlug {
  return occasionSlugSet.has(slug);
}

export function isTagSlug(slug: string): slug is TagSlug {
  return catalogBySlug.has(slug as TagSlug);
}

export function getTag(slug: TagSlug): TagDefinition {
  const tag = catalogBySlug.get(slug);
  if (!tag) {
    throw new Error(`Unknown tag slug: ${slug}`);
  }
  return tag;
}

export function weatherTagsOf(tags: readonly TagSlug[]): WeatherTagSlug[] {
  return tags.filter(isWeatherTagSlug);
}

export function occasionTagsOf(tags: readonly TagSlug[]): OccasionTagSlug[] {
  return tags.filter(isOccasionTagSlug);
}
