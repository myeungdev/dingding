import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  listAlarms,
  createAlarm,
  deleteAlarm,
  deleteRingingAlarm,
  parseDuration,
  parseTime,
} from './alarms';

const server = new McpServer({
  name: 'dingding',
  version: '1.0.0',
});

server.tool(
  'list_alarms',
  'List all active and ringing alarms/timers',
  {},
  () => {
    const alarms = listAlarms();
    return {
      content: [{ type: 'text', text: JSON.stringify(alarms, null, 2) }],
    };
  }
);

server.tool(
  'create_timer',
  'Create a countdown timer that fires after a given duration (e.g. "15 minutes", "1h30m", "90s")',
  {
    duration: z.string().describe('How long until the timer fires, e.g. "15 minutes", "1h30m", "90s"'),
    label: z.string().optional().describe('Optional name for the timer'),
  },
  ({ duration, label }) => {
    try {
      const ms = parseDuration(duration);
      const alarm = createAlarm(new Date(Date.now() + ms), label);
      return {
        content: [{ type: 'text', text: JSON.stringify(alarm, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
      };
    }
  }
);

server.tool(
  'create_alarm',
  'Create an alarm that fires at a specific time of day (e.g. "7:30pm", "19:30"). Rolls to tomorrow if the time has already passed.',
  {
    time: z.string().describe('Time of day to ring, e.g. "7:30pm", "19:30", "7am"'),
    label: z.string().optional().describe('Optional name for the alarm'),
  },
  ({ time, label }) => {
    try {
      const triggerAt = parseTime(time);
      const alarm = createAlarm(triggerAt, label);
      return {
        content: [{ type: 'text', text: JSON.stringify(alarm, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
      };
    }
  }
);

server.tool(
  'stop_ringing_alarm',
  'Stop and dismiss the alarm that is currently playing sound',
  {},
  () => {
    const stopped = deleteRingingAlarm();
    if (!stopped) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'No alarm is currently ringing.' }],
      };
    }
    return {
      content: [{ type: 'text', text: 'Ringing alarm stopped.' }],
    };
  }
);

server.tool(
  'delete_alarm',
  'Delete a specific alarm or timer by its ID',
  {
    id: z.string().describe('The alarm ID to delete'),
  },
  ({ id }) => {
    const deleted = deleteAlarm(id);
    if (!deleted) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Alarm "${id}" not found.` }],
      };
    }
    return {
      content: [{ type: 'text', text: `Alarm "${id}" deleted.` }],
    };
  }
);

const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
