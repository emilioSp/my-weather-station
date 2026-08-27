type CalculateDewPointInput = {
  temperature: number;
  humidity: number;
};

export const calculateDewPoint = ({
  temperature,
  humidity,
}: CalculateDewPointInput): number => {
  // Source: https://www.npl.co.uk/resources/q-a/dew-point-and-relative-humidity
  const magnusValue =
    Math.log(humidity / 100) + (17.62 * temperature) / (243.12 + temperature);
  const dewPoint = (243.12 * magnusValue) / (17.62 - magnusValue);

  return Number(dewPoint.toFixed(1));
};
