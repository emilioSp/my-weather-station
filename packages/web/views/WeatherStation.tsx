// Render WeatherStation when displaying the weather dashboard.

import { CurrentReadings } from '#components/weather-station/CurrentReadings.tsx';
import { MeasurementHistory } from '#components/weather-station/MeasurementHistory.tsx';
import { WeatherStationError } from '#components/weather-station/WeatherStationError.tsx';
import { WeatherStationHeader } from '#components/weather-station/WeatherStationHeader.tsx';
import { WeatherStationLoading } from '#components/weather-station/WeatherStationLoading.tsx';
import { useWeatherStation } from '#hooks/useWeatherStation.ts';

export const WeatherStation = () => {
  const {
    currentMeasurements,
    currentRange,
    isRefreshing,
    latestMeasuredAt,
    historyError,
    isHistoryLoading,
    measurementsByDeviceName,
    rangeIndex,
    refreshMeasurements,
    changeRange,
  } = useWeatherStation();

  return (
    <main className="mx-auto max-w-[1440px] px-3 pt-[22px] pb-12 sm:px-[clamp(20px,4vw,64px)]">
      <WeatherStationHeader
        isRefreshing={isRefreshing}
        latestMeasuredAt={currentMeasurements?.error === null ? latestMeasuredAt : null}
        onRefresh={refreshMeasurements}
      />
      <div className="pt-4">
        {currentMeasurements === null && <WeatherStationLoading />}
        {currentMeasurements?.error && <WeatherStationError message={currentMeasurements.error} />}
        {currentMeasurements?.error === null && (
          <>
            <CurrentReadings measurementsByDeviceName={currentMeasurements.byDeviceName} />
            <MeasurementHistory
              isRefreshing={isRefreshing}
              error={historyError}
              measurementsByDeviceName={measurementsByDeviceName}
              isLoading={isHistoryLoading}
              range={currentRange}
              rangeIndex={rangeIndex}
              onRangeIndexChange={changeRange}
            />
          </>
        )}
      </div>
    </main>
  );
};
