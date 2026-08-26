type CalculateHeatIndexInput = {
  temperature: number;
  humidity: number;
};

const toFahrenheit = (temperature: number): number => {
  return (temperature * 9) / 5 + 32;
};

const toCelsius = (temperature: number): number => {
  return ((temperature - 32) * 5) / 9;
};

export const calculateHeatIndex = ({
  temperature,
  humidity,
}: CalculateHeatIndexInput): number => {
  const temperatureFahrenheit = toFahrenheit(temperature);

  // Source: https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
  const simpleHeatIndex =
    0.5 *
    (temperatureFahrenheit +
      61 +
      (temperatureFahrenheit - 68) * 1.2 +
      humidity * 0.094);
  let heatIndexFahrenheit = (simpleHeatIndex + temperatureFahrenheit) / 2;

  if (heatIndexFahrenheit >= 80) {
    heatIndexFahrenheit =
      -42.379 +
      2.04901523 * temperatureFahrenheit +
      10.14333127 * humidity -
      0.22475541 * temperatureFahrenheit * humidity -
      0.00683783 * temperatureFahrenheit ** 2 -
      0.05481717 * humidity ** 2 +
      0.00122874 * temperatureFahrenheit ** 2 * humidity +
      0.00085282 * temperatureFahrenheit * humidity ** 2 -
      0.00000199 * temperatureFahrenheit ** 2 * humidity ** 2;

    if (
      humidity < 13 &&
      temperatureFahrenheit >= 80 &&
      temperatureFahrenheit <= 112
    ) {
      heatIndexFahrenheit -=
        ((13 - humidity) / 4) *
        Math.sqrt((17 - Math.abs(temperatureFahrenheit - 95)) / 17);
    } else if (
      humidity > 85 &&
      temperatureFahrenheit >= 80 &&
      temperatureFahrenheit <= 87
    ) {
      heatIndexFahrenheit +=
        ((humidity - 85) / 10) * ((87 - temperatureFahrenheit) / 5);
    }
  }

  return Number(toCelsius(heatIndexFahrenheit).toFixed(1));
};
