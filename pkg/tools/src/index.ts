import { Activation } from './math/activation.js';
import { Fraction } from './math/fraction.js';
import { Interval } from './math/interval.js';
import { BilaraPath } from './text/bilara-path.js';
import { ColorConsole } from './text/color-console.js';
import { Logger, LogEntry } from './text/logger.js';
import { MerkleJson } from './text/merkle-json.js';
import { SuttaCentralId } from './text/sutta-central-id.js';
import { Unicode } from './text/unicode.js';
import { WordVector } from './text/word-vector.js';
import { Assert } from './util/assert.js';
import UUIDV7 from './util/uuidv7.js';

export const ScvMath = {
  Activation,
  Fraction,
  Interval,
};

export const Text = {
  BilaraPath,
  ColorConsole,
  Logger,
  LogEntry,
  MerkleJson,
  SuttaCentralId,
  Unicode,
  WordVector,
};

export const Util = {
  Assert,
  UUIDV7,
};

export default { ScvMath, Text, Util };
