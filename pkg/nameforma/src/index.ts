import { Clock } from './clock.js';
import { Forma } from './forma.js';
//import { IdValue } from './id-value.js';
import { Identifiable } from './identifiable.js';
import UUID64 from './uuid64.js';
import {
  Admin,
  Consumer,
  // kafkajs API:
  Kafka1,
  Producer,
  // non-kafkajs API:
  _Runner,
} from './kafka1.js';
import { Patch } from './patch.js';
import { Rational } from './rational.js';
import { Schema } from './schema.js';
import { Task } from './task.js';
//import { Timer, Timers } from './src/timers.mjs';
export const NameForma = {
  Admin,
  Clock,
  Consumer,
  Forma,
  Identifiable,
  //IdValue, // deprecated
  Kafka1,
  Patch,
  Producer,
  Rational,
  Schema,
  Task,
  UUID64,
  //Timer,
  //Timers,
  _Runner,
};
