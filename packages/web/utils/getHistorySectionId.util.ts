// Build the history section anchor id shared by the weather cards and the history charts.

export const getHistorySectionId = (deviceName: string): string => `history-${deviceName}`;
