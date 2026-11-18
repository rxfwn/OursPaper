const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function maskDateInput(text) {
  const digits = text.replace(/[^0-9]/g, '').slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export function parseDateInput(text) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text || '');
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (date.getMonth() !== month - 1) return null;
  return date;
}

export function formatDateForInput(ts) {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

export function formatDateDisplay(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function daysBetweenInclusive(startTs, endTs) {
  const start = new Date(startTs);
  start.setHours(12, 0, 0, 0);
  const end = new Date(endTs);
  end.setHours(12, 0, 0, 0);
  const diff = Math.round((end.getTime() - start.getTime()) / ONE_DAY_MS);
  return diff >= 0 ? diff + 1 : null;
}

export function addDays(ts, count) {
  return ts + count * ONE_DAY_MS;
}
