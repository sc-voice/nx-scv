/*
 * MonoJSON is a Data Transfer Object (DTO) for projecting complex internal state
 * as a flattened object presentable as tabular data.
 * MonoJSONBuilder builds MonoJSON objects with a maximum number of keys,
 * with an allowance for overflow key-value (KV) fields, whose values
 * are concatenated as the value of a single overflow key ('…').
 */

import { INameFormaTheme } from './navigable-view.js';
import { NameFormaTheme } from './nameforma-theme.js';

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
  readonly overflowDelimiter: string; // overflow key-value (KV) separator
  readonly overflowKey: string; // key for overflow KV pairs
  readonly theme: INameFormaTheme; // pi-coding-agent theme
  readonly maxKeys: number; // maximum # of output keys (5)
  readonly maxLines: number; // maximum # of output lines (5)
  readonly maxOverflow: number; // maximum number of overflow KV pairs (3)

  /** Total count of top-level array elements */
  get nArrayElements() {
    return this.#nArrayElements;
  }
  /** soource from which to build MonoJSON */
  get source(): object {
    return this.#source;
  }

  // Initialize to invalid sentinel values to enforce that reset() is always called.
  // TypeScript's strict definite assignment requires this workaround.
  #monoJSON: MonoJSON = { error: 'reset' };
  #nKeys: number = -1;
  #nOverflow: number = -1;
  #nArrayElements: number = -1;
  #lastKey: string | undefined = 'reset';
  #source: object = { error: 'reset' };

  constructor(opts: Partial<MonoJSONBuilder>) {
    const ctx = 'MonoJSONBUilder.ctor';
    const {
      arrayDelimiter = ',',
      overflowDelimiter = '|',
      overflowKey = ELLIPSIS,
      maxLines,
      maxKeys = 5,
      maxOverflow = 3,
      theme = NameFormaTheme.shared,
      source = {},
    } = opts;

    this.#source = source;
    this.arrayDelimiter = arrayDelimiter;
    this.overflowDelimiter = theme.nfBoundary(overflowDelimiter);
    this.overflowKey = overflowKey;
    this.maxOverflow = maxOverflow;
    this.maxKeys = maxKeys;
    this.theme = theme;
    this.maxLines = maxLines ?? maxKeys;

    if (maxLines! <= 0) {
      throw new Error(`${ctx} maxLines: ${maxLines} < 1?`);
    }
    if (maxKeys <= 0) {
      throw new Error(`${ctx} maxKeys: ${maxKeys} < 1?`);
    }
    if (maxOverflow <= 0) {
      throw new Error(`${ctx} maxOverflow: ${maxOverflow} < 1?`);
    }

    this.reset(source);
  }

  /** Reset builder for new source */
  reset(source: object): this {
    this.#monoJSON = {};
    this.#nKeys = 0;
    this.#nOverflow = 0;
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
      return value
        .map((v) => this.asSimpleType(v))
        .join(this.arrayDelimiter);
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

  /*
   * Conditionally add given KV pair to MonoJSON object subject
   * to maxKeys and maxOverflow constraints, converting values
   * to SimpleType.
   */
  addKeyValue(key: string, value: any): this {
    const ctx = 'MonoJSON.set';
    const { theme, overflowDelimiter, maxKeys, maxOverflow, overflowKey } =
      this;
    const monoJSON = this.#monoJSON;
    let simpleValue = this.asSimpleType(value);
    let resolvedKey =
      value instanceof Array ? `${key}[${value.length}]` : key;

    // Forbid resetting key values
    if (monoJSON[key] !== undefined) {
      throw new Error(`${ctx} attempt to overwrite ${key}:${value}`);
    }

    if (this.#nKeys < maxKeys) {
      this.#nKeys++;
      monoJSON[resolvedKey] = simpleValue;
      this.#lastKey = key;
    } else if (this.#nOverflow < maxOverflow) {
      this.#nOverflow++;
      let lastValue = monoJSON[this.#lastKey!] ?? '';
      if (this.#lastKey !== this.overflowKey) {
        delete monoJSON[this.#lastKey!];
        lastValue = theme.nfLabel(this.#lastKey!) + lastValue;
      }
      simpleValue =
        lastValue + overflowDelimiter + theme.nfLabel(key) + simpleValue;
      resolvedKey = this.overflowKey;
      monoJSON[resolvedKey] = simpleValue;
      this.#lastKey = overflowKey;
    }
    if (value instanceof Array) {
      this.#nArrayElements += value.length;
    }
    return this;
  }
}
