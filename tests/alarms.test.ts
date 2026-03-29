import { listAlarms, createAlarm, deleteAlarm, deleteRingingAlarm } from '../src/alarms';

// Mock sound so no real audio process is spawned
jest.mock('../src/sound', () => ({
  playLooping: jest.fn(() => ({ stop: jest.fn() })),
}));

import { playLooping } from '../src/sound';
const mockPlayLooping = playLooping as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  process.env.ALARM_SOUND_PATH = '/fake/alarm.wav';
  // Clear store between tests by deleting every alarm
  listAlarms().forEach((a) => deleteAlarm(a.id));
  mockPlayLooping.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

function inMs(ms: number) {
  return new Date(Date.now() + ms);
}

describe('createAlarm', () => {
  it('returns an active alarm with correct fields', () => {
    const triggerAt = inMs(60_000);
    const alarm = createAlarm(triggerAt, 'Pizza');
    expect(alarm.status).toBe('active');
    expect(alarm.label).toBe('Pizza');
    expect(alarm.triggerAt).toEqual(triggerAt);
    expect(alarm.id).toBeDefined();
  });

  it('appears in listAlarms', () => {
    createAlarm(inMs(60_000));
    expect(listAlarms()).toHaveLength(1);
  });

  it('throws when triggerAt is in the past', () => {
    expect(() => createAlarm(new Date(Date.now() - 1000))).toThrow('future');
  });
});

describe('deleteAlarm', () => {
  it('removes the alarm from the store', () => {
    const alarm = createAlarm(inMs(60_000));
    expect(deleteAlarm(alarm.id)).toBe(true);
    expect(listAlarms()).toHaveLength(0);
  });

  it('returns false for unknown id', () => {
    expect(deleteAlarm('non-existent-id')).toBe(false);
  });

  it('cancels the timeout so the alarm never rings', () => {
    const alarm = createAlarm(inMs(5_000));
    deleteAlarm(alarm.id);
    jest.runAllTimers();
    expect(mockPlayLooping).not.toHaveBeenCalled();
  });
});

describe('trigger behaviour', () => {
  it('sets status to ringing and plays sound', () => {
    createAlarm(inMs(5_000), 'Test');
    jest.runAllTimers();
    const alarms = listAlarms();
    expect(alarms[0].status).toBe('ringing');
    expect(mockPlayLooping).toHaveBeenCalledWith('/fake/alarm.wav');
  });

  it('stops the sound when the ringing alarm is deleted', () => {
    const stopMock = jest.fn();
    mockPlayLooping.mockReturnValueOnce({ stop: stopMock });
    createAlarm(inMs(5_000));
    jest.runAllTimers();
    const [alarm] = listAlarms();
    deleteAlarm(alarm.id);
    expect(stopMock).toHaveBeenCalled();
  });
});

describe('deleteRingingAlarm', () => {
  it('stops and removes the ringing alarm', () => {
    createAlarm(inMs(5_000));
    jest.runAllTimers();
    expect(deleteRingingAlarm()).toBe(true);
    expect(listAlarms()).toHaveLength(0);
  });

  it('returns false when nothing is ringing', () => {
    createAlarm(inMs(60_000)); // still active, not ringing
    expect(deleteRingingAlarm()).toBe(false);
  });

  it('only removes the ringing alarm, leaving active ones intact', () => {
    createAlarm(inMs(60_000), 'Still waiting');
    createAlarm(inMs(5_000), 'Ring me');
    jest.advanceTimersByTime(5_000);
    deleteRingingAlarm();
    const remaining = listAlarms();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].label).toBe('Still waiting');
  });
});
