// Define chart range choices used by dashboard controls and history queries.
export const CHART_RANGES = {
  LAST_MONTH: 'LAST_MONTH',
  LAST_TWO_WEEKS: 'LAST_TWO_WEEKS',
  LAST_WEEK: 'LAST_WEEK',
  LAST_THREE_DAYS: 'LAST_THREE_DAYS',
  LAST_DAY: 'LAST_DAY',
  LAST_TWELVE_HOURS: 'LAST_TWELVE_HOURS',
  LAST_SIX_HOURS: 'LAST_SIX_HOURS',
} as const;

export const chartRanges = {
  [CHART_RANGES.LAST_MONTH]: { hours: 30 * 24, label: 'Last month' },
  [CHART_RANGES.LAST_TWO_WEEKS]: { hours: 14 * 24, label: 'Last 2 weeks' },
  [CHART_RANGES.LAST_WEEK]: { hours: 7 * 24, label: 'Last week' },
  [CHART_RANGES.LAST_THREE_DAYS]: { hours: 3 * 24, label: 'Last 3 days' },
  [CHART_RANGES.LAST_DAY]: { hours: 24, label: 'Last day' },
  [CHART_RANGES.LAST_TWELVE_HOURS]: { hours: 12, label: 'Last 12 hours' },
  [CHART_RANGES.LAST_SIX_HOURS]: { hours: 6, label: 'Last 6 hours' },
} as const;

export type ChartRangeKey = (typeof CHART_RANGES)[keyof typeof CHART_RANGES];

export type ChartRange = (typeof chartRanges)[ChartRangeKey];

export const chartRangeKeys = Object.values(CHART_RANGES);
