// Render WeatherStation when displaying the weather dashboard.

import { CurrentReadings } from '#components/weather-station/CurrentReadings.tsx';
import { MeasurementHistory } from '#components/weather-station/MeasurementHistory.tsx';
import { WeatherStationError } from '#components/weather-station/WeatherStationError.tsx';
import { WeatherStationHeader } from '#components/weather-station/WeatherStationHeader.tsx';
import { WeatherStationLoading } from '#components/weather-station/WeatherStationLoading.tsx';
import { useWeatherStation } from '#hooks/useWeatherStation.ts';

export const WeatherStation = () => {
  const {
    currentMeasures,
    currentRange,
    isRefreshing,
    latestMeasuredAt,
    measureHistory,
    measuresByDeviceName,
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
        <CurrentReadings measuresByDeviceName={currentMeasures.byDeviceName} />
        <MeasurementHistory
          error={measureHistory?.error ?? null}
          measuresByDeviceName={measuresByDeviceName}
          isLoading={measureHistory === null}
          range={currentRange}
          rangeIndex={rangeIndex}
          onRangeIndexChange={changeRange}
        />
      </div>
    </main>
  );
};
