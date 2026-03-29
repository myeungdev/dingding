import 'dotenv/config';
import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';

const API_URL = (process.env.DINGDING_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, options);
  if (res.status === 204) return null;
  return res.json();
}

const server = new FastMCP({ name: 'dingding', version: '1.0.0' });

server.addTool({
  name: 'list_alarms',
  description: 'List all active and ringing alarms/timers',
  execute: async () => {
    const alarms = await apiFetch('/alarms');
    return JSON.stringify(alarms, null, 2);
  },
});

server.addTool({
  name: 'create_timer',
  description: 'Create a countdown timer that fires after a given duration (e.g. "15 minutes", "1h30m", "90s")',
  parameters: z.object({
    duration: z.string().describe('How long until the timer fires, e.g. "15 minutes", "1h30m", "90s"'),
    label: z.string().optional().describe('Optional name for the timer'),
  }),
  execute: async ({ duration, label }) => {
    const body = await apiFetch('/alarms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration, label }),
    });
    if (body?.error) throw new UserError(body.error);
    return JSON.stringify(body, null, 2);
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
    const body = await apiFetch('/alarms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time, label }),
    });
    if (body?.error) throw new UserError(body.error);
    return JSON.stringify(body, null, 2);
  },
});

server.addTool({
  name: 'stop_ringing_alarm',
  description: 'Stop and dismiss the alarm that is currently playing sound',
  execute: async () => {
    const body = await apiFetch('/alarms/ringing', { method: 'DELETE' });
    if (body?.error) throw new UserError(body.error);
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
    const body = await apiFetch(`/alarms/${id}`, { method: 'DELETE' });
    if (body?.error) throw new UserError(body.error);
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
