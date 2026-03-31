import { spawn, ChildProcess } from 'child_process';

export interface SoundHandle {
  stop: () => void;
}

export function playLooping(filePath: string): SoundHandle {
  let process: ChildProcess | null = null;
  let stopped = false;

  function spawnNext() {
    if (stopped) return;
    process = spawn(...spawnArgs(filePath));
    process.on('exit', () => {
      if (!stopped) spawnNext();
    });
  }

  spawnNext();

  return {
    stop() {
      stopped = true;
      process?.kill();
      process = null;
    },
  };
}

function volume(): number | undefined {
  const raw = process.env.ALARM_VOLUME;
  if (!raw) return undefined;
  const v = Number(raw);
  if (isNaN(v) || v < 0 || v > 100) {
    console.warn(`ALARM_VOLUME must be 0–100, ignoring value: ${raw}`);
    return undefined;
  }
  return v;
}

function spawnArgs(filePath: string): [string, string[]] {
  const vol = volume();
  switch (process.platform) {
    case 'darwin': {
      // afplay -v accepts 0.0–1.0
      const args = vol !== undefined ? ['-v', String(vol / 100), filePath] : [filePath];
      return ['afplay', args];
    }
    case 'linux': {
      const device = process.env.AUDIO_DEVICE;
      // mpg123 --scale accepts 0–32768 (32768 = 100%)
      const scale = vol !== undefined ? ['-f', String(Math.round((vol / 100) * 32768))] : [];
      const dev = device ? ['-a', device] : [];
      return ['mpg123', ['-q', ...scale, ...dev, filePath]];
    }
    default: {
      // Use Windows Media Player COM object so we can set volume (0–100)
      const volLine = vol !== undefined ? `$p.settings.volume = ${Math.round(vol)};` : '';
      const script = `$p = New-Object -ComObject WMPlayer.OCX; ${volLine} $p.URL = '${filePath}'; $p.controls.play(); Start-Sleep -Seconds ($p.currentMedia.duration + 1)`;
      return ['powershell', ['-c', script]];
    }
  }
}
