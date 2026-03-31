/**
 * Schema - Avro schema registry and management
 *
 * ## Overview
 * - Avro schema registry and management
 * - Schema parsing via avro-js
 * - Converts JavaScript objects to Avro format
 * - Registers schemas with namespace tracking
 *
 * ## Features
 * 1. **Schema Registry**: Static registry for all registered schemas with namespace tracking
 * 2. **Schema Parsing**: Uses avro-js to parse schema definitions with nested references
 * 3. **JavaScript to Avro Conversion**: `toAvro(jsObj, opts)` converts JS objects to Avro format
 * 4. **Full Name Resolution**: Combines namespace and name (format: namespace.name or just name)
 * 5. **Custom Type Support**: Automatically converts objects with toAvroValue() method
 */

import { Text } from '@sc-voice/tools';
import UUID64 from './uuid64.js';
import { DBG } from './defines.js';

const { ColorConsole, Unicode } = Text;
const { CHECKMARK: UOK } = Unicode;
const { cc } = ColorConsole;
const { SCHEMA: S4A } = DBG;

export type AvroType = any;

export interface ISchemaClass {
  new(...args:any[]): any;
  readonly avroSchema: any
}

export class Schema {
  /** Static registry for all registered schemas, keyed by full name */
  static #registry: Record<string, any> = {};
  /** avro-js library instance for schema parsing and type handling */
  static #avro: any;

  name?: string;
  namespace?: string;
  type?: string;
  fields?: any[]; // parent fields
  dependencies?: any[]; // avroSchema dependencies
  [key: string]: any;

  constructor(cfg: any = {}) {
    let sCfg = JSON.stringify(cfg);
    Object.assign(this, JSON.parse(sCfg));
    this.name = this.name || 'UnnamedSchema';
  }

  /**
   * Get a copy of the static schema registry.
   * @returns Copy of all registered schemas keyed by full name
   */
  static get REGISTRY() {
    return Object.assign({}, Schema.#registry);
  }

  static registerType(type:ISchemaClass, opts: any={}): AvroType {
    const msg = 's4a.registerType';
    const dbg = S4A.REGISTER;

    for (const dep in type.avroSchema.dependencies) {
      Schema.registerType(type, opts);
    }

    let { avroSchema } = type
    return Schema.registerSchema(avroSchema, opts);
    /*
    let { name, namespace } = avroSchema;
    if (name == null) {
      throw new Error(`${msg} name?`);
    }
    let fullName = namespace ? `${namespace}.${name}` : `${name}`;
    dbg > 1 && cc.ok(msg, 'parsing:', fullName);
    let { avro = Schema.#avro, registry = Schema.#registry } = opts;
    if (avro == null) {
      throw new Error(`${msg} avro?`);
    }
    Schema.#avro = avro;
    let avroType = registry[fullName];

    if (avroType == null) {
      avroType = avro.parse(avroSchema, Object.assign({ registry }, opts));
      if (avroType == null) {
        let eMsg = `${msg} parse?`;
        throw new Error(eMsg);
      }
      dbg && cc.ok1(msg + UOK, fullName);
      registry[fullName] = avroType;
      Schema.#registry[fullName] = avroType;
    }

    return avroType;
    */
  }

  /**
   * Register a schema with the registry and parse it via avro-js.
   * Prevents duplicate registration by checking registry first.
   * @param schema - Schema definition object with name and optional namespace
   * @param opts - Options: avro (avro-js instance), registry (custom registry to use)
   * @returns Parsed Avro type ready for serialization/deserialization
   * @deprecated
   */
  static registerSchema(schema: Schema, opts: any = {}) {
    const msg = 's4a.registerSchema';
    const dbg = S4A.REGISTER;

    let { name, namespace } = schema;
    if (name == null) {
      throw new Error(`${msg} name?`);
    }
    let fullName = namespace ? `${namespace}.${name}` : `${name}`;
    dbg > 1 && cc.ok(msg, 'parsing:', fullName);
    let { avro = Schema.#avro, registry = Schema.#registry } = opts;
    if (avro == null) {
      throw new Error(`${msg} avro?`);
    }
    Schema.#avro = avro;
    let type = registry[fullName];

    if (type == null) {
      type = avro.parse(schema, Object.assign({ registry }, opts));
      if (type == null) {
        let eMsg = `${msg} parse?`;
        throw new Error(eMsg);
      }
      dbg && cc.ok1(msg + UOK, fullName);
      registry[fullName] = type;
      Schema.#registry[fullName] = type;
    }

    return type;
  }

  get fullName() {
    let { namespace, name } = this;
    return namespace == null ? name : `${namespace}.${name}`;
  }

  /**
   * Convert a JavaScript object to Avro-serializable format via type.clone().
   * Looks up or registers the schema if needed.
   * @param jsObj - JavaScript object to convert
   * @param opts - Options: avro (avro-js instance), registry (custom registry)
   * @returns Object ready for Avro serialization via type.toBuffer()
   */
  toAvro(jsObj: any, opts: any = {}) {
    const msg = 's4a.toAvro';
    const dbg = S4A.TO_AVRO;
    const { avro = Schema.#avro, registry = Schema.#registry } = opts;
    if (avro == null) {
      let eMsg = `${msg} avro?`;
      cc.bad1(msg, eMsg);
      throw new Error(eMsg);
    }
    const { name } = this;
    const fullName = this.fullName;
    let type = (name && registry[name]) || (fullName && registry[fullName]);
    if (type == null) {
      type = Schema.registerSchema(this, { avro, registry });
    }
    if (type == null) {
      let eMsg = `${msg} type?`;
      cc.bad1(msg, eMsg);
      throw new Error(eMsg);
    }

    return type.clone(jsObj, { wrapUnions: true });
  }
}
