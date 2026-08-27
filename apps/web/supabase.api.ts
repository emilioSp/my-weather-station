import { createClient } from '@supabase/supabase-js';
import { type Measure, toCamelCaseKeys } from '@wx/shared';
import { environment } from '#environment.ts';

const supabase = createClient(
  environment.VITE_SUPABASE_URL,
  environment.VITE_SUPABASE_PUBLISHABLE_KEY,
);

export type IndoorMeasure = Pick<
  Measure,
  'address' | 'temperature' | 'deviceType' | 'measuredAt'
>;

export const getLatestIndoorMeasure = async () => {
  const { data, error } = await supabase
    .from('measures')
    .select('address, temperature, device_type, measured_at')
    .eq('device_type', 'indoor')
    .order('measured_at', { ascending: false })
    .limit(1);

  return { rows: toCamelCaseKeys<IndoorMeasure[]>(data), error };
};

export const getLatestOutdoorMeasure = async () => {
  const { data, error } = await supabase
    .from('measures')
    .select('*')
    .eq('device_type', 'outdoor')
    .order('measured_at', { ascending: false })
    .limit(1);

  return { rows: toCamelCaseKeys<Measure[]>(data), error };
};
