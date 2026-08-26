import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://kbrukwhrsbcaobugmmnz.supabase.co'
const supabaseKey = 'sb_publishable_GZOurnYoEZ3xGR7U9-HQuA_R9015MFC';
const supabase = createClient(supabaseUrl, supabaseKey);

let result = await supabase
  .from('measures')
  .select(`address, temperature, device_type, measured_at`)
  .eq('device_type', 'indoor')
  .order('measured_at', { ascending: false })
  .limit(1);
console.log(result.data, result.error);

result = await supabase
  .from('measures')
  .select('*')
  .eq('device_type', 'outdoor')
  .order('measured_at', { ascending: false })
  .limit(1);

console.log(result.data, result.error);

