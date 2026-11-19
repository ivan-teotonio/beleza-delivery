/**
 * Formatação de dinheiro, datas e textos.
 *
 * Todas as funções de data usam métodos nativos de Date no fuso local do
 * dispositivo. Em Pernambuco (UTC-3) o fuso local coincide com o de São Paulo,
 * então não é necessário conversão de fuso.
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

function asDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
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

/** Retorna a data (YYYY-MM-DD) de hoje no fuso local do dispositivo. */
export function hojeSP(): string {
  const d = new Date();
  console.log('[DEBUG hojeSP] new Date():', d.toISOString(), 'getDate():', d.getDate(), 'getMonth():', d.getMonth());
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Soma dias a uma chave YYYY-MM-DD. */
export function addDaysKey(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() + days);
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
}

/** Converte uma chave YYYY-MM-DD em um Date no início do dia (fuso local). */
export function startOfDaySP(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = asDate(value);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = asDate(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return `${formatDate(value)} às ${formatTime(value)}`;
}

export function weekdayShort(value: string | Date): string {
  const d = asDate(value);
  return WEEKDAYS_SHORT[d.getDay()];
}

export function formatDayLong(value: string | Date): string {
  const d = asDate(value);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export function formatDayShort(value: string | Date): string {
  const d = asDate(value);
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function monthShort(value: string | Date): string {
  const d = asDate(value);
  return MONTHS[d.getMonth()].slice(0, 3);
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
