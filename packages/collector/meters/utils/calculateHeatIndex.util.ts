// Calculate heat index from temperature and humidity during meter decoding.

type GetHumidityAdjustmentInput = {
  temperatureFahrenheit: number;
  humidity: number;
};

const getHumidityAdjustment = ({
  temperatureFahrenheit,
  humidity,
}: GetHumidityAdjustmentInput): number => {
  if (humidity < 13 && temperatureFahrenheit >= 80 && temperatureFahrenheit <= 112) {
    return -((13 - humidity) / 4) * Math.sqrt((17 - Math.abs(temperatureFahrenheit - 95)) / 17);
  }

  if (humidity > 85 && temperatureFahrenheit >= 80 && temperatureFahrenheit <= 87) {
    return ((humidity - 85) / 10) * ((87 - temperatureFahrenheit) / 5);
  }

  return 0;
};

type GetHeatIndexFahrenheitInput = {
  temperatureFahrenheit: number;
  humidity: number;
};

const getHeatIndexFahrenheit = ({
  temperatureFahrenheit,
  humidity,
}: GetHeatIndexFahrenheitInput): number => {
  // Source: https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
  const simpleHeatIndex =
    0.5 * (temperatureFahrenheit + 61 + (temperatureFahrenheit - 68) * 1.2 + humidity * 0.094);

  const initialHeatIndex = (simpleHeatIndex + temperatureFahrenheit) / 2;

  if (initialHeatIndex < 80) return initialHeatIndex;

  const regressionHeatIndex =
    -42.379 +
    2.04901523 * temperatureFahrenheit +
    10.14333127 * humidity -
    0.22475541 * temperatureFahrenheit * humidity -
    0.00683783 * temperatureFahrenheit ** 2 -
    0.05481717 * humidity ** 2 +
    0.00122874 * temperatureFahrenheit ** 2 * humidity +
    0.00085282 * temperatureFahrenheit * humidity ** 2 -
    0.00000199 * temperatureFahrenheit ** 2 * humidity ** 2;

  return regressionHeatIndex + getHumidityAdjustment({ temperatureFahrenheit, humidity });
};

type CalculateHeatIndexInput = {
  temperature: number;
  humidity: number;
};

export const calculateHeatIndex = ({ temperature, humidity }: CalculateHeatIndexInput): number => {
  const heatIndexFahrenheit = getHeatIndexFahrenheit({
    temperatureFahrenheit: (temperature * 9) / 5 + 32,
    humidity,
  });

  return Number((((heatIndexFahrenheit - 32) * 5) / 9).toFixed(1));
};
