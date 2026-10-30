// Select an existing meter color theme for dashboard cards and chart sections.
export type MeterTheme = {
  themeClassName: string;
  chartColor: string;
};

const meterThemes: MeterTheme[] = [
  { themeClassName: 'meter-theme-garden', chartColor: '#b9e53b' },
  { themeClassName: 'meter-theme-kitchen', chartColor: '#83d2e5' },
  { themeClassName: 'meter-theme-living-room', chartColor: '#f0a46a' },
  { themeClassName: 'meter-theme-bedroom', chartColor: '#c9a7ef' },
];

export const getMeterTheme = (colorIndex: number): MeterTheme =>
  meterThemes[colorIndex] ?? meterThemes[0];
