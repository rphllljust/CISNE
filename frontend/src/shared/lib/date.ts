import { format, formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = parseDate(value);

  if (!date) {
    return '-';
  }

  return format(date, "dd/MM/yyyy 'at' HH:mm", { locale: enUS });
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = parseDate(value);

  if (!date) {
    return '-';
  }

  return format(date, 'dd/MM/yyyy', { locale: enUS });
}

export function formatRelative(value: string | Date | null | undefined): string {
  const date = parseDate(value);

  if (!date) {
    return '-';
  }

  return formatDistanceToNow(date, { addSuffix: true, locale: enUS });
}
