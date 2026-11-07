import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveWeatherTags, type WeatherObservation } from "./weather.ts";

function observation(
  partial: Partial<WeatherObservation> & Pick<WeatherObservation, "temperatureC">,
): WeatherObservation {
  return {
    precipitationMm: 0,
    windSpeedKmh: 0,
    humidityPercent: 40,
    weatherCode: 0,
    ...partial,
  };
}

describe("deriveWeatherTags", () => {
  it("maps temperature bands", () => {
    assert.deepEqual(deriveWeatherTags(observation({ temperatureC: 28 })), [
      "hot",
    ]);
    assert.deepEqual(deriveWeatherTags(observation({ temperatureC: 22 })), [
      "warm",
    ]);
    assert.deepEqual(deriveWeatherTags(observation({ temperatureC: 14 })), [
      "mild",
    ]);
    assert.deepEqual(deriveWeatherTags(observation({ temperatureC: 5 })), [
      "cool",
    ]);
    assert.deepEqual(deriveWeatherTags(observation({ temperatureC: 4.9 })), [
      "cold",
    ]);
  });

  it("adds rainy and snowy from weather codes and precipitation", () => {
    assert.deepEqual(
      deriveWeatherTags(
        observation({ temperatureC: 3, weatherCode: 61, precipitationMm: 0 }),
      ),
      ["cold", "rainy"],
    );
    assert.deepEqual(
      deriveWeatherTags(
        observation({ temperatureC: 3, weatherCode: 71, precipitationMm: 2 }),
      ),
      ["cold", "snowy"],
    );
    assert.deepEqual(
      deriveWeatherTags(
        observation({ temperatureC: 10, weatherCode: 0, precipitationMm: 1 }),
      ),
      ["cool", "rainy"],
    );
  });

  it("combines cold and rainy", () => {
    assert.deepEqual(
      deriveWeatherTags(
        observation({
          temperatureC: 1,
          weatherCode: 63,
          precipitationMm: 4,
          windSpeedKmh: 10,
        }),
      ),
      ["cold", "rainy"],
    );
  });

  it("adds windy at 40 km/h and humid for hot sticky air", () => {
    assert.deepEqual(
      deriveWeatherTags(
        observation({ temperatureC: 16, windSpeedKmh: 40 }),
      ),
      ["mild", "windy"],
    );
    assert.deepEqual(
      deriveWeatherTags(
        observation({
          temperatureC: 24,
          humidityPercent: 75,
          windSpeedKmh: 5,
        }),
      ),
      ["warm", "humid"],
    );
    assert.deepEqual(
      deriveWeatherTags(
        observation({
          temperatureC: 21.9,
          humidityPercent: 90,
        }),
      ),
      ["mild"],
    );
  });
});
