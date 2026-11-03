// Format the current time for the dashboard clock using Rome time.
export const formatClockTime = (date: Date): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
