import { Action, ActionStatus } from './action.js';
import { Clock } from './clock.js';
import { Forma, type IFormaMatcher, AFormaMatcher, LevenshteinMatcher } from './forma.js';
import { FormaArray } from './forma-array.js';
import { FormaCollection, type IFormaItem, type IFormaItemClass } from './forma-collection.js';
import { Identifiable, type FuzzyId } from './identifiable.js';
import UUID64 from './uuid64.js';
export type { IFormaMatcher, IFormaItem, IFormaItemClass, FuzzyId };
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
export const NameForma = {
  Action,
  ActionStatus,
  Admin,
  AFormaMatcher,
  Clock,
  Consumer,
  Forma,
  FormaArray,
  FormaCollection,
  Identifiable,
  Kafka1,
  LevenshteinMatcher,
  Patch,
  Producer,
  Rational,
  Schema,
  Task,
  UUID64,
  _Runner,
};
