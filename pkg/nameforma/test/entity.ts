import { describe, it, expect } from '@sc-voice/vitest';
import { Forma, Entity } from '@sc-voice/nameforma';
import { DBG } from '@sc-voice/nameforma/unstable';
import { Text } from '@sc-voice/tools';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = DBG.ENTITY?.TEST || 0;

class AnEntity extends Entity {
  static readonly entity = 'test-entity';

  protected override populateNamespace(): void {}
}

class NotAnEntity extends Forma {
  constructor(cfg: any = {}) {
    super(cfg);
  }
}

describe('Entity.parentIdFor', () => {
  it('returns parent id for non-Entity Forma subclass', () => {
    const msg = 'te.parentIdFor.non-entity';
    const parent = new AnEntity({ name: 'parent' });

    const parentId = Entity.parentIdFor(parent, NotAnEntity);
    expect(parentId).toBe(parent.id);
    dbg && cc.tag1(msg + UOK, 'returns parent.id for Forma subclass');
  });

  it('returns undefined for Entity subclass with parent', () => {
    const msg = 'te.parentIdFor.entity-subclass';
    const parent = new AnEntity({ name: 'parent' });

    const parentId = Entity.parentIdFor(parent, AnEntity);
    expect(parentId).toBeUndefined();
    dbg && cc.tag1(msg + UOK, 'returns undefined for Entity subclass');
  });

  it('returns undefined when parent is null', () => {
    const msg = 'te.parentIdFor.no-parent';
    const parentId = Entity.parentIdFor(null, NotAnEntity);
    expect(parentId).toBeUndefined();
    dbg && cc.tag1(msg + UOK, 'returns undefined when parent is null');
  });

  it('returns undefined for Entity subclass without parent', () => {
    const msg = 'te.parentIdFor.entity-no-parent';
    const parentId = Entity.parentIdFor(null, AnEntity);
    expect(parentId).toBeUndefined();
    dbg &&
      cc.tag1(msg + UOK, 'returns undefined for Entity without parent');
  });
});
