import { Assert } from './src/js/assert.mjs';
export const JS = { Assert,
}

import { Activation } from './src/math/activation.mjs';
import { Fraction } from './src/math/fraction.mjs';
import { Units } from './src/math/units.mjs';
import { Interval } from './src/math/interval.mjs';
import { Hadamard } from './src/math/hadamard.mjs';

export const ScvMath = {
  Activation,
  Fraction,
  Hadamard,
  Interval,
  Units,
};

import { BilaraPath } from './src/text/bilara-path.mjs';
import { List, ListFactory } from './src/text/list.mjs';
import { Corpus } from './src/text/corpus.mjs';
import { EbtDoc } from './src/text/ebt-doc.mjs';
import { LegacyDoc } from './src/text/legacy-doc.mjs';
import { MerkleJson } from './src/text/merkle-json.mjs';
import { SuttaCentralId } from './src/text/sutta-central-id.mjs';
import { Unicode } from './src/text/unicode.mjs';
import { WordSpace } from './src/text/word-space.mjs';
import { WordVector } from './src/text/word-vector.mjs';
import { TfidfSpace } from './src/text/tfidf-space.mjs';
import { LogEntry, Logger } from './src/text/logger.mjs';
import { ColorConsole} from './src/text/color-console.mjs';

export const Text = {
  BilaraPath,
  ColorConsole,
  List,
  ListFactory,
  Corpus,
  EbtDoc,
  LegacyDoc,
  LogEntry,
  Logger,
  MerkleJson,
  SuttaCentralId,
  Unicode,
  WordSpace,
  WordVector,
  TfidfSpace,
};

import { default as Sankey } from './src/graph/sankey.mjs';
export const Graph = {
  Sankey, 
}


import { 
  // kafkajs API:
  Kafka1, Producer, Consumer, Admin, 
  // non-kafkajs API:
  _Runner,
} from './src/nameforma/kafka1.mjs';
import { Timer, Timers } from './src/nameforma/timers.mjs';
import { Clock } from './src/nameforma/clock.mjs';
import { Task } from './src/nameforma/task.mjs';
import { Forma } from './src/nameforma/forma.mjs';
import { Schema } from './src/nameforma/schema.mjs';
export const NameForma = {
  Admin,
  Clock,
  Consumer,
  Forma,
  Kafka1,
  Producer,
  Schema,
  Task,
  Timer,
  Timers,
  _Runner, 
}
