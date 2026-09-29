import { describe, it, expect, beforeEach } from 'vitest';
import { Entity, Forma, UUID64, ZidSpace } from '@sc-voice/nameforma';

describe('ZidSpace', () => {
  const e1 = new Entity({ name: 'entity1', summary: 'e1-summary' });
  const signature1 = e1.id.getSignature();
  const id1s = UUID64.forSignature(signature1);
  const e1s = new Entity({
    id: id1s,
    name: 'entity1s',
    summary: 'summary1s',
  });
  const e2 = new Entity({ name: 'entity2', summary: 'e2-summary' });
  const e3 = new Entity({ name: 'entity3', summary: 'e3-summary' });

  describe('construction', () => {
    it('ctor defaults', () => {
      const zs = new ZidSpace();
      expect(zs.minChars).toBe(3);
    });
    it('ctor custom', () => {
      const minChars = 8;
      const zs = new ZidSpace({ minChars });
      expect(zs.minChars).toBe(minChars);
    });
    it('fromFormas', () => {
      const zs = ZidSpace.fromFormas(e1, e2, e3);

      // exact match
      expect(zs.getForma(e1.id.base64)).toBe(e1);
      expect(zs.getForma(e2.id.base64)).toBe(e2);
      expect(zs.getForma(e3.id.base64)).toBe(e3);
    });
    it('addForma', () => {
      const zs = new ZidSpace();
      zs.addForma(e1);
      zs.addForma(e1s);
      zs.addForma(e2);

      // exact match
      expect(zs.getForma(e1.id.base64)).toBe(e1);
      expect(zs.getForma(e1s.id.base64)).toBe(e1s);
      expect(zs.getForma(e2.id.base64)).toBe(e2);

      // timeId generated on same computer is exact match
      expect(zs.getForma(e1.id.timeId())).toBe(e1);
      expect(zs.getForma(e1s.id.timeId())).toBe(e1s);

      // forma not in ZidSpace returns undefined
      expect(zs.getForma(e3.id.base64)).toBe(undefined);
      expect(zs.getForma('badid')).toBe(undefined);

      // ambiguous match throws message documenting duplicates
      expect(() => zs.getForma(signature1, true)).toThrow('ambiguous match');
      expect(() => zs.getForma(signature1, true)).toThrow(signature1);
    });
  });
  describe('getForma() can handle different id formats', () => {
    it('getForma(zid) unique entity bound to zid', () => {
      const zs = ZidSpace.fromFormas(e1, e2, e3);
      const id1 = e1.id;
      expect(zs.getForma(id1.base64)).toBe(e1);
    });
  });
  describe('fuzzyIdOf(uuid64) returns a short zid for entity retrieval', () => {
    it('getForma(zid) unique entity bound to zid', () => {
      const zs = ZidSpace.fromFormas(e1, e2);
      const { minChars } = zs;
      const zid1 = zs.fuzzyIdOf(e1.id);
      const zid2 = zs.fuzzyIdOf(e2.id);
      expect(zid1.length).toBe(minChars);
      expect(zs.getForma(zid1)).toBe(e1);
      expect(zs.getForma(zid2)).toBe(e2);

      // not found
      expect(() => zs.fuzzyIdOf(e3.id)).toThrow('ZidSpace has no Forma');
      expect(() => zs.fuzzyIdOf(e3.id)).toThrow(e3.id.base64);
    });
    it('zids can distinguish between ids with same signature', () => {
      const zs = ZidSpace.fromFormas(e1, e1s);
      const zid1 = zs.fuzzyIdOf(e1.id);
      const zid1s = zs.fuzzyIdOf(e1s.id);
      expect(zs.getForma(zid1)).toBe(e1);
      expect(zs.getForma(zid1s)).toBe(e1s);

      // zid1s length may differ slightly in length due to time sequence
      expect(zid1s.length).toBeGreaterThanOrEqual(zid1.length);
      expect(zid1s.length).toBeLessThanOrEqual(zid1.length+1);
    });
    it('zids can distinguish between ids differing in time sequence', () => {
      const id1 = e1.id.base64;
      const sig1 = e1.id.getSignature();
      const timeIdX = id1.slice(0, UUID64.TIME_ID_CHARS-1) + 'x';
      const idX = timeIdX + sig1;
      const eX = new Entity({ id:idX, name: 'eX-name', summary: 'eX-summary' });
      const timeIdY = id1.slice(0, UUID64.TIME_ID_CHARS-1) + 'y';
      const idY = timeIdY + sig1;
      const eY = new Entity({ id:idY, name: 'eY-name', summary: 'eY-summary' });
      const timeIdZ = id1.slice(0, UUID64.TIME_ID_CHARS-1) + 'z';
      const idZ = timeIdZ + sig1;
      const eZ = new Entity({ id:idZ, name: 'eZ-name', summary: 'eZ-summary' });
      const zs = ZidSpace.fromFormas(e1, eX, eY, eZ);
      const zid1 = zs.fuzzyIdOf(e1.id);
      const zidX = zs.fuzzyIdOf(eX.id);
      const zidY = zs.fuzzyIdOf(eY.id);
      const zidZ = zs.fuzzyIdOf(eZ.id);
      console.log({zid1, zidX, zidY, zidZ});
      expect(zs.getForma(zid1)).toBe(e1);
      expect(zs.getForma(zidX)).toBe(eX);
      expect(zs.getForma(zidY)).toBe(eY);
      expect(zs.getForma(zidZ)).toBe(eZ);

      // a zid is substring of original UUID64
      expect(idX).toMatch(zidX);
      expect(idY).toMatch(zidY);
      expect(idZ).toMatch(zidZ);

      // a zid may be a substring of other UUID64s
      expect(idX).toMatch(zid1);
      expect(idY).toMatch(zid1);

      // Additional collisions may generate longer zids to include time sequence
      // chars.
      expect(zidX.length).toBe(zid1.length+1);
      expect(zidY.length).toBe(zid1.length+2);
      expect(zidZ.length).toBe(zid1.length+2);

      // NOTE: collisions by time sequence exhaustion are highly improbable 
      // because time sequence is 12-bits (1024 values) at millisecond resolution
    });
  });
  it('findByClass', () => {
    const f1 = new Forma({ name: 'forma1', summary: 'forma1-summary' });
    const zs = ZidSpace.fromFormas(f1, e1, e2);
    class Dummy extends Forma {}
    expect([...zs.findByClass(Dummy)]).toEqual([]);
    expect([...zs.findByClass(Forma)]).toEqual([f1, e1, e2]);
    expect([...zs.findByClass(Entity)]).toEqual([e1, e2]);
  });
  describe('iterator', () => {
    it('iterates over empty namespace', () => {
      const zs = new ZidSpace();
      const entries = Array.from(zs);
      expect(entries).toHaveLength(0);
    });

    it('iterates over multiple forma', () => {
      const zs = ZidSpace.fromFormas(e1, e2, e3);
      const kvs = Array.from(zs);
      const ids = kvs.map((kv) => kv[0]);
      const formas = kvs.map((kv) => kv[1]);

      expect(formas).toEqual([e1, e2, e3]);
      expect(ids).toEqual([e1.id.base64, e2.id.base64, e3.id.base64]);
      expect(kvs).toHaveLength(3);
    });
  });
  describe('removeForma() removes a Forma from namespace', () => {
    it('removeForma() removes a Forma from namespace', () => {
      const zs = ZidSpace.fromFormas(e1, e2, e3);
      const id1 = e1.id.base64;
      const id2 = e2.id.base64;
      const zid1 = zs.fuzzyIdOf(id1);

      expect(zs.getForma(id1)).toBe(e1);
      expect(zs.getForma(id2)).toBe(e2);
      expect(zs.getForma(zid1)).toBe(e1);

      zs.removeForma(id1);
      console.log({line:170,id1,zid1,e2:e2.id.base64,e3:e3.id.base64});

      expect(zs.getForma(id1)).toBe(undefined);
      expect(zs.getForma(id2)).toBe(e2);
      zs.getForma(zid1);
      //expect(zs.getForma(zid1)).toBe(e1);
    });
  });
});
