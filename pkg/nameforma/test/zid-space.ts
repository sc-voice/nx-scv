import { describe, it, expect, beforeEach } from 'vitest';
import { Entity, Forma, UUID64, ZidSpace } from '@sc-voice/nameforma';
import { logger } from '../src/logger.js';

describe('ZidSpace', () => {
  const e1 = new Entity({ name: 'entity1', summary: 'e1-summary' });
  const id1 = e1.id;
  const idb1 = id1.base64;
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
      expect(zs.size).toBe(0);
    });
    it('ctor custom', () => {
      const minChars = 8;
      const zs = new ZidSpace({ minChars });
      expect(zs.minChars).toBe(minChars);
    });
    it('addForma', () => {
      const zs = new ZidSpace();
      zs.addForma(e1);
      expect(zs.size).toBe(1);
      zs.addForma(e1s);
      expect(zs.size).toBe(2);
      zs.addForma(e2);
      expect(zs.size).toBe(3);

      // exact match
      expect(zs.getForma(e1.id.base64)).toBe(e1);
      expect(zs.getForma(e1s.id.base64)).toBe(e1s);
      expect(zs.getForma(e2.id.base64)).toBe(e2);
    });
  });
  describe('fuzzyIdOf(uuid64) returns a short zid for entity retrieval', () => {
    const ansiColor = '\x1b[33m';

    it('zid of external id is the external id', () => {
      const zs = new ZidSpace();
      zs.addForma(e1, e2);
      expect(zs.fuzzyIdOf(e3.id)).toBe(e3.id.base64);
      expect(zs.fuzzyIdOf(e3.id.base64)).toBe(e3.id.base64);
      const unknownStr = 'unknown-string';
      expect(zs.fuzzyIdOf(unknownStr)).toBe(unknownStr);
      expect(zs.fuzzyIdOf(ansiColor + unknownStr)).toBe(unknownStr);
    });
    it('getForma(zid) unique entity bound to zid', () => {
      const zs = new ZidSpace();
      zs.addForma(e1, e2);
      const { minChars } = zs;
      const zid1 = zs.fuzzyIdOf(e1.id);
      const zid2 = zs.fuzzyIdOf(e2.id);
      expect(zid1.length).toBe(minChars);
      expect(zs.getForma(zid1)).toBe(e1);
      expect(zs.getForma(zid2)).toBe(e2);

      // not found
      expect(zs.fuzzyIdOf(e3.id)).toBe(e3.id.base64);
    });
    it('zids can distinguish between ids with same signature', () => {
      const zs = new ZidSpace();
      zs.addForma(e1, e1s);
      const zid1 = zs.fuzzyIdOf(e1.id);
      const zid1s = zs.fuzzyIdOf(e1s.id);
      expect(zs.getForma(zid1)).toBe(e1);
      expect(zs.getForma(zid1s)).toBe(e1s);

      // zid1s length may differ slightly in length due to time sequence
      expect(zid1s.length).toBeGreaterThanOrEqual(zid1.length);
      expect(zid1s.length).toBeLessThanOrEqual(zid1.length + 1);
    });
    it('zids can distinguish between ids differing in time sequence', () => {
      const id1 = e1.id.base64;
      const sig1 = e1.id.getSignature();
      const timeIdX = id1.slice(0, UUID64.TIME_ID_CHARS - 1) + 'x';
      const idX = timeIdX + sig1;
      const eX = new Entity({
        id: idX,
        name: 'eX-name',
        summary: 'eX-summary',
      });
      const timeIdY = id1.slice(0, UUID64.TIME_ID_CHARS - 1) + 'y';
      const idY = timeIdY + sig1;
      const eY = new Entity({
        id: idY,
        name: 'eY-name',
        summary: 'eY-summary',
      });
      const timeIdZ = id1.slice(0, UUID64.TIME_ID_CHARS - 1) + 'z';
      const idZ = timeIdZ + sig1;
      const eZ = new Entity({
        id: idZ,
        name: 'eZ-name',
        summary: 'eZ-summary',
      });
      const zs = new ZidSpace();
      zs.addForma(e1, eX, eY, eZ);
      const zid1 = zs.fuzzyIdOf(e1.id);
      const zidX = zs.fuzzyIdOf(eX.id);
      const zidY = zs.fuzzyIdOf(eY.id);
      const zidZ = zs.fuzzyIdOf(eZ.id);
      //console.log({ zid1, zidX, zidY, zidZ });
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
      expect(zidX.length).toBe(zid1.length + 1);
      expect(zidY.length).toBe(zid1.length + 2);
      expect(zidZ.length).toBe(zid1.length + 2);

      // NOTE: collisions by time sequence exhaustion are highly improbable
      // because time sequence is 12-bits (1024 values) at millisecond resolution
    });
  });
  it('findByClass', () => {
    const f1 = new Forma({ name: 'forma1', summary: 'forma1-summary' });
    const zs = new ZidSpace();
    zs.addForma(f1, e1, e2);
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
      const zs = new ZidSpace();
      zs.addForma(e1, e2, e3);
      const kvs = Array.from(zs);
      const ids = kvs.map((kv) => kv[0]);
      const formas = kvs.map((kv) => kv[1]);

      expect(formas).toEqual([e1, e2, e3]);
      expect(ids).toEqual([e1.id.base64, e2.id.base64, e3.id.base64]);
      expect(kvs).toHaveLength(3);
    });
  });
  describe('getForma() returns Forma', () => {
    const id1 = e1.id.base64;
    const id2 = e2.id.base64;
    const id3 = e3.id.base64;

    it('getForma() returns Forma', () => {
      const zs = new ZidSpace({ minChars: 8 });
      zs.addForma(e1, e2, e3);
      const zid1 = zs.fuzzyIdOf(id1);
      const mmidUp = zid1.toUpperCase();
      const mmidDn = zid1.toLowerCase();

      expect(zs.getForma(idb1)).toBe(e1);
      expect(zs.getForma(zid1)).toBe(e1);
      expect(zs.getForma(mmidDn)).toBe(e1);
      expect(zs.getForma(mmidUp)).toBe(e1);
    });
    it('getForma() does not return Forma', () => {
      const zs = new ZidSpace();
      zs.addForma(e1, e1s, e2);

      // External id
      expect(zs.getForma(id3)).toBeUndefined();

      // non-zid substring match throws helpful error
      const mightBe = new RegExp(`might be.*${e2.id.base64}`);
      expect(() => zs.getForma(e2.id.timeId())).toThrow(mightBe);
      expect(() => zs.getForma(e2.id.getSignature())).toThrow(mightBe);
      expect(() => zs.getForma(e2.id.getSignature())).toThrow(mightBe);

      // ambiguous substring match throws helpful error
      const ambiguous = new RegExp(
        `ambiguous.*${e1.id.base64},${e1s.id.base64}`,
      );
      expect(() => zs.getForma(signature1)).toThrow(ambiguous);
    });
  });
  describe('removeForma() removes a Forma from namespace', () => {
    const id1 = e1.id.base64;
    const id2 = e2.id.base64;
    const id3 = e3.id.base64;

    it('removeForma() removes a Forma from namespace', () => {
      const zs = new ZidSpace();
      zs.addForma(e1, e2, e3);
      const zid1 = zs.fuzzyIdOf(id1);
      const mmid1 = zid1.toLowerCase();

      expect(zs.size).toBe(3);
      zs.removeForma(idb1);
      expect(zs.size).toBe(2);

      expect(zs.getForma(id1)).toBeUndefined();
      expect(zs.getForma(zid1)).toBeUndefined();
      expect(zs.getForma(mmid1)).toBeUndefined();

      expect(() => zs.getForma(id1, true)).toThrow('not found');
      expect(() => zs.getForma(zid1, true)).toThrow('not found');
      expect(() => zs.getForma(mmid1, true)).toThrow('not found');
      expect(zs.getForma(id2)).toBe(e2);
      expect(zs.getForma(id3)).toBe(e3);
    });
    it('removeForma() removes a multi-modal zid from namespace', () => {
      const zs = new ZidSpace();
      zs.addForma(e1, e2, e3);
      const zid1 = zs.fuzzyIdOf(id1);
      const mmid1 = zid1.toLowerCase();

      zs.removeForma(zid1);

      expect(zs.getForma(id2)).toBe(e2);
      expect(() => zs.getForma(id1, true)).toThrow('not found');
      expect(() => zs.getForma(zid1, true)).toThrow('not found');
      expect(() => zs.getForma(mmid1, true)).toThrow('not found');
    });
    it('removeForma() removes a multi-modal zid from namespace', () => {
      const ctx = 'zid-space:238';
      const zs = new ZidSpace();
      zs.addForma(e1, e2, e3);
      const zid2 = zs.fuzzyIdOf(id2);
      const mmid2 = zid2.toLowerCase();
      const zid1 = zs.fuzzyIdOf(id1);
      const mmid1 = zid1.toLowerCase();

      // zids are mutually unique independent of case
      expect(mmid2).not.toBe(mmid1);
      expect(mmid2).not.toBe(zid1);
      expect(zid2).not.toBe(zid1);

      expect(zs.getForma(id2)).toBe(e2);
      zs.removeForma(zid1);

      expect(() => zs.getForma(id1, true)).toThrow('not found');
      expect(() => zs.getForma(zid1, true)).toThrow('not found');
      expect(() => zs.getForma(mmid1, true)).toThrow('not found');
    });

    it('should not match deleted short zids via substring search', () => {
      const zs = new ZidSpace();
      const id1 = new UUID64();
      const str1 = id1.base64;
      const startSeq = UUID64.TIME_ID_CHARS - 2;
      const id2Str =
        str1.substring(0, startSeq) + 'xx' + str1.substring(startSeq + 2);
      const id2 = UUID64.fromString(id2Str);
      const e1 = new Entity({ id: id1, name: 'e1' });
      const e2 = new Entity({ id: id2, name: 'e2' });

      zs.addForma(e1);
      zs.addForma(e2);

      const zid1 = zs.fuzzyIdOf(e1.id);
      const zid2 = zs.fuzzyIdOf(e2.id);
      expect(zid2).toBe(zid1 + 'x');

      // Verify before deletion
      expect(zs.getForma(zid1)?.id.base64).toEqual(e1.id.base64);
      expect(zs.getForma(zid2)?.id.base64).toEqual(e2.id.base64);

      // Delete e1 using short zid
      zs.removeForma(zid1);

      // After deletion, zid1 should NOT match e2 via substring search
      expect(() => zs.getForma(zid1, true)).toThrow(id1.base64);
    });
  });
  describe('ids differ only in time sequence', () => {
    const millis = Date.now();
    const id = UUID64.create({ millis });
    const seqIndex = UUID64.TIME_ID_CHARS - 2;
    const tid = id.timeId().substring(0, seqIndex);
    const sig = id.getSignature();
    const id1 = UUID64.fromString(tid + '01' + sig);
    const id2 = UUID64.fromString(tid + '02' + sig);
    const id3 = UUID64.fromString(tid + '03' + sig);
    const e1 = new Entity({
      id: id1,
      name: 'e1-name',
      summary: 'e1-summary',
    });
    const e2 = new Entity({
      id: id2,
      name: 'e1-name',
      summary: 'e1-summary',
    });
    const e3 = new Entity({
      id: id3,
      name: 'e1-name',
      summary: 'e1-summary',
    });

    it('zids depend on insertion order', () => {
      const zsA = new ZidSpace();
      zsA.addForma(e1, e2, e3);
      const zid1A = zsA.fuzzyIdOf(e1.id);
      const zid2A = zsA.fuzzyIdOf(e2.id);
      const zid3A = zsA.fuzzyIdOf(e3.id);
      console.log(id1.base64, id2.base64, id3.base64);
      console.log({ zid1A, zid2A, zid3A });

      // same insertion order
      const zsB = new ZidSpace();
      zsB.addForma(e1, e2, e3);
      const e1B = zsB.getForma(zid1A);
      const e2B = zsB.getForma(zid2A);
      const e3B = zsB.getForma(zid3A);
      expect(e1B?.id.base64).toEqual(e1.id.base64);
      expect(e2B?.id.base64).toEqual(e2.id.base64);
      expect(e3B?.id.base64).toEqual(e3.id.base64);

      // different insertion order
      const zsC = new ZidSpace();
      zsC.addForma(e2, e3, e1);
      const zid1C = zsC.fuzzyIdOf(e1.id);
      const zid2C = zsC.fuzzyIdOf(e2.id);
      const zid3C = zsC.fuzzyIdOf(e3.id);
      const e1C = zsC.getForma(zid1C);
      const e2C = zsC.getForma(zid2C);
      const e3C = zsC.getForma(zid3C);
      expect(e1C?.id.base64).toEqual(e1.id.base64);
      expect(e2C?.id.base64).toEqual(e2.id.base64);
      expect(e3C?.id.base64).toEqual(e3.id.base64);
      expect(zid1C).not.toEqual(zid1A);
      expect(zid2C).not.toEqual(zid2A);
      expect(zid3C).not.toEqual(zid3A);
    });
  });
  describe('toJSON()/fromJSON() retains zid tables', () => {
    const roundTrip = (zs: ZidSpace) =>
      ZidSpace.fromJSON(JSON.parse(JSON.stringify(zs.toJSON())));

    it('reuses saved zids for Formas re-added after load', () => {
      const zs = new ZidSpace();
      zs.addForma(e1, e2, e3);
      const zid1 = zs.fuzzyIdOf(e1.id);
      const zid2 = zs.fuzzyIdOf(e2.id);
      const zid3 = zs.fuzzyIdOf(e3.id);

      const zsLoaded = roundTrip(zs);

      // zids are reloaded but not bound to formas
      expect(zsLoaded.minChars).toBe(zs.minChars);
      expect(zsLoaded.fuzzyIdOf(e2.id)).toBe(zid2);
      expect(zsLoaded.fuzzyIdOf(e1.id)).toBe(zid1);
      expect(zsLoaded.fuzzyIdOf(e3.id)).toBe(zid3);
      expect(zsLoaded.getForma(zid1)).toBe(undefined);

      // reload formas in any order to rebind zids
      zsLoaded.addForma(e2, e1);
      expect(zsLoaded.fuzzyIdOf(e1.id)).toBe(zid1);
      expect(zsLoaded.fuzzyIdOf(e2.id)).toBe(zid2);
      expect(zsLoaded.getForma(zid1)).toBe(e1);
      expect(zsLoaded.getForma(zid2.toLowerCase())).toBe(e2);
    });
    it('keeps zids of removed Formas as deleted', () => {
      const zs = new ZidSpace();
      zs.addForma(e1, e2);
      const zid1 = zs.fuzzyIdOf(e1.id);
      zs.removeForma(zid1);

      const zsLoaded = roundTrip(zs);
      zsLoaded.addForma(e2);
      expect(() => zsLoaded.getForma(zid1, true)).toThrow('deleted');
      expect(zsLoaded.getForma(e2.id.base64)).toBe(e2);
    });
    it('allocates a fresh zid for Formas added after save', () => {
      const zs = new ZidSpace();
      zs.addForma(e1);
      zs.fuzzyIdOf(e1.id);

      const zsLoaded = roundTrip(zs);
      zsLoaded.addForma(e3);
      const zid3 = zsLoaded.fuzzyIdOf(e3.id);
      expect(zid3).not.toBe(e3.id.base64);
      expect(zsLoaded.getForma(zid3)).toBe(e3);
    });
  });
});
