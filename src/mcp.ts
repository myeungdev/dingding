import 'dotenv/config';
import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import {
  listAlarms,
  createAlarm,
  deleteAlarm,
  deleteRingingAlarm,
  parseDuration,
  parseTime,
} from './alarms';

const server = new FastMCP({ name: 'dingding', version: '1.0.0' });

server.addTool({
  name: 'list_alarms',
  description: 'List all active and ringing alarms/timers',
  execute: async () => JSON.stringify(listAlarms(), null, 2),
});

server.addTool({
  name: 'create_timer',
  description: 'Create a countdown timer that fires after a given duration (e.g. "15 minutes", "1h30m", "90s")',
  parameters: z.object({
    duration: z.string().describe('How long until the timer fires, e.g. "15 minutes", "1h30m", "90s"'),
    label: z.string().optional().describe('Optional name for the timer'),
  }),
  execute: async ({ duration, label }) => {
    let ms: number;
    try {
      ms = parseDuration(duration);
    } catch (err) {
      throw new UserError(err instanceof Error ? err.message : String(err));
    }
    const alarm = createAlarm(new Date(Date.now() + ms), label);
    return JSON.stringify(alarm, null, 2);
  },
});

server.addTool({
  name: 'create_alarm',
  description: 'Create an alarm that fires at a specific time of day (e.g. "7:30pm", "19:30"). Rolls to tomorrow if the time has already passed.',
  parameters: z.object({
    time: z.string().describe('Time of day to ring, e.g. "7:30pm", "19:30", "7am"'),
    label: z.string().optional().describe('Optional name for the alarm'),
  }),
  execute: async ({ time, label }) => {
    let triggerAt: Date;
    try {
      triggerAt = parseTime(time);
    } catch (err) {
      throw new UserError(err instanceof Error ? err.message : String(err));
    }
    const alarm = createAlarm(triggerAt, label);
    return JSON.stringify(alarm, null, 2);
  },
});

server.addTool({
  name: 'stop_ringing_alarm',
  description: 'Stop and dismiss the alarm that is currently playing sound',
  execute: async () => {
    if (!deleteRingingAlarm()) {
      throw new UserError('No alarm is currently ringing.');
    }
    return 'Ringing alarm stopped.';
  },
});

server.addTool({
  name: 'delete_alarm',
  description: 'Delete a specific alarm or timer by its ID',
  parameters: z.object({
    id: z.string().describe('The alarm ID to delete'),
  }),
  execute: async ({ id }) => {
    if (!deleteAlarm(id)) {
      throw new UserError(`Alarm "${id}" not found.`);
    }
    return `Alarm "${id}" deleted.`;
  },
});

const transport = (process.env.MCP_TRANSPORT ?? 'stdio') as 'stdio' | 'httpStream';
const port = Number(process.env.MCP_PORT ?? 3001);

server.start(
  transport === 'httpStream'
    ? { transportType: 'httpStream', httpStream: { port } }
    : { transportType: 'stdio' }
);
