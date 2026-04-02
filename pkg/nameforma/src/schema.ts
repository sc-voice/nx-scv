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
import { DBG } from './defines.js';

const { ColorConsole, Unicode } = Text;
const { CHECKMARK: UOK } = Unicode;
const { cc } = ColorConsole;
const { SCHEMA: S4A } = DBG;

export type AvroType = any;

export interface SchemaOpts {
  avro: any; // avro-js instance
  registry: SchemaRegistry;
}

/**
 * An Avro-serializable class
 */
export interface ISchemaClass {
  new(...args:any[]): any;
  readonly avroSchema: any;
  registerAvro(opts:SchemaOpts): AvroType;
}

let UUID64: any;

/*8
 * Schema helper that silently prevents re-registration of
 * an ISchemaClass
 */
export class SchemaRegistry {
  [key: string]: any;

  constructor(cfg:any = {}) {
    Object.assign(this, cfg);
  }
}

export class Schema {
  /** Static registry for all registered schemas, keyed by full name */
  //static #defaultRegistry: Record<string, any> = {};
  static #defaultRegistry: SchemaRegistry = new SchemaRegistry({id:"defaultRegistry"});

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
    return Object.assign({}, Schema.#defaultRegistry);
  }

  /**
   * Register a NameForma class in the Avro registry.
   * Does nothing if the type is already registered.
   * @returns parsed and registered serialization AvroType
   */
  static registerType(type:ISchemaClass, opts: any={}): AvroType {
    const msg = 's4a.registerType';
    const dbg = S4A.ALL;
    let { avroSchema } = type;
    if (avroSchema == null) {
      throw new Error(`${msg} avroSchema?`);
    }
    let { fullName } = avroSchema;
    let { registry = Schema.#defaultRegistry } = opts;
    let avroType = registry[fullName];
    if (avroType == null) {
      dbg>1 && cc.ok(msg, "new schema:", fullName);
      avroType = Schema.registerSchema(avroSchema, opts);
    }
    dbg && cc.ok1(msg, "registered:", fullName)
    return avroType
  }

  /**
   * Register a schema into the avro registry and return the parsed AvroType.
   *
   * TWO-REGISTRY SYSTEM:
   * 1. Schema.#defaultRegistry: Prevents duplicate registrations by fullName (Schema's internal tracking)
   * 2. avro registry: Passed to avro.parse() - the avro-js library's type registry
   *
   * This method registers into BOTH registries and returns the AvroType from avro.parse().
   *
   * @param schema - Schema definition object with name and optional namespace
   * @param opts - Options: avro (avro-js instance), registry (custom avro registry to use)
   * @returns parsed and registered serialization AvroType
   */
  static registerSchema(schema: Schema, opts: any = {}) {
    const msg = 's4a.registerSchema';
    const dbg = S4A.ALL;

    let { fullName="fullName?", name, namespace } = schema;
    dbg > 1 && cc.ok(msg, "schema:", fullName)
    if (name == null) {
      let emsg = (`${msg} name?`)
      cc.bad1(msg+-1, emsg)
      throw new Error(emsg)
    }
    dbg > 2 && cc.ok(msg, 'parsing:', fullName);
    let { avro = Schema.#avro, registry = Schema.#defaultRegistry } = opts;
    if (avro == null) {
      throw new Error(`${msg} avro?`);
    }
    Schema.#avro = avro;
    let avroType = registry[fullName];

    if (avroType == null) {
      dbg && cc.ok(msg, 'avro.parse registry:', registry.id);
      avroType = avro.parse(schema, Object.assign({ registry }, opts));
      if (avroType == null) {
        let eMsg = `${msg} parse?`;
        cc.bad1(eMsg);
        throw new Error(eMsg);
      }
      dbg && cc.ok1(msg, "schema:", fullName);
      registry[fullName] = avroType;

      // TODO: why are we updating the default registry
      Schema.#defaultRegistry[fullName] = avroType;
    }

    return avroType;
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
    const { avro = Schema.#avro, registry = Schema.#defaultRegistry } = opts;
    if (avro == null) {
      let eMsg = `${msg} avro?`;
      cc.bad1(msg, eMsg);
      throw new Error(eMsg);
    }
    const { name } = this;
    const fullName = this.fullName;
    let type = (name && registry[name]) || (fullName && registry[fullName]);
    if (type == null) {
      let { avroSchema } = jsObj.constructor;
      if (avroSchema == null) {
        let emsg = `${msg} jsObj.constructor.avroSchema?`;
        cc.bad1(emsg);
        throw new Error(emsg);
      }
      type = Schema.registerSchema(avroSchema, { avro, registry});
    }
    if (type == null) {
      let eMsg = `${msg} type?`;
      cc.bad1(msg, eMsg);
      throw new Error(eMsg);
    }

    return type.clone(jsObj, { wrapUnions: true });
  }
}
