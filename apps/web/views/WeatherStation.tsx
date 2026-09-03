import * as React from 'react';
import { CurrentReadings } from '#components/weather-station/CurrentReadings.tsx';
import { MeasurementHistory } from '#components/weather-station/MeasurementHistory.tsx';
import { WeatherStationHeader } from '#components/weather-station/WeatherStationHeader.tsx';
import {
  WeatherStationError,
  WeatherStationLoading,
} from '#components/weather-station/WeatherStationStatus.tsx';
import { useWeatherStation } from '#hooks/useWeatherStation.ts';
import {
  isTemperatureUnit,
  TEMPERATURE_UNITS,
  type TemperatureUnit,
} from '#utils/temperature-unit.util.ts';

const temperatureUnitStorageKey = 'temperature-unit';

const getSavedTemperatureUnit = (): TemperatureUnit => {
  try {
    const savedUnit = window.localStorage.getItem(temperatureUnitStorageKey);
    return isTemperatureUnit(savedUnit)
      ? savedUnit
      : TEMPERATURE_UNITS.CELSIUS;
  } catch {
    return TEMPERATURE_UNITS.CELSIUS;
  }
};

export const WeatherStation = () => {
  const [temperatureUnit, setTemperatureUnit] = React.useState<TemperatureUnit>(
    getSavedTemperatureUnit,
  );
  const {
    currentMeasures,
    currentRange,
    indoorMeasures,
    isRefreshing,
    latestMeasuredAt,
    measureHistory,
    outdoorMeasures,
    rangeIndex,
    refreshMeasures,
    changeRange,
  } = useWeatherStation();

  React.useEffect(() => {
    try {
      window.localStorage.setItem(temperatureUnitStorageKey, temperatureUnit);
    } catch {}
  }, [temperatureUnit]);

  if (currentMeasures === null) {
    return <WeatherStationLoading />;
  }

  if (currentMeasures.error !== null) {
    return <WeatherStationError message={currentMeasures.error} />;
  }

  return (
    <main className="mx-auto max-w-[1440px] px-3 pt-[22px] pb-12 sm:px-[clamp(20px,4vw,64px)]">
      <WeatherStationHeader
        isRefreshing={isRefreshing}
        latestMeasuredAt={latestMeasuredAt}
        temperatureUnit={temperatureUnit}
        onRefresh={refreshMeasures}
        onTemperatureUnitChange={setTemperatureUnit}
      />
      <div className="pt-4">
        <CurrentReadings
          indoor={currentMeasures.indoor}
          outdoor={currentMeasures.outdoor}
          temperatureUnit={temperatureUnit}
        />
        <MeasurementHistory
          error={measureHistory?.error ?? null}
          indoorMeasures={indoorMeasures}
          isLoading={measureHistory === null}
          outdoorMeasures={outdoorMeasures}
          range={currentRange}
          rangeIndex={rangeIndex}
          temperatureUnit={temperatureUnit}
          onRangeIndexChange={changeRange}
        />
      </div>
    </main>
  );
};
