import fs from 'node:fs';
import path from 'node:path';
import { createStream } from 'rotating-file-stream';
import pino from 'pino';
import { DBG, findWorld } from './defines.js';

export const logger = (() => {
  if (!DBG.PINO) {
    return {
      info: () => {},
      error: () => {},
      debug: () => {},
      warn: () => {},
      fatal: () => {},
      trace: () => {},
    };
  }

  const worldPath = findWorld() || process.cwd();
  const logDir = worldPath;

  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const stream = createStream(
    (time) => {
      const dt =
        time instanceof Date ? time : new Date(time || Date.now());
      const year = String(dt.getFullYear()).slice(-2);
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return path.join(logDir, `nf.${year}${month}${day}.log`);
    },
    {
      size: '10M',
      maxFiles: 10,
    },
  );

  return pino(stream);
})();
