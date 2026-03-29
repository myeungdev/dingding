import { parseTime } from '../src/alarms';

// Pin "now" so tests are deterministic
const FIXED_NOW = new Date('2026-03-29T10:00:00.000Z'); // 10:00 UTC

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

function hhmm(date: Date) {
  return { h: date.getHours(), m: date.getMinutes() };
}

describe('parseTime', () => {
  it('parses 24h format', () => {
    const d = parseTime('19:30');
    expect(hhmm(d)).toEqual({ h: 19, m: 30 });
  });

  it('parses 12h pm format', () => {
    const d = parseTime('7:30pm');
    expect(hhmm(d)).toEqual({ h: 19, m: 30 });
  });

  it('parses 12h am format', () => {
    const d = parseTime('8:00am');
    expect(hhmm(d)).toEqual({ h: 8, m: 0 });
  });

  it('parses hour-only shorthand', () => {
    expect(hhmm(parseTime('9pm'))).toEqual({ h: 21, m: 0 });
    expect(hhmm(parseTime('6 am'))).toEqual({ h: 6, m: 0 });
  });

  it('handles 12pm as noon', () => {
    expect(hhmm(parseTime('12pm'))).toEqual({ h: 12, m: 0 });
  });

  it('handles 12am as midnight', () => {
    expect(hhmm(parseTime('12am'))).toEqual({ h: 0, m: 0 });
  });

  it('rolls to tomorrow when time has already passed', () => {
    // FIXED_NOW is 10:00 UTC — local hours depend on TZ, so use a time
    // clearly in the past relative to any timezone offset by going through
    // a future-vs-past check on the returned date directly.
    const past = new Date(FIXED_NOW);
    past.setHours(past.getHours() - 2, 0, 0, 0); // 2 h ago local
    const input = `${past.getHours()}:00`;

    const result = parseTime(input);
    expect(result.getTime()).toBeGreaterThan(FIXED_NOW.getTime());

    const tomorrow = new Date(FIXED_NOW);
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(result.getDate()).toBe(tomorrow.getDate());
  });

  it('throws on invalid input', () => {
    expect(() => parseTime('not-a-time')).toThrow();
    expect(() => parseTime('25:00')).toThrow();
    expect(() => parseTime('10:99')).toThrow();
  });
});
