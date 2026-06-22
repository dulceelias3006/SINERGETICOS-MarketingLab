import { createClient } from '@supabase/supabase-js';

export const sb = createClient(
  'https://hhisyrrhuclyqvicsuca.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoaXN5cnJodWNseXF2aWNzdWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTkyNDMsImV4cCI6MjA5MzA3NTI0M30.a_eSZGujtxdPV4uWfVeAFXI2cNn2icE1PQuC_f077Fg'
);

export async function dbGet(key) {
  const { data } = await sb.from('app_data').select('value').eq('key', key).maybeSingle();
  return data?.value ?? null;
}

export async function dbSet(key, value) {
  await sb.from('app_data').upsert({ key, value, updated_at: new Date().toISOString() });
}

let _subSeq = 0;
export function dbSub(key, callback) {
  return sb.channel(`ch_${key}_${++_subSeq}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_data', filter: 'key=eq.' + key },
      p => { if (p.new?.value !== undefined) callback(p.new.value); })
    .subscribe();
}
