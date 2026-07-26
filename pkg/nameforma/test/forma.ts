import { describe, it, expect } from '@sc-voice/vitest';
import {
  UUID64,
  Schema,
  Forma,
  RenderDetail,
  ZenoCoord,
  SetCommand,
  PushCommand,
} from '@sc-voice/nameforma';
import {
  FormaField,
  DBG,
  FuzzyNamespace,
} from '@sc-voice/nameforma/unstable';
import avro from 'avro-js';
import { Text } from '@sc-voice/tools';
import type { IView } from '../src/navigable-view.js';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = Math.max(0, DBG.FORMA.TEST);

class TestThing extends Forma {
  constructor(cfg = {}) {
    const msg = 't7g.ctor';
    super(cfg);
    dbg && cc.fyi1(msg, ...cc.props(this));
  }
}

describe('Forma', () => {
  it('ctor', () => {
    let f3a = new Forma();
    expect(f3a.id.validate()).toBe(true);
    expect(f3a.id.base64.includes(f3a.name)).toBe(true); // name is contained within id
    expect(f3a.summary).toBe(''); // default summary
    expect(f3a.typeName).toBe('Forma');

    let t7g = new TestThing();
    expect(t7g.id.base64.includes(t7g.name)).toBe(true); // name is contained within id
    expect(t7g.summary).toBe(''); // default summary is blank
  });
  it('updateId initialization', () => {
    const msg = 'tf3a.updateId';

    // Default: updateId initialized from id
    const f1 = new Forma();
    expect(f1.updateId).toBeDefined();
    expect(f1.updateId).toBeInstanceOf(UUID64);
    expect(f1.updateId.base64).toEqual(f1.id.base64);
    dbg > 1 && cc.tag(msg, 'default updateId from id');

    // Explicit cfg.updateId
    const customId = new UUID64();
    const f2 = new Forma({ updateId: customId });
    expect(f2.updateId.base64).toEqual(customId.base64);
    dbg > 1 && cc.tag(msg, 'explicit updateId');

    // updateId as string
    const f3 = new Forma({ updateId: customId.base64 });
    expect(f3.updateId).toBeInstanceOf(UUID64);
    expect(f3.updateId.base64).toEqual(customId.base64);
    dbg > 1 && cc.tag(msg, 'updateId from string');

    // updatedAt getter
    const f4 = new Forma();
    expect(f4.updatedAt).toStrictEqual(f4.updateId.toDate());
    expect(f4.updatedAt).toBeInstanceOf(Date);
    dbg && cc.tag1(msg + UOK, 'updatedAt getter returns date');
  });
  it('patch', () => {
    const msg = 'tf3a.patch';
    dbg > 1 && cc.tag(msg, '===============');
    const name0 = 'name0';
    const summary0 = 'summary0';
    let f3a = new Forma({ name: name0, summary: summary0 });
    expect(f3a.validate({ defaultNameId: true })).toBe(true);

    // patch does not change immutable fields
    const { id } = f3a;
    const p1 = f3a.patch({ id: 'newId' });
    expect(f3a.id).toBe(id);
    expect(p1).toEqual({});
    dbg > 1 && cc.tag(msg, 'id is immutable');

    // patch changes mutable fields and returns changed old values
    const p2 = f3a.patch({ name: 'name2' });
    expect(f3a.id).toBe(id);
    expect(f3a.updatedAt).toStrictEqual(f3a.updateId.toDate());
    expect(p2.name).toEqual(name0);
    expect(p2.summary).toEqual(undefined);
    expect(f3a.name).toBe('name2');
    dbg > 1 && cc.tag(msg, 'name is mutable');

    // patch changes mutable fields and returns changed old values
    const p3 = f3a.patch({ name: 'name2', summary: 'summary3' });
    expect(f3a.id).toBe(id);
    expect(f3a.name).toBe('name2');
    expect(f3a.summary).toBe('summary3');
    expect(p3).properties({ summary: summary0 }); // only summary changed from default
    dbg && cc.tag1(msg + UOK, 'summary is mutable');

    // patch ignores irrelevant properties
    const p4 = f3a.patch({ summary: 'summary4', color: 'red' });
    expect(p4).properties({ summary: 'summary3' });
    expect(f3a.name).toBe('name2');
    expect(f3a.summary).toBe('summary4');
  });
  it('replace', () => {
    const name = 'name0';
    const summary = 'summary0';
    let f3a = new Forma({ name, summary });
    const id0 = f3a.id;

    // replace call 1: reset summary to default
    f3a.replace({ name: 'name1' });
    expect(f3a.id).toBe(id0);
    expect(f3a.name).toBe('name1');
    expect(f3a.summary).toBe('');

    // replace call 2: reset name to new default
    const updateId2 = new UUID64();
    f3a.replace({ summary: 'summary2' });
    expect(f3a.id).toBe(id0);
    expect(f3a.name).not.toBe('name1');
    expect(f3a.summary).toBe('summary2');
    expect(id0.timeId()).not.toEqual(f3a.name);

    // replace call 3: updateId as string
    const updateId3 = new UUID64();
    f3a.replace({ updateId: updateId3.base64 });
    expect(f3a.updateId.base64).toBe(updateId3.base64);

    // replace call 4: default updateId is time of replace()
    const idBefore = new UUID64();
    f3a.replace({ name: 'name4' });
    const idAfter = new UUID64();
    expect(f3a.name).toBe('name4');
    expect(idBefore < f3a.updateId.base64).toBe(true);
    expect(f3a.updateId.base64 < idAfter).toBe(true);
  });
  it('replace throws', () => {
    const name = 'name0';
    const summary = 'summary0';
    let f3a = new Forma({ name, summary });

    // id is immutable
    expect(() => f3a.replace({ id: 'newId', name: 'name1' })).toThrow();
  });
  it('avro Forma defaultRegistry', () => {
    const msg = 'tf3a.avro';
    dbg > 1 && cc.tag(msg, '===========');

    const id = new UUID64();
    const schema = Forma.avroSchema;
    const { fullName } = schema;
    let avroType = Forma.registerAvro({ avro });
    expect(avroType._name).toEqual(fullName);
    expect(Schema.REGISTRY[fullName]).toBe(avroType);
    expect(Schema.REGISTRY.id).toBe('defaultRegistry');
    expect(Object.keys(Schema.REGISTRY).sort()).toEqual(
      [
        'id',
        'scvoice.nameforma.UUID64',
        'scvoice.nameforma.Identifiable',
        'scvoice.nameforma.Forma',
        'bytes',
        'string',
      ].sort(),
    );

    dbg > 1 && cc.tag(msg, 'serialize with schema');
    const thing1 = new Forma({ id });
    let buf = avroType.toBuffer(thing1);
    let parsed = avroType.fromBuffer(buf);
    let thing2 = new Forma(parsed);
    expect(thing2).toEqual(thing1);
    dbg && cc.tag1(msg + UOK, 'Forma serialized with avro');
  });

  it('asRenderData', () => {
    const f = new Forma({
      name: 'test-forma',
      summary: 'A test forma for verification',
    });

    const createMockView = (detail: RenderDetail | number): IView => {
      const ns = new FuzzyNamespace();
      ns.addForma(f);
      const mockAnchor: any = Object.create(Object.getPrototypeOf(f));
      Object.assign(mockAnchor, f);
      Object.defineProperty(mockAnchor, 'namespace', {
        get: () => ns,
        configurable: true,
      });
      return {
        anchor: mockAnchor,
        pivot: null as any,
        namespace: ns,
        detail,
        zenoCoord: ZenoCoord.fromRenderDetail(detail),
        bodyIndent: '  ',
        theme: {
          nfLabel: (t: string) => 'nfLabel-' + t,
          nfBoundary: (t: string) => 'nfBoundary-' + t,
          nfLink: (t: string) => 'nfLink-' + t,
          nfNominal: (t: string) => 'nfNominal-' + t,
          nfWarn: (t: string) => 'nfWarn-' + t,
          nfAttend: (t: string) => 'nfAttend-' + t,
          nfAway: (t: string) => 'nfAway-' + t,
          nfNote: (t: string) => 'nfNote-' + t,
        },
        setAnchor: () => {},
        setPivot: () => {},
        setBodyIndent: () => {},
        setTheme: () => {},
        zoomTo: () => {},
      };
    };

    // All (anchor>=2): 3 FormaFields with full id, name, summary
    const dataAll = f.asRenderData(createMockView(RenderDetail.All));
    expect(Array.isArray(dataAll)).toBe(true);
    expect(dataAll).toHaveLength(2);
    expect(Array.isArray(dataAll[0])).toBe(true);
    expect(dataAll[0][0]).toBeInstanceOf(FormaField);
    expect(dataAll[0][0].name).toBe('id');
    expect(dataAll[0][0].mutable).toBe(false);
    expect(dataAll[0][1]).toBeInstanceOf(FormaField);
    expect(dataAll[0][1].name).toBe('name');
    expect(dataAll[0][1].value).toBe('test-forma');
    expect(dataAll[1][0]).toBeInstanceOf(FormaField);
    expect(dataAll[1][0].name).toBe('summary');
    expect(dataAll[1][0].value).toBe(
      'nfNote-A test forma for verification',
    );

    // Row (anchor=0): single row with id, name, summary
    const ns = new FuzzyNamespace();
    ns.addForma(f);
    const dataRow = f.asRenderData(createMockView(RenderDetail.Row));
    expect(Array.isArray(dataRow)).toBe(true);
    expect(dataRow).toHaveLength(3);
    expect(dataRow[0]).toBeInstanceOf(FormaField);
    expect(dataRow[1]).toBe('test-forma');
    expect(dataRow[2]).toBe('nfNote-A test forma for verification');
  });

  it('classes', () => {
    const msg = 'tc5s';
    class ClassA {
      static register() {
        return this.avroSchema;
      }

      static get avroSchema() {
        return 'schemaA';
      }
    }

    class ClassB extends ClassA {
      static get avroSchema() {
        return 'schemaB';
      }

      static register() {
        return 'CLASSB' + super.register();
      }
    }

    expect(ClassA.register()).toBe(ClassA.avroSchema);
    dbg && cc.ok(msg + UOK, 'ClassA:', ClassA.register());

    expect(ClassB.register()).toBe('CLASSB' + ClassB.avroSchema);
    dbg && cc.ok1(msg + UOK, 'ClassB:', ClassB.register());
  });

  it('$parentId generates child with parent signature', () => {
    const msg = 'tf3a.$parentId';

    // Parent forma
    const parent = new Forma({ name: 'parent' });
    const parentSig = parent.id.getSignature();

    // Child forma with $parentId
    const child = new Forma({ $parentId: parent.id, name: 'child' });
    const childSig = child.id.getSignature();

    expect(childSig).toBe(parentSig);
    expect(parent.id.isRelated(child.id)).toBe(true);
    dbg && cc.ok1(msg + UOK, 'child signature matches parent');
  });

  it('$parentId with explicit id validates signature', () => {
    const msg = 'tf3a.$parentId.explicit';

    const parent = new Forma({ name: 'parent' });
    const relatedId = UUID64.createRelatedId(parent.id);

    // Create child with explicit related id and $parentId
    const child = new Forma({
      id: relatedId,
      $parentId: parent.id,
      name: 'child',
    });

    expect(child.id.getSignature()).toBe(parent.id.getSignature());
    dbg && cc.ok1(msg + UOK, 'explicit related id validated');
  });

  it('$parentId throws on signature mismatch', () => {
    const msg = 'tf3a.$parentId.mismatch';

    const parent1 = new Forma({ name: 'parent1' });
    const parent2 = new Forma({ name: 'parent2' });
    const unrelatedId = new UUID64();

    expect(() => {
      new Forma({
        id: unrelatedId,
        $parentId: parent1.id,
        name: 'child',
      });
    }).toThrow(/signature mismatch/);

    dbg && cc.ok1(msg + UOK, 'signature mismatch detected');
  });

  it('$parentId with string parent id', () => {
    const msg = 'tf3a.$parentId.string';

    const parent = new Forma({ name: 'parent' });
    const parentIdStr = parent.id.base64;

    // Use string parent id
    const child = new Forma({
      $parentId: parentIdStr,
      name: 'child',
    });

    expect(child.id.getSignature()).toBe(parent.id.getSignature());
    dbg && cc.ok1(msg + UOK, 'string parent id works');
  });

  it('mutate applies SetCommand', () => {
    const msg = 'tf3a.mutate.set';
    const forma = new Forma({
      name: 'original',
      summary: 'original summary',
    });
    const idBase64 = forma.id.base64;

    const cmd = new SetCommand(idBase64, {
      name: 'updated',
      summary: 'new',
    });
    forma.applyCommand(cmd);

    expect(forma.name).toBe('updated');
    expect(forma.summary).toBe('new');
    dbg && cc.ok1(msg + UOK, 'SetCommand applied');
  });

  it('mutate throws on SetCommand with mismatched id', () => {
    const msg = 'tf3a.mutate.mismatch';
    const forma = new Forma({ name: 'original' });
    const wrongId = new UUID64().base64;

    const cmd = new SetCommand(wrongId, { name: 'hacked' });
    expect(() => forma.applyCommand(cmd)).toThrow('targets different id');
    expect(forma.name).toBe('original'); // unchanged
    dbg && cc.ok1(msg + UOK, 'id mismatch throws');
  });

  it('mutate throws on unsupported command type', () => {
    const msg = 'tf3a.mutate.unsupported';
    const forma = new Forma();
    const cmd = new PushCommand(forma.id.base64, { tags: 'new' });

    expect(() => forma.applyCommand(cmd)).toThrow('not supported');
    dbg && cc.ok1(msg + UOK, 'unsupported command throws');
  });
});
