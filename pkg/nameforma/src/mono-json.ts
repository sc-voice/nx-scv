/*
 * MonoJSON is a flattened JSON Data Transfer Object (DTO) presentable as
 * tabular data. MonoJSON therefore functions as a semantic viewport
 * into a given data context. MonoJSON supports applications that
 * allow users to "zoom in/out" of their data without needing to
 * specify what detail to omit/summarize. Detail is added to or removed
 * from MonoJSON according to a simple numeric "semantic projection" metric.
 * Unlike traditional projection that requires users to define what column(s)
 * to include/exclude, a semantic projection is scaled numerically,
 * allowing the user to increment/decrement the level of detail shown in the
 * semantic viewport.
 *
 * An example of a simple semantic projection metric is "maximum number of keys".
 * Clearly, since the original data is organized as KV pairs, detail can
 * be controlled by limiting the number of keys presented.
 * Given [id, name, email, telephone, home address], if we specify
 * maxKeys=3, the semantic projection is implicitly [id, name, email].
 * Other semantic projection metrics are possible as long as they are
 * incrementable. The choice of semantic projection metric is not
 * a MonoJSON concern since MonoJSON is simply a DTO for a semantic
 * projection.
 *
 * MonoJSONBuilder is a builder for MonoJSON objects constructed from
 * deeply nested JSON objects according to specific constraints such as the maximum
 * number of keys (maxKeys) to be included in the new MonoJSON object.
 * The maxKeys constraint can be used to prune detail from the original
 * object provided that keys are ordered by increasing level of detail
 * and decreasing level of general relevance.
 */

import { ZenoStep, ZENO_MAX_ROWS } from './navigable-view.js';
import {
  FuzzyNamespace,
  type IReadOnlyNamespace,
} from './fuzzy-namespace.js';

/**
 * The fundamental scalar types allowed within a MonoJSON object.
 * These types ensure atomicity and prevent nested structures.
 */
export type SimpleType =
  | Date
  | string
  | number
  | boolean
  | null
  | undefined;

/** A single flattened, atomic record representing a relational tuple.  */
export type MonoJSON = Record<string, SimpleType>;

/** Facade allowing any Forma to present itself as MonoJSON (agentic) or MonoTable (human) */
export interface IMonoJSONFacade {
  /** Flatten internal state into atomic MonoJSON object */
  toMonoJSON(
    builder: MonoJSONBuilder,
    opts: Record<string, any>,
  ): MonoJSON;
}

const ELLIPSIS = '…';

/**
 * Utility functions for implementing the MonoJSON projection logic.
 */
export class MonoJSONBuilder {
  readonly arrayDelimiter: string; // array element separator
  readonly maxKeys: number; // maximum # of output keys (0:unlimited)
  readonly namespace: IReadOnlyNamespace | undefined; // for zid resolution
  readonly projection: Record<string, 0 | 1>; // top-level key projection (0:exclude, 1:include)
  readonly zeno: ZenoStep; // semantic zoom (ZENO_MAX_ROWS)
  readonly zidSource: string; // zid source if namespace is provided (id)

  /** Total count of top-level array elements */
  get nArrayElements() {
    return this.#nArrayElements;
  }
  /** source from which to build MonoJSON */
  get source(): object {
    return this.#source;
  }

  // Initialize to invalid sentinel values to enforce that reset() is always called.
  // TypeScript's strict definite assignment requires this workaround.
  #monoJSON: MonoJSON = { error: 'reset' };
  #nKeys: number = -1;
  #nArrayElements: number = -1;
  #lastKey: string | undefined = 'reset';
  #source: object = { error: 'reset' };

  constructor(opts: Partial<MonoJSONBuilder> = {}) {
    const ctx = 'MonoJSONBUilder.ctor';
    const {
      arrayDelimiter = ',',
      maxKeys = 0,
      namespace,
      projection = {},
      source = {},
      zeno = ZENO_MAX_ROWS,
      zidSource = 'id',
    } = opts;

    this.#source = source;
    this.arrayDelimiter = arrayDelimiter;
    this.maxKeys = maxKeys;
    this.projection = projection;
    this.zeno = zeno;
    if (zidSource === 'zid') {
      throw new Error(`Invalid zidSource:${zidSource}`);
    }
    this.zidSource = zidSource;
    this.namespace = namespace;

    if (maxKeys < 0) {
      throw new Error(`${ctx} maxKeys: ${maxKeys} < 0?`);
    }

    this.reset(source);
  }

  /** Reset builder for new source */
  reset(source: object): this {
    this.#monoJSON = {};
    this.#nKeys = 0;
    this.#nArrayElements = 0;
    this.#lastKey = undefined;
    this.#source = source;

    return this;
  }

  /** Reset with source and auto-populate from its fields */
  fromSource(source: object, opts: Record<string, any> = {}): this {
    this.reset(source);
    if (typeof (source as any)?.toMonoJSON === 'function') {
      (source as any).toMonoJSON(this, opts);
    } else {
      for (const [key, value] of Object.entries(source)) {
        this.addKeyValue(key, value);
      }
    }
    return this;
  }

  build(): MonoJSON {
    return { ...this.#monoJSON };
  }

  asSimpleType(value: any): SimpleType {
    if (value == null) {
      return value;
    }
    switch (typeof value) {
      case 'number':
      case 'string':
      case 'boolean':
        return value;
      case 'object':
        break;
    }
    if (value instanceof Array) {
      return `[…${value.length}]`;
    }
    if (value instanceof Date) {
      return value;
    }

    // Handle objects with toJSON (like UUID64) recursively
    if (typeof value.toJSON === 'function') {
      return this.asSimpleType(value.toJSON());
    }

    const text = JSON.stringify(value);

    /* eliminate quotes for identifier keys */
    const regexId = /"([a-z_$][a-z0-9_$]*)":/gi;
    return text.replace(regexId, (match, ident) => {
      return `${ident}:`;
    });
  }

  /** Return true if builder has already added a key value */
  hasKey(key: string): boolean {
    return this.#monoJSON[key] !== undefined;
  }

  /*
   * Conditionally add given KV pair to MonoJSON object subject
   * to maxKeys constraints, converting values
   * to SimpleType.
   */
  addKeyValue(key: string, value: any): this {
    const { projection, zidSource, namespace } = this;
    const ctx = 'MonoJSON.set';
    const { maxKeys } = this;
    const monoJSON = this.#monoJSON;
    let simpleValue = this.asSimpleType(value);

    // Forbid resetting key values
    if (monoJSON[key] !== undefined) {
      throw new Error(`${ctx} attempt to overwrite ${key}:${value}`);
    }
    if (namespace && key === zidSource) {
      const zid: string = namespace.fuzzyIdOf(value);
      this.addKeyValue('zid', zid);
    }

    // suppress projection exclusions before they affect maxKeys limit
    if (projection[key] === 0) {
      return this;
    }
    if (maxKeys === 0 || this.#nKeys < maxKeys) {
      this.#nKeys++;
      monoJSON[key] = simpleValue;
      this.#lastKey = key;
    }
    if (value instanceof Array) {
      this.#nArrayElements += value.length;
    }
    return this;
  }
}
