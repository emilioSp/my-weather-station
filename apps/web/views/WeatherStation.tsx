import { CurrentReadings } from '#components/weather-station/CurrentReadings.tsx';
import { MeasurementHistory } from '#components/weather-station/MeasurementHistory.tsx';
import { WeatherStationHeader } from '#components/weather-station/WeatherStationHeader.tsx';
import {
  WeatherStationError,
  WeatherStationLoading,
} from '#components/weather-station/WeatherStationStatus.tsx';
import { useWeatherStation } from '#hooks/useWeatherStation.ts';

export const WeatherStation = () => {
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
        onRefresh={refreshMeasures}
      />
      <div className="pt-4">
        <CurrentReadings
          indoor={currentMeasures.indoor}
          outdoor={currentMeasures.outdoor}
        />
        <MeasurementHistory
          error={measureHistory?.error ?? null}
          indoorMeasures={indoorMeasures}
          isLoading={measureHistory === null}
          outdoorMeasures={outdoorMeasures}
          range={currentRange}
          rangeIndex={rangeIndex}
          onRangeIndexChange={changeRange}
        />
      </div>
    </main>
  );
};
