import { Clock } from './src/clock.mjs';
import { Forma } from './src/forma.mjs';
//import { IdValue } from './src/id-value.mjs';
import { Identifiable } from './src/identifiable.mjs';
import {
  Admin,
  Consumer,
  // kafkajs API:
  Kafka1,
  Producer,
  // non-kafkajs API:
  _Runner,
} from './src/kafka1.mjs';
//import { Patch } from './src/patch.mjs';
import { Rational } from './src/rational.mjs';
import { Schema } from './src/schema.mjs';
import { Task } from './src/task.mjs';
//import { Timer, Timers } from './src/timers.mjs';
export const NameForma = {
  Admin,
  Clock,
  Consumer,
  Forma,
  Identifiable,
  //IdValue, // deprecated
  Kafka1,
  //Patch,
  Producer,
  Rational,
  Schema,
  Task,
  //Timer,
  //Timers,
  _Runner,
};
