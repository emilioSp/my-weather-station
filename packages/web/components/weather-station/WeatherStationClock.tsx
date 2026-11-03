// Render WeatherStationClock when displaying the current time in the dashboard header.

import * as React from 'react';

import { formatClockTime } from '#utils/formatClockTime.util.ts';

export const WeatherStationClock = () => {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1_000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <p
      data-testid="current-time"
      className="hidden place-self-center text-[clamp(44px,7vw,76px)] leading-[0.85] font-semibold tracking-[-0.09em] sm:block"
    >
      {formatClockTime(now)}
    </p>
  );
};
