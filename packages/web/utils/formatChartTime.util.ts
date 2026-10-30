// Format chart timestamps into date and time labels for dashboard charts.
export const formatChartTime = (measuredAt: number): [string, string] => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(measuredAt));

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return [`${getPart('day')} ${getPart('month')}`, `${getPart('hour')}:${getPart('minute')}`];
};
