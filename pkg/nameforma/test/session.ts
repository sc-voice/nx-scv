import { describe, it, expect } from '@sc-voice/vitest';
import { UUID64, Forma } from '@sc-voice/nameforma';
import { DBG, Session, ZidSpace } from '@sc-voice/nameforma/unstable';

describe('Session', () => {
  it('default ctor', () => {
    const session = new Session();
    expect(session.id).toBeInstanceOf(UUID64);
    expect(session.name).toBeTypeOf('string');
    expect(session.summary).toBeTypeOf('string');
    expect(session.zidSpace).toBeInstanceOf(ZidSpace);
  });
});
describe('Session serialization', () => {
  const f1 = new Forma({ name: 'f1-name', summary: 'f1-summary' });
  const f2 = new Forma({ name: 'f2-name', summary: 'f2-summary' });
  const f3 = new Forma({ name: 'f3-name', summary: 'f3-summary' });
  const sessionA = new Session();
  const { zidSpace } = sessionA;
  zidSpace.addForma(f1, f2, f3);
  const zid1 = zidSpace.fuzzyIdOf(f1.id);
  const zid2 = zidSpace.fuzzyIdOf(f2.id);
  const zid3 = zidSpace.fuzzyIdOf(f3.id);

  it('toJSON returns zid table as plain data', () => {
    const json = sessionA.toJSON() as any;
    expect(json.id).toBe(sessionA.id.toString());
    expect(json.zidSpace.zids).toEqual(zidSpace.toJSON().zids);
    expect(json.zidSpace.zids.length).toBe(3);
  });
  it('serialize', () => {
    // serialize sessionA
    const savedA = JSON.stringify(sessionA.toJSON());

    // deserialize as sessionB
    const sessionB = Session.fromJSON(JSON.parse(savedA));
    const zsB: ZidSpace = sessionB.zidSpace;
    zsB.addForma(f3, f2, f1);
    expect(zsB.getForma(zid1)?.id.base64).toBe(f1.id.base64);
  });
});
