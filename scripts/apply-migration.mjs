/**
 * Aplica uma migração SQL versionada no projeto Supabase via Management API.
 *
 * Uso:
 *   node scripts/apply-migration.mjs supabase/migrations/20261108000100_base_perfis.sql
 *
 * Requer o arquivo com o Personal Access Token em:
 *   %USERPROFILE%\.config\opencode\supabase-access-token
 * ou a variável SUPABASE_ACCESS_TOKEN.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

const REF = process.env.SUPABASE_PROJECT_REF ?? 'jzcrdhebrgjgdpynwbdj';
const tokenFile =
  process.env.SUPABASE_TOKEN_FILE ?? join(homedir(), '.config', 'opencode', 'supabase-access-token');
const token = (process.env.SUPABASE_ACCESS_TOKEN ?? readFileSync(tokenFile, 'utf8')).trim();

const file = process.argv[2];
if (!file) {
  console.error('Informe o caminho da migração.');
  process.exit(1);
}

const query = readFileSync(file, 'utf8');
const name = basename(file).replace(/\.sql$/i, '').replace(/^\d+_/, '');

const res = await fetch(
  `https://api.supabase.com/v1/projects/${REF}/database/migrations`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, query }),
  },
);

const body = await res.text();
if (!res.ok) {
  console.error(`Falha (${res.status}):`, body);
  process.exit(1);
}
console.log(`Migração aplicada: ${name}`);
console.log(body);
