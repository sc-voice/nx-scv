import { Clock } from './clock.mjs';
import { Forma } from './forma.mjs';
import { IdValue } from './id-value.mjs';
import {
  Admin,
  Consumer,
  // kafkajs API:
  Kafka1,
  Producer,
  // non-kafkajs API:
  _Runner,
} from './kafka1.mjs';
import { Schema } from './schema.mjs';
import { Task } from './task.mjs';
import { Timer, Timers } from './timers.mjs';
export const NameForma = {
  Admin,
  Clock,
  Consumer,
  Forma,
  IdValue,
  Kafka1,
  Producer,
  Schema,
  Task,
  Timer,
  Timers,
  _Runner,
};
