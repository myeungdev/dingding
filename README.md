# dingding

A lightweight alarm and kitchen timer REST API built for home automation. Run it on a Raspberry Pi or any home server and trigger it from Home Assistant, Node-RED, shell scripts, or any HTTP client.

## Features

- Set timers by duration — *"2 minutes"*, *"1h30m"*, *"90s"*
- Set alarms by exact time — *"7:30pm"*, *"19:30"*
- Plays a local sound file when triggered, loops until stopped
- Simple REST API — easy to integrate with any home automation stack
- Docker-ready for self-hosting

## Getting started

### Prerequisites

- Node.js 22+ and pnpm
- A sound file (`.wav`, `.mp3`, etc.) accessible on the host

### Install and run

```bash
cp .env.example .env
# Edit .env and set ALARM_SOUND_PATH to your sound file
pnpm install
pnpm dev
```

The server starts on `http://localhost:3000` by default. Set `PORT` in `.env` to change it.

### Run with Docker

```bash
docker run -d \
  -p 3000:3000 \
  -e ALARM_SOUND_PATH=/sounds/alarm.wav \
  -v /path/to/your/sounds:/sounds \
  ghcr.io/myeungdev/dingding:main
```

## API

### `GET /alarms`
List all active and ringing alarms.

### `POST /alarms`
Create a timer or alarm. Provide either `duration` or `time`, not both.

| Field | Type | Description |
|-------|------|-------------|
| `duration` | string | How long from now — e.g. `"15 minutes"`, `"1h30m"`, `"90s"` |
| `time` | string | Exact time — e.g. `"7:30pm"`, `"19:30"`, `"7am"`. Rolls to tomorrow if the time has already passed. |
| `label` | string | Optional name for the alarm |

```bash
# Timer: 15 minutes from now
curl -X POST http://localhost:3000/alarms \
  -H "Content-Type: application/json" \
  -d '{"duration": "15 minutes", "label": "Pizza"}'

# Alarm: ring at 7:30 AM
curl -X POST http://localhost:3000/alarms \
  -H "Content-Type: application/json" \
  -d '{"time": "7:30am", "label": "Wake up"}'
```

### `DELETE /alarms/ringing`
Stop and dismiss the alarm that is currently playing.

```bash
curl -X DELETE http://localhost:3000/alarms/ringing
```

### `DELETE /alarms/:id`
Stop and delete a specific alarm by its ID.

```bash
curl -X DELETE http://localhost:3000/alarms/<id>
```

## Home automation examples

**Home Assistant REST command:**
```yaml
rest_command:
  kitchen_timer:
    url: http://homeserver.local:3000/alarms
    method: POST
    content_type: application/json
    payload: '{"duration": "{{ duration }}", "label": "{{ label }}"}'

  stop_alarm:
    url: http://homeserver.local:3000/alarms/ringing
    method: DELETE
```

**Node-RED:** Use an HTTP Request node with `POST http://localhost:3000/alarms` and pass `{"duration": "5 minutes"}` as the JSON body.

## Development

```bash
pnpm test    # run unit tests
pnpm build   # compile TypeScript
```

A `requests.http` file is included for manual testing with the VS Code REST Client or JetBrains HTTP client.
