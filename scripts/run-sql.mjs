/**
 * Executa um arquivo SQL avulso (seed, correções) no projeto Supabase.
 *
 * Uso:
 *   node scripts/run-sql.mjs supabase/seed.sql
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const REF = process.env.SUPABASE_PROJECT_REF ?? 'jzcrdhebrgjgdpynwbdj';
const tokenFile =
  process.env.SUPABASE_TOKEN_FILE ?? join(homedir(), '.config', 'opencode', 'supabase-access-token');
const token = (process.env.SUPABASE_ACCESS_TOKEN ?? readFileSync(tokenFile, 'utf8')).trim();

const file = process.argv[2];
if (!file) {
  console.error('Informe o caminho do arquivo SQL.');
  process.exit(1);
}

const query = readFileSync(file, 'utf8');
const res = await fetch(
  `https://api.supabase.com/v1/projects/${REF}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  },
);

const body = await res.text();
if (!res.ok) {
  console.error(`Falha (${res.status}):`, body);
  process.exit(1);
}
console.log(body);
