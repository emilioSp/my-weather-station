// Format Celsius temperatures with one decimal place for dashboard cards and readouts.
export const formatTemperature = (celsius: number): string => `${celsius.toFixed(1)}°C`;
