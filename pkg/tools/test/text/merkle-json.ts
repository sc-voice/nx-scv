import { describe, it, expect } from '@sc-voice/vitest';
import { Text } from '../../src/index.ts';
const { MerkleJson } = Text;

// Supercedes NPM package merkle-json
describe('text/merkle-json', () => {
  it('hash(string) calculates hash code', () => {
    const mj = new MerkleJson();

    // MD5 test
    expect(mj.hash(''), 'd41d8cd98f00b204e9800998ecf8427e');
    expect(mj.hash('hello\n'), 'b1946ac92492d2347c6235b4d2611184');
    expect(mj.hash(' '), '7215ee9c7d9dc229d2921a40e899ec5f');
    expect(mj.hash('HTML'), '4c4ad5fca2e7a3f74dbb1ced00381aa4');

    // UNICODE should "kinda work" but perhaps not as other expect
    // expect(
    //   mj.hash('\u2190'),
    //   'fe98e12bb396ee46bf88efa6fc55ac08');
    // other MD5
    expect(mj.hash('\u2190'), '5adcb503750876bb69cfc0a9289f9fb8'); // hmmmm....
    expect(mj.hash('\u2190'), mj.hash('\u2191')); // kinda work

    // semantic test
    expect(mj.hash('hello'), mj.hash('hello'));
    expect(mj.hash('goodbye'), mj.hash('hello'));
  });
  it('hash(Date) calculates hash code', () => {
    const mj = new MerkleJson();
    const t = new Date(Date.UTC(2018, 1, 14));
    const obj = {
      t,
    };
    expect(mj.hash(obj)).toBe(
      mj.hash({
        t: new Date(Date.UTC(2018, 1, 14)),
      }),
    );
    expect(mj.hash(obj)).not.toBe(
      mj.hash({
        t: new Date(Date.UTC(2018, 1, 15)),
      }),
    );
    expect(mj.hash(obj)).toMatch(/b6777f0/);
    expect(mj.hash(obj)).toBe(
      mj.hash({
        t: t.toJSON(),
      }),
    );
  });
  it('hash(Array) calculates hash code', () => {
    const mj = new MerkleJson();
    expect(mj.hash(['HTML']), mj.hash(mj.hash('HTML')));
    expect(mj.hash(['HT', 'ML']), mj.hash(mj.hash('HT') + mj.hash('ML')));
    expect(mj.hash([1, 2]), mj.hash(mj.hash('1') + mj.hash('2')));
  });
  it('hash(number) calculates hash code', () => {
    const mj = new MerkleJson();
    expect(mj.hash('123'), mj.hash(123));
    expect(mj.hash('123.456'), mj.hash(123.456));
  });
  it('hash(null) calculates hash code', () => {
    const mj = new MerkleJson();
    expect(mj.hash('null'), mj.hash(null));
  });
  it('hash(undefined) calculates hash code', () => {
    const mj = new MerkleJson();
    expect(mj.hash('undefined'), mj.hash(undefined));
  });
  it('hash(boolean) calculates hash code', () => {
    const mj = new MerkleJson();
    expect(mj.hash(true), mj.hash('true'));
  });
  it('hash(function) calculates hash code', () => {
    const mj = new MerkleJson();
    function f(x: number): number {
      return x * x;
    }
    const fstr = f.toString();
    const g = (x: number) => x * x;
    const gstr = g.toString();

    expect(mj.hash(f), mj.hash(fstr));
    expect(mj.hash(g), mj.hash(gstr));
  });
  it('hash(object,useMerkle) calculates hash code', () => {
    const mj = new MerkleJson({
      hashTag: 'myHashTag',
    });
    expect(mj.hash({ a: 1 }), mj.hash('a:' + mj.hash(1) + ','));
    expect(
      mj.hash({ a: 1, b: 2 }),
      mj.hash('a:' + mj.hash(1) + ',b:' + mj.hash(2) + ','),
    );
    expect(
      mj.hash({ b: 2, a: 1 }),
      mj.hash('a:' + mj.hash(1) + ',b:' + mj.hash(2) + ','),
    ); // keys are ordered
    const drives = {
      drives: [
        { type: 'BeltDrive', maxPos: 100 },
        { type: 'BeltDrive' },
        { type: 'ScrewDrive' },
      ],
      myHashTag: '2d21a6576194aeb1de7aea4d6726624d',
    };
    let hash100 = mj.hash(drives);
    (drives.drives[0] as Record<string, unknown>).maxPos = 101;

    // honor Merkle hashtTags
    const hash101 = mj.hash(drives);
    expect(hash100).toBe(hash101);

    // treat Merkle hashTags like regular properties
    const hash101b = mj.hash(drives, false);
    expect(hash100).not.toBe(hash101b);

    // documentation
    const hash = mj.hash({ size: { w: 100, h: 200 } });
    expect(hash).toBe('e77b735125fec27a61c6f54b17fb6221');
  });
  it('hash(object) returns existing hash code if present', () => {
    const mj = new MerkleJson();
    const hfoo = mj.hash('foo');
    expect(mj.hash({ merkleHash: hfoo }), hfoo);
    expect(mj.hash({ merkleHash: hfoo, anything: 'do-not-care' }), hfoo);
    expect(
      mj.hash([{ merkleHash: hfoo, anything: 'do-not-care' }]),
      mj.hash(hfoo),
    );
    expect(mj.hash({ merkleHash: 'some-hash', a: 1 }), 'some-hash');
  });
  it('hash(object) ignores toJSON', () => {
    class TestClass {
      color: string;
      random: number;

      constructor() {
        this.color = 'red'; // serialized
        this.random = Math.random(); // not-serialized
      }
      toJSON(): Record<string, unknown> {
        return {
          color: this.color,
        };
      }
    }
    const obj = (() => {
      const o: Record<string, string> = {};
      o.color = 'red';
      return o;
    })();
    const mj = new MerkleJson();

    // The random property affects the hash
    const tc1 = new TestClass();
    const tc2 = new TestClass();
    const hash1 = mj.hash(tc1);
    const hash2 = mj.hash(tc2);
    expect(hash1).not.toBe(hash2);

    // Call toJSON() to hash unserialized properties
    const hash1b = mj.hash(tc1.toJSON());
    const hash2b = mj.hash(tc2.toJSON());
    expect(hash1b).toBe(hash2b);
  });
  it('hash(object) does not re-compute object having Merkle hash tags', () => {
    const mj = new MerkleJson();

    // if Merkle hash tag is present, honor it and do not calculate hash
    let useMerkleHash = true;
    let hash = mj.hash(
      {
        any1: 'thing1', // not hashed
        any2: 'thing2', // not hashed
        any3: 'thing3', // not hashed
        merkleHash: 'e77b735125fec27a61c6f54b17fb6221',
      },
      useMerkleHash,
    );
    expect(hash).toBe('e77b735125fec27a61c6f54b17fb6221');

    // force hash tag recalculation
    useMerkleHash = false;
    hash = mj.hash(
      {
        any1: 'thing1', // not hashed
        any2: 'thing2', // not hashed
        any3: 'thing3', // not hashed
        merkleHash: 'e77b735125fec27a61c6f54b17fb6221', // ignored
      },
      useMerkleHash,
    );
    expect(hash).toBe('441e4f8dabdc6cb17dc9500cee73155b');

    // Merkle hash tags do not affect hash
    hash = mj.hash({
      any1: 'thing1', // not hashed
      any2: 'thing2', // not hashed
      any3: 'thing3', // not hashed
    });
    expect(hash).toBe('441e4f8dabdc6cb17dc9500cee73155b');
  });
  it('stringify(obj) serialize object canonically', () => {
    const obj1 = {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    };
    const obj2 = {
      d: 4,
      a: 1,
      c: 3,
      b: 2,
    };
  });
  it('stringify(obj) serialize arrays canonically', () => {
    const obj1 = {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    };
    const obj2 = {
      d: 4,
      a: 1,
      c: 3,
      b: 2,
    };
    const mj = new MerkleJson();

    const list1 = [1, 2, obj1];
    const list2 = [1, 2, obj2];

    expect(mj.stringify(list1)).toBe('[1,2,{"a":1,"b":2,"c":3,"d":4}]');
    expect(mj.stringify(list1)).toBe(JSON.stringify(list1));

    expect(mj.stringify(list2)).toBe('[1,2,{"a":1,"b":2,"c":3,"d":4}]');
    expect(mj.stringify(list2)).not.toBe(JSON.stringify(list2));

    // Arrays are stringify canonically
    expect(mj.stringify(list1)).toBe(mj.stringify(list2));
  });
  it('stringify(obj) serializes atomic values', () => {
    const mj = new MerkleJson();
    expect(mj.stringify(true)).toBe(JSON.stringify(true));
    expect(mj.stringify(false)).toBe(JSON.stringify(false));
    expect(mj.stringify(undefined)).toBe(JSON.stringify(undefined));
    expect(mj.stringify(null)).toBe(JSON.stringify(null));
    expect(mj.stringify(() => 1)).toBe(JSON.stringify(() => 1));
    function f(a: number): number {
      return a + 1;
    }
    expect(mj.stringify(f)).toBe(JSON.stringify(f));
    const t = new Date();
    expect(mj.stringify(t)).toBe(JSON.stringify(t));
    expect(mj.stringify(-1 / 3)).toBe(JSON.stringify(-1 / 3));
  });
  it('stringify(obj) honors toJSON() method of object', () => {
    const mj = new MerkleJson();
    class TestObj {
      a: number;
      random: number;

      constructor(a: number) {
        this.a = a;
        this.random = Math.random();
      }
      toJSON(): Record<string, number> {
        return {
          a: this.a,
        };
      }
    }

    const obj = new TestObj(1);
    expect(mj.stringify(obj)).toBe('{"a":1}');
  });
  it('hash(object) inside toJSON()', () => {
    const mj = new MerkleJson();
    class TestClass {
      color: string;
      merkleHash?: string;

      constructor() {
        this.color = 'red';
      }

      toJSON(): TestClass {
        this.merkleHash = mj.hash(this, true);
        return this;
      }
    }
    const obj = new TestClass();
    const merkleHash = mj.hash({ color: 'red' });
    const json = JSON.stringify(obj);
    expect(json).toBe(
      JSON.stringify({
        color: 'red',
        merkleHash,
      }),
    );
    expect(mj.hash(JSON.parse(json))).toBe(merkleHash);
  });
});
