/*
 * MonoJSON is a rendering protocol for projecting complex internal state
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

/** The contract for any class that can be projected as MonoJSON  */
export interface IMonoJSON {
  /** Flatten internal state into atomic MonoJSON object */
  toMonoJSON(builder: MonoJSONBuilder): MonoJSON;
}

const ELLIPSIS = '…';

/**
 * Utility functions for implementing the MonoJSON projection logic.
 */
export class MonoJSONBuilder {
  readonly arrayDelimiter: string; // array element separator
  readonly overflowDelimiter;
  string; // overflow key-value (KV) separator
  readonly overflowKey: string; // key for overflow KV pairs
  readonly theme: INameFormaTheme; // pi-coding-agent theme
  readonly maxKeys: number; // maximum # of output keys (5)
  readonly maxOverflow: number; // maximum number of overflow KV pairs (3)

  #monoJSON: MonoJSON = {};
  #nKeys: number = 0;
  #nOverflow: number = 0;
  #lastKey: string | undefined = undefined;

  constructor(opts: Partial<MonoJSONBuilder>) {
    const {
      arrayDelimiter = ',',
      overflowDelimiter = '|',
      overflowKey = ELLIPSIS,
      maxKeys = 5,
      maxOverflow = 3,
      theme = NameFormaTheme.shared,
    } = opts;

    this.arrayDelimiter = arrayDelimiter;
    this.overflowDelimiter = theme.nfBoundary(overflowDelimiter);
    this.overflowKey = overflowKey;
    this.maxOverflow = maxOverflow;
    this.maxKeys = maxKeys;
    this.theme = theme;
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

    const text = JSON.stringify(value);

    /* eliminate quotes for identifier keys */
    const regexId = /(['"])([a-zA-Z_$][\w$]*)\1\s*:/g;
    return text.replace(regexId, (match, quote, ident) => {
     return `${ident}:`;
    });
  }

  /*
   * Conditionally add given KV pair to MonoJSON object subject
   * to maxKeys and maxOverflow constraints, converting values
   * to SimpleType.
   */
  set(key: string, value: any): void {
    const { theme, overflowDelimiter, maxKeys, maxOverflow, overflowKey } =
      this;
    const monoJSON = this.#monoJSON;
    let simpleValue = this.asSimpleType(value);
    let resolvedKey =
      value instanceof Array ? `${key}[${value.length}]` : key;

    if (monoJSON[key] == undefined) {
      // New key
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
    }
  }
}
