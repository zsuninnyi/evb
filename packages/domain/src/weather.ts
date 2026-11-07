import type { WeatherTagSlug } from "./tags.ts";

export type WeatherObservation = {
  temperatureC: number;
  /** Precipitation amount in mm. */
  precipitationMm: number;
  /** Wind speed in km/h. */
  windSpeedKmh: number;
  /** Relative humidity percent, 0–100. */
  humidityPercent: number;
  /** WMO weather interpretation code from Open-Meteo. */
  weatherCode: number;
};

/** WMO codes that mean rain, drizzle, showers, or thunderstorm. */
const RAIN_WEATHER_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
]);

/** WMO codes that mean snow fall, snow grains, or snow showers. */
const SNOW_WEATHER_CODES = new Set([71, 73, 75, 77, 85, 86]);

export function isRainWeatherCode(code: number): boolean {
  return RAIN_WEATHER_CODES.has(code);
}

export function isSnowWeatherCode(code: number): boolean {
  return SNOW_WEATHER_CODES.has(code);
}

function temperatureTag(temperatureC: number): WeatherTagSlug {
  if (temperatureC >= 28) {
    return "hot";
  }
  if (temperatureC >= 22) {
    return "warm";
  }
  if (temperatureC >= 14) {
    return "mild";
  }
  if (temperatureC >= 5) {
    return "cool";
  }
  return "cold";
}

/**
 * Derives catalog weather tags from a current observation.
 * Temperature contributes exactly one tag. Rain, snow, wind, and humidity
 * may add more. Snow codes do not also become rainy via precipitation alone.
 */
export function deriveWeatherTags(
  observation: WeatherObservation,
): WeatherTagSlug[] {
  const tags: WeatherTagSlug[] = [temperatureTag(observation.temperatureC)];
  const snowy = isSnowWeatherCode(observation.weatherCode);
  const rainy =
    isRainWeatherCode(observation.weatherCode) ||
    (observation.precipitationMm > 0 && !snowy);

  if (rainy) {
    tags.push("rainy");
  }
  if (snowy) {
    tags.push("snowy");
  }
  if (observation.windSpeedKmh >= 40) {
    tags.push("windy");
  }
  if (
    observation.humidityPercent >= 75 &&
    observation.temperatureC >= 22
  ) {
    tags.push("humid");
  }

  return tags;
}
