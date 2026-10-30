// Convert RSSI to a bounded signal percentage for sensor health displays.
export const getSignalPercentage = (signalPowerDBM: number): number =>
  Math.round(Math.max(0, Math.min(100, ((signalPowerDBM + 100) / 50) * 100)));
