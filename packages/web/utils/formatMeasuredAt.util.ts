// Format measurement dates for the dashboard using Rome time.
export const formatMeasuredAt = (measuredAt: string): string =>
  Temporal.Instant.from(measuredAt)
    .toZonedDateTimeISO('Europe/Rome')
    .toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(',', ' ·');
