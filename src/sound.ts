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

function spawnArgs(filePath: string): [string, string[]] {
  switch (process.platform) {
    case 'darwin':
      return ['afplay', [filePath]];
    case 'linux': {
      const device = process.env.AUDIO_DEVICE;
      const args = device ? ['-q', '-a', device, filePath] : ['-q', filePath];
      return ['mpg123', args];
    }
    default:
      return ['powershell', ['-c', `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`]];
  }
}
