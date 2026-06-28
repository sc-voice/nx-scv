import { describe, it, expect } from '@sc-voice/vitest';
import { UUID64, Schema, Reference } from '@sc-voice/nameforma';
import avro from 'avro-js';
import { Text } from '@sc-voice/tools';
import { DBG } from '@sc-voice/nameforma/unstable';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = Math.max(0, DBG.REFERENCE?.TEST);

describe('Reference', () => {
  it('ctor default', () => {
    const ref = new Reference();
    expect(ref.id.validate()).toBe(true);
    expect(ref.name).toBe(ref.id.timeId()); // defaults to timeId if no name provided
    expect(ref.summary).toBe('');
    expect(ref.relevance).toBe(0);
    expect(ref.source).toBe('');
    expect(ref.typeName).toBe('Reference');
    expect(ref.avroSchema.namespace).toBe('scvoice.nameforma');
  });

  it('ctor with values', () => {
    const ref = new Reference({
      name: 'Test Reference',
      summary: 'A test reference',
      relevance: 0.8,
      source: 'https://example.com',
    });
    expect(ref.id.validate()).toBe(true);
    expect(ref.name).toBe('Test Reference');
    expect(ref.summary).toBe('A test reference');
    expect(ref.relevance).toBe(0.8);
    expect(ref.source).toBe('https://example.com');
  });

  it('ctor with id', () => {
    const id = new UUID64();
    const ref = new Reference({ id, name: 'With ID' });
    expect(ref.id.base64).toBe(id.base64);
    expect(ref.name).toBe('With ID');
  });

  it('patch updates fields', () => {
    const name1 = 'name1';
    const summary1 = 'summary1';
    const relevance1 = 0.5;
    const source1 = 'src/file1.ts';
    const ref = new Reference({ 
      name: name1,
      summary: summary1,
      relevance: relevance1,
      source: source1,
    });
    const name2 = 'name2';
    const summary2 = 'summary2';
    const relevance2 = 0.7;
    const source2 = 'src/file2.ts';
    const p2 = ref.patch({
      name: name2,
      summary: summary2,
      relevance: relevance2+'', // '0.7'
      source: source2,
    });
    expect(ref.name).toBe(name2);
    expect(ref.summary).toBe(summary2);
    expect(ref.relevance).toBe(relevance2);
    expect(ref.source).toBe(source2);
    expect(p2).toEqual({name:name1, summary:summary1, relevance:relevance1, source:source1});
  });

  it('patch with partial updates', () => {
    const ref = new Reference({
      name: 'Original',
      summary: 'Original summary',
      relevance: 0.5,
    });
    ref.patch({ relevance: 0.9 });
    expect(ref.name).toBe('Original');
    expect(ref.summary).toBe('Original summary');
    expect(ref.relevance).toBe(0.9);
  });

  it('avro Reference', () => {
    const msg = 'tref.avro';
    dbg > 1 && cc.tag(msg, '===========');

    const id = new UUID64();
    const registry = { id: 'Pr9QpW800' };
    const schema = Reference.avroSchema;
    let { fullName } = schema;
    expect(!!registry[fullName]).toBe(false);
    let avroType = Reference.registerAvro({ avro, registry });
    dbg && cc.tag(msg, 'avro.parse');
    expect(avroType._name).toEqual(fullName);
    expect(!!registry[fullName]).toBe(true);
    dbg > 1 &&
      cc.tag(msg + UOK, 'parsed schema is added to registry:', fullName);

    dbg > 1 && cc.tag(msg, 'serialize with schema');
    const thing1 = new Reference({
      id,
      name: 'GitHub Issue',
      summary: 'Related bug',
      relevance: 0.9,
      source: 'https://github.com/issue/123',
    });
    let buf = avroType.toBuffer(thing1);
    let parsed = avroType.fromBuffer(buf);
    let thing2 = new Reference(parsed);
    expect(thing2.name).toBe('GitHub Issue');
    expect(thing2.summary).toBe('Related bug');
    expect(thing2.relevance).toBe(0.9);
    expect(thing2.source).toBe('https://github.com/issue/123');
    expect(thing2.id.base64).toBe(thing1.id.base64);
    dbg && cc.tag1(msg + UOK, 'Reference serialized with avro');
  });

  it('avro Reference[]', () => {
    const msg = 'tref.avro.array';
    dbg > 1 && cc.tag(msg, '===========');

    // Get schema for Reference array
    const arraySchema = new Schema({
      name: 'ReferenceArray',
      type: 'array',
      items: Reference.avroSchema.fullName,
    });

    const registry = { id: 'Pr9y3LH' };
    Reference.registerAvro({ avro, registry });
    let arrayType = Schema.registerSchema(arraySchema, { avro, registry });
    dbg > 1 && cc.tag(msg + UOK, 'array schema registered');

    // Create test array of References
    const ref1 = new Reference({
      name: 'Reference 1',
      relevance: 0.9,
      source: 'src/file1.ts',
    });
    const ref2 = new Reference({
      name: 'Reference 2',
      relevance: 0.7,
    });
    const ref3 = new Reference({
      name: 'Reference 3',
      summary: 'Third reference',
      relevance: 0.5,
      source: 'https://example.com',
    });
    const references = [ref1, ref2, ref3];

    dbg > 1 && cc.tag(msg, 'serialize Reference array');
    const buf = arrayType.toBuffer(references);
    const parsed = arrayType.fromBuffer(buf);

    // Reconstruct Reference instances from parsed data
    const reconstructed = parsed.map((r) => new Reference(r));

    expect(reconstructed).toHaveLength(3);
    expect(reconstructed[0].name).toBe('Reference 1');
    expect(reconstructed[0].relevance).toBe(0.9);
    expect(reconstructed[0].source).toBe('src/file1.ts');
    expect(reconstructed[1].name).toBe('Reference 2');
    expect(reconstructed[1].relevance).toBe(0.7);
    expect(reconstructed[2].name).toBe('Reference 3');
    expect(reconstructed[2].summary).toBe('Third reference');
    expect(reconstructed[2].relevance).toBe(0.5);
    expect(reconstructed[2].source).toBe('https://example.com');
    expect(reconstructed[0].id.base64).toBe(ref1.id.base64);
    expect(reconstructed[1].id.base64).toBe(ref2.id.base64);
    expect(reconstructed[2].id.base64).toBe(ref3.id.base64);

    dbg && cc.tag1(msg + UOK, 'Reference[] serialized with avro');
  });

  it('relevance can be zero', () => {
    const ref = new Reference({ relevance: 0 });
    expect(ref.relevance).toBe(0);
  });

  it('relevance can be one', () => {
    const ref = new Reference({ relevance: 1 });
    expect(ref.relevance).toBe(1);
  });

  it('source can be empty', () => {
    const ref = new Reference({ source: '' });
    expect(ref.source).toBe('');
  });
});
