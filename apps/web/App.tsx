import type { Measure } from '@wx/shared';
import { useEffect, useState } from 'react';
import {
  getLatestIndoorMeasure,
  getLatestOutdoorMeasure,
  type IndoorMeasure,
} from '#supabase.api.ts';

type QueryState<TRow> = {
  rows: TRow[];
  error: string | null;
};

const describe = <TRow,>(state: QueryState<TRow> | null): string => {
  if (state === null) {
    return 'Loading...';
  }

  if (state.error !== null) {
    return `Error: ${state.error}`;
  }

  return JSON.stringify(state.rows, null, 2);
};

export const App = () => {
  const [indoor, setIndoor] = useState<QueryState<IndoorMeasure> | null>(null);
  const [outdoor, setOutdoor] = useState<QueryState<Measure> | null>(null);

  useEffect(() => {
    const readMeasures = async () => {
      const indoorResult = await getLatestIndoorMeasure();
      setIndoor({
        rows: indoorResult.rows,
        error: indoorResult.error?.message ?? null,
      });

      const outdoorResult = await getLatestOutdoorMeasure();
      setOutdoor({
        rows: outdoorResult.rows,
        error: outdoorResult.error?.message ?? null,
      });
    };

    void readMeasures();
  }, []);

  return (
    <main>
      <h1>My Weather Station</h1>
      <h2>Indoor</h2>
      <pre>{describe(indoor)}</pre>
      <h2>Outdoor</h2>
      <pre>{describe(outdoor)}</pre>
    </main>
  );
};
