import 'dotenv/config';
import express, { Request, Response } from 'express';
import {
  listAlarms,
  createAlarm,
  deleteAlarm,
  parseDuration,
  parseTime,
} from './alarms';

if (!process.env.ALARM_SOUND_PATH) {
  console.error('Error: ALARM_SOUND_PATH is not set in the environment.');
  process.exit(1);
}

const app = express();
app.use(express.json());

// GET /alarms — list all active/ringing alarms
app.get('/alarms', (_req: Request, res: Response) => {
  res.json(listAlarms());
});

// POST /alarms — create a timer (duration) or alarm (exact time)
// Body (duration): { duration: "2 minutes", label?: string }
// Body (time):     { time: "7:30pm",        label?: string }
app.post('/alarms', (req: Request, res: Response) => {
  const { duration, time, label } = req.body ?? {};

  if (!duration && !time) {
    res.status(400).json({ error: 'Provide either "duration" or "time".' });
    return;
  }

  if (duration && time) {
    res.status(400).json({ error: 'Provide either "duration" or "time", not both.' });
    return;
  }

  try {
    let triggerAt: Date;

    if (duration) {
      const ms = parseDuration(String(duration));
      triggerAt = new Date(Date.now() + ms);
    } else {
      triggerAt = parseTime(String(time));
    }

    const alarm = createAlarm(triggerAt, label ? String(label) : undefined);
    res.status(201).json(alarm);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// DELETE /alarms/:id — stop and delete an alarm
app.delete('/alarms/:id', (req: Request, res: Response) => {
  const deleted = deleteAlarm(req.params['id'] as string);
  if (!deleted) {
    res.status(404).json({ error: 'Alarm not found.' });
    return;
  }
  res.status(204).send();
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`dingding listening on http://localhost:${PORT}`);
});
