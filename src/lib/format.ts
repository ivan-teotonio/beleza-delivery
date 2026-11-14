/**
 * Formatação de dinheiro, datas e textos.
 *
 * Datas de negócio estão em UTC (timestamptz) e são exibidas no fuso de
 * São Paulo (UTC-3, sem horário de verão desde 2019). O fallback manual evita
 * dependência de ICU completo no Hermes.
 */

const TZ_OFFSET_MS = -3 * 60 * 60 * 1000;

export function formatBRL(centavos: number | null | undefined): string {
  const valor = Number.isFinite(centavos) ? Number(centavos) : 0;
  const negativo = valor < 0;
  const absoluto = Math.abs(Math.round(valor));
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

function shifted(date: Date): Date {
  return new Date(date.getTime() + TZ_OFFSET_MS);
}

function asDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function dayKeySP(value: string | Date): string {
  const d = asDate(value);
  // Se for a data atual (sem horário específico), usa Intl para garantir o fuso de São Paulo
  if (value instanceof Date || typeof value === 'string') {
    const isToday = !value.toString().includes('T') && typeof value === 'string';
    if (isToday || value instanceof Date) {
      try {
        return new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(d);
      } catch {
        // fallback abaixo
      }
    }
  }
  const sd = shifted(d);
  const y = sd.getUTCFullYear();
  const m = String(sd.getUTCMonth() + 1).padStart(2, '0');
  const day = String(sd.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = shifted(asDate(value));
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = shifted(asDate(value));
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
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
  return WEEKDAYS_SHORT[shifted(asDate(value)).getUTCDay()];
}

export function formatDayLong(value: string | Date): string {
  const d = shifted(asDate(value));
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}

export function formatDayShort(value: string | Date): string {
  const d = shifted(asDate(value));
  return `${WEEKDAYS_SHORT[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthShort(value: string | Date): string {
  const d = shifted(asDate(value));
  return MONTHS[d.getUTCMonth()].slice(0, 3);
}

/** Retorna a data (YYYY-MM-DD) de hoje em São Paulo. */
export function hojeSP(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return dayKeySP(new Date());
  }
}

/** Soma dias a uma chave YYYY-MM-DD (sem sofrer com fuso). */
export function addDaysKey(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-${String(base.getUTCDate()).padStart(2, '0')}`;
}

/** Converte uma chave YYYY-MM-DD em um Date no início do dia em São Paulo (UTC). */
export function startOfDaySP(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0));
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
