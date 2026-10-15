// Consulta diaria (Vercel Cron) para que Supabase no pause el proyecto por inactividad.
import { sb } from '../src/lib/supabase.js';

export default async function handler(req, res) {
  const { error } = await sb.from('app_data').select('key').limit(1);
  res.status(error ? 502 : 200).json({ ok: !error, error: error?.message ?? null, at: new Date().toISOString() });
}
