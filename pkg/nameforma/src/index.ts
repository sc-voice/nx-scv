import {
  Action,
  ActionStatus,
  ActionTransitions,
  STATUS_ORDER,
} from './action.js';
import { Clock } from './clock.js';
import { Focus } from './focus.js';
import {
  Forma,
  LevenshteinMatcher,
} from './forma.js';
import { FormaField } from './forma-field.js';
import { FormaList } from './forma-list.js';
import { Identifiable, type FuzzyId } from './identifiable.js';
import { RenderDetail, ZenoCoord } from './navigable-view.js';
import UUID64 from './uuid64.js';
export type { FuzzyId, IRegistry };
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
import { Reference } from './reference.js';
import { Schema } from './schema.js';
import { Task } from './task.js';
import type { IRegistry } from './registry.js';
export const NameForma = {
  Action,
  ActionStatus,
  ActionTransitions,
  STATUS_ORDER,
  Admin,
  Clock,
  Consumer,
  Focus,
  Forma,
  FormaField,
  FormaList,
  Identifiable,
  Kafka1,
  LevenshteinMatcher,
  Patch,
  Producer,
  Rational,
  Reference,
  Schema,
  Task,
  UUID64,
  _Runner,
  RenderDetail,
  ZenoCoord,
};
