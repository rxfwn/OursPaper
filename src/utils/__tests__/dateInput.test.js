import {
  maskDateInput,
  parseDateInput,
  formatDateForInput,
  daysBetweenInclusive,
  addDays,
} from '../dateInput';

describe('maskDateInput', () => {
  it('inserts slashes as digits accumulate', () => {
    expect(maskDateInput('1')).toBe('1');
    expect(maskDateInput('12')).toBe('12');
    expect(maskDateInput('123')).toBe('12/3');
    expect(maskDateInput('1208')).toBe('12/08');
    expect(maskDateInput('12082026')).toBe('12/08/2026');
  });

  it('strips non-digit characters and caps at 8 digits', () => {
    expect(maskDateInput('12/08/2026extra')).toBe('12/08/2026');
  });
});

describe('parseDateInput', () => {
  it('parses a valid DD/MM/YYYY string', () => {
    const date = parseDateInput('12/08/2026');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7); // 0-indexed
    expect(date.getDate()).toBe(12);
  });

  it('rejects malformed or out-of-range dates', () => {
    expect(parseDateInput('')).toBeNull();
    expect(parseDateInput('12/2026')).toBeNull();
    expect(parseDateInput('32/01/2026')).toBeNull();
    expect(parseDateInput('12/13/2026')).toBeNull();
    expect(parseDateInput('30/02/2026')).toBeNull(); // Feb never has 30 days
  });
});

describe('formatDateForInput', () => {
  it('formats a timestamp back into DD/MM/YYYY', () => {
    const ts = new Date(2026, 7, 12, 12, 0, 0).getTime();
    expect(formatDateForInput(ts)).toBe('12/08/2026');
  });
});

describe('daysBetweenInclusive', () => {
  it('counts a single day as 1', () => {
    const day = new Date(2026, 7, 12).getTime();
    expect(daysBetweenInclusive(day, day)).toBe(1);
  });

  it('counts an inclusive range', () => {
    const start = new Date(2026, 7, 12).getTime();
    const end = new Date(2026, 7, 15).getTime();
    expect(daysBetweenInclusive(start, end)).toBe(4);
  });

  it('returns null when the end is before the start', () => {
    const start = new Date(2026, 7, 15).getTime();
    const end = new Date(2026, 7, 12).getTime();
    expect(daysBetweenInclusive(start, end)).toBeNull();
  });
});

describe('addDays', () => {
  it('advances a timestamp by the given number of days', () => {
    const start = new Date(2026, 7, 12).getTime();
    const result = new Date(addDays(start, 3));
    expect(result.getDate()).toBe(15);
  });
});
