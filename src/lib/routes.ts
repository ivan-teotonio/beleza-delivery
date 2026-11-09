import type { TipoConta } from './types';

export type RotaInicial =
  | '/inicio'
  | '/agendamentos'
  | '/solicitacoes'
  | '/agenda'
  | '/servicos'
  | '/aprovacoes'
  | '/auditoria'
  | '/perfil';

/** Rota inicial de cada perfil após login/abertura do app. */
export function rotaInicial(tipo: TipoConta | null, precisaOnboarding: boolean): RotaInicial {
  if (tipo === 'admin') return '/aprovacoes';
  if (tipo === 'profissional') return '/solicitacoes';
  return '/inicio';
}

export function rotaCadastro(tipo: 'cliente' | 'profissional') {
  return `/cadastro?tipo=${tipo}` as const;
}

/** Link externo de mapa para o endereço confirmado (RF25). */
export function linkMapa(lat: number | null | undefined, lng: number | null | undefined, rotulo?: string) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  const consulta = rotulo?.trim()
    ? `${rotulo.trim()}@${lat},${lng}`
    : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}
