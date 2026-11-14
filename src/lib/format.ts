/**
 * Formatação de dinheiro, datas e textos.
 *
 * Datas de negócio estão em UTC (timestamptz) e são exibidas no fuso de
 * São Paulo (UTC-3, sem horário de verão desde 2019). Todas as funções de
 * data usam Intl.DateTimeFormat com timeZone America/Sao_Paulo para garantir
 * o dia/hora correto independentemente do fuso do dispositivo.
 */

export function formatBRL(centavos: number | null | undefined): string {
  const valor = Number.isFinite(centavos) ? Number(centavos) : 0;
  const negativo = valor < 0;
  const absoluto = Math.abs(Math.round(centavos ?? 0));
  const inteiro = Math.floor(absoluto / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavosTxt = (absoluto % 100).toString().padStart(2, '0');
  return `${negativo ? '-' : ''}R$ ${inteiro},${centavosTxt}`;
}

export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || !Number.isFinite(Number(km))) return '—';
  return `${Number(km).toFixed(1).replace('.', ',')} km`;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

export function formatCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export function formatCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.replace(/(\d{5})(\d)/, '$1-$2');
}

export function parseMoneyToCents(text: string): number {
  const digits = onlyDigits(text);
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

export function centsToInput(centavos: number): string {
  return (Math.round(centavos) / 100).toFixed(2).replace('.', ',');
}

const SP_TZ = 'America/Sao_Paulo';

function spFormat(
  date: Date,
  opts: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SP_TZ, ...opts }).format(
    date,
  );
}

function spParts(date: Date): {
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
  weekday: number;
  month: number;
} {
  const y = Number(spFormat(date, { year: 'numeric' }));
  const m = Number(spFormat(date, { month: '2-digit' }));
  const d = Number(spFormat(date, { day: '2-digit' }));
  const h = Number(spFormat(date, { hour: '2-digit', hour12: false }));
  const min = Number(spFormat(date, { minute: '2-digit' }));
  // weekday em pt-BR para mapear para o array em português
  const wd = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SP_TZ,
    weekday: 'short',
  }).format(date);
  const weekdayMap: Record<string, number> = {
    dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sáb: 6,
  };
  const weekday = weekdayMap[wd] ?? 0;
  return { y, m, d, h, min, weekday, month: m };
}

/** Retorna a data (YYYY-MM-DD) de hoje em São Paulo. */
export function hojeSP(): string {
  try {
    return new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    const now = new Date();
    const spMs = now.getTime() - 3 * 60 * 60 * 1000;
    const d = new Date(spMs);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

/** Soma dias a uma chave YYYY-MM-DD (sem sofrer com fuso). */
export function addDaysKey(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-${String(base.getUTCDate()).padStart(2, '0')}`;
}

/** Converte uma chave YYYY-MM-DD em um Date no início do dia em São Paulo (UTC-3). */
export function startOfDaySP(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0));
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    const p = spParts(asDate(value));
    return `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${p.y}`;
  } catch {
    const d = new Date(asDate(value).getTime() - 3 * 60 * 60 * 1000);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  }
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    const p = spParts(asDate(value));
    return `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
  } catch {
    const d = new Date(asDate(value).getTime() - 3 * 60 * 60 * 1000);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  }
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return `${formatDate(value)} às ${formatTime(value)}`;
}

const WEEKDAYS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export function weekdayShort(value: string | Date): string {
  try {
    const p = spParts(asDate(value));
    return WEEKDAYS_SHORT[p.weekday];
  } catch {
    const d = new Date(asDate(value).getTime() - 3 * 60 * 60 * 1000);
    return WEEKDAYS_SHORT[d.getUTCDay()];
  }
}

export function formatDayLong(value: string | Date): string {
  try {
    const p = spParts(asDate(value));
    return `${WEEKDAYS[p.weekday]}, ${p.d} de ${MONTHS[p.month - 1]}`;
  } catch {
    const d = new Date(asDate(value).getTime() - 3 * 60 * 60 * 1000);
    return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
  }
}

export function formatDayShort(value: string | Date): string {
  try {
    const p = spParts(asDate(value));
    return `${WEEKDAYS_SHORT[p.weekday]}, ${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}`;
  } catch {
    const d = new Date(asDate(value).getTime() - 3 * 60 * 60 * 1000);
    return `${WEEKDAYS_SHORT[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
}

export function monthShort(value: string | Date): string {
  try {
    const p = spParts(asDate(value));
    return MONTHS[p.month - 1].slice(0, 3);
  } catch {
    const d = new Date(asDate(value).getTime() - 3 * 60 * 60 * 1000);
    return MONTHS[d.getUTCMonth()].slice(0, 3);
  }
}

/** Converte uma chave YYYY-MM-DD em um Date no início do dia em São Paulo (UTC-3). */
export function startOfDaySPFromKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0));
}

function asDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function horasAte(value: string | Date): number {
  return (asDate(value).getTime() - Date.now()) / 3_600_000;
}

export function prazoResposta(value: string | Date): string {
  const horas = horasAte(value);
  if (horas <= 0) return 'Prazo encerrado';
  if (horas < 1) return `Vence em ${Math.max(1, Math.round(horas * 60))} min`;
  if (horas < 24) return `Vence em ${Math.round(horas)} h`;
  return `Vence em ${Math.round(horas / 24)} dia(s)`;
}

export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? '').trim().split(/\s+/)[0] || 'Usuário';
}

export function iniciais(nome: string | null | undefined): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export function pluralizar(total: number, singular: string, plural: string): string {
  return total === 1 ? singular : plural;
}
