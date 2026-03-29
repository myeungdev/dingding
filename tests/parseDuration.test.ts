import { parseDuration } from '../src/alarms';

describe('parseDuration', () => {
  it('parses minutes', () => {
    expect(parseDuration('2 minutes')).toBe(120_000);
    expect(parseDuration('1 minute')).toBe(60_000);
    expect(parseDuration('2m')).toBe(120_000);
    expect(parseDuration('2min')).toBe(120_000);
  });

  it('parses seconds', () => {
    expect(parseDuration('30 seconds')).toBe(30_000);
    expect(parseDuration('90s')).toBe(90_000);
    expect(parseDuration('1 sec')).toBe(1_000);
  });

  it('parses hours', () => {
    expect(parseDuration('1 hour')).toBe(3_600_000);
    expect(parseDuration('2h')).toBe(7_200_000);
    expect(parseDuration('1hr')).toBe(3_600_000);
  });

  it('parses combined formats', () => {
    expect(parseDuration('1h30m')).toBe(3_600_000 + 1_800_000);
    expect(parseDuration('1 hour 30 minutes')).toBe(3_600_000 + 1_800_000);
    expect(parseDuration('2m30s')).toBe(150_000);
  });

  it('is case-insensitive', () => {
    expect(parseDuration('2 MINUTES')).toBe(120_000);
    expect(parseDuration('1H')).toBe(3_600_000);
  });

  it('throws on unrecognised input', () => {
    expect(() => parseDuration('tomorrow')).toThrow();
    expect(() => parseDuration('')).toThrow();
  });
});
