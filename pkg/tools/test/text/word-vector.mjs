import { describe, it, expect } from '@sc-voice/vitest';
import { Text } from '../../index.mjs';
const { WordVector } = Text;

describe('text/word-vector', () => {
  it('add()', () => {
    let v1 = new WordVector({ a: 1, b: 2 });
    let v2 = new WordVector({ b: 10, c: 10 });
    let v3 = v1.add(v2);
    expect(v3).toEqual(new WordVector({ a: 1, b: 12, c: 10 }));
  });
  it('increment()', () => {
    let v1 = new WordVector({ a: 1, b: 2 });
    let v2 = new WordVector({ b: 10, c: 10 });
    let v3 = v1.increment(v2);
    expect(v3).toBe(v1);
    expect(v3).toEqual(new WordVector({ a: 1, b: 12, c: 10 }));
  });
  it('norm()', () => {
    let a = new WordVector({ a: 2 });
    expect(a.norm()).toBe(2);
    let ab = new WordVector({ a: 1, b: 1 });
    expect(ab.norm()).toBe(Math.sqrt(2));
    let abc = new WordVector({ a: 1, b: 2, c: 3 });
    expect(abc.norm()).toBe(Math.sqrt(1 + 4 + 9));
    let cba = new WordVector({ c: 1, b: 2, a: 3 });
    expect(cba.norm()).toBe(abc.norm());
    let xy = new WordVector({ x: 10, y: 20 });
    expect(xy.norm()).toBe(Math.sqrt(100 + 400));
  });
  it('multiply()', () => {
    const msg = 'tw8r.multiply:';
    let abc = new WordVector({ a: 1, b: 2, c: 3 });
    expect(abc.multiply(abc)).toEqual(
      new WordVector({ a: 1, b: 4, c: 9 }),
    );
    let mask = new WordVector({ a: 1, d: 1 });
    expect(abc.multiply(mask)).toEqual(new WordVector({ a: 1 }));
  });
  it('dot()', () => {
    let abc = new WordVector({ a: 1, b: 2, c: 3 });
    expect(abc.dot(abc)).toBe(14);
    let ab = new WordVector({ a: 10, b: 20 });
    expect(ab.dot(abc)).toBe(50);
    expect(abc.dot(ab)).toBe(50);
    let cba = new WordVector({ a: 3, b: 2, c: 1 });
    expect(cba.dot(cba)).toBe(14);
    expect(abc.dot(cba)).toBe(10);
    let xyz = new WordVector({ x: 10, y: 11, z: 12 });
    expect(xyz.dot(abc)).toBe(0);
  });
  it('similar()', () => {
    let abc = new WordVector({ a: 1, b: 2, c: 3 });
    let ab = new WordVector({ a: 1, b: 2 });
    expect(abc.similar(abc)).toBe(1);
    expect(ab.similar(abc)).toBe(0.5976143046671968);
    expect(abc.similar(ab)).toBe(0.5976143046671968);
    expect(abc.similar(ab)).toBe(0.5976143046671968);

    let AB = new WordVector({ a: 10, b: 20 });
    expect(abc.similar(AB)).toBe(0.5976143046671968);

    let ab_c = new WordVector({ a: 1, b: 2, c: 1 });
    expect(abc.similar(ab_c)).toBe(0.8728715609439696);

    let xyz = new WordVector({ x: 1, y: 1, z: 1 });
    let wxyz = new WordVector({ w: 1, x: 1, y: 1, z: 1 });
    expect(xyz.similar(wxyz)).toBe(0.8660254037844387);
    expect(wxyz.similar(xyz)).toBe(0.8660254037844387);
  });
  it('hadamardL1', () => {
    const msg = 'tw8e.hadamardL1:';
    // L1 norm of Hadamard product
    let v1 = new WordVector({ a: 1, b: 1 });
    let v2 = new WordVector({ b: 1, c: 1 });
    let v3 = new WordVector({ a: 1, b: 0.5, c: 0.1 });

    expect(v1.hadamardL1()).toEqual(new WordVector({}));

    let i12 = v1.hadamardL1(v2);
    expect(v1.similar(v2)).toBe(0.4999999999999999);
    expect(i12).toEqual(new WordVector({ b: v1.similar(v2) }));

    let i13 = v1.hadamardL1(v3);
    expect(v1.similar(v3)).toBe(0.9449111825230679);
    expect(i13).toEqual(
      new WordVector({
        a: 0.6299407883487119,
        b: 0.31497039417435596,
      }),
    );

    expect(v2.similar(v3)).toBe(0.37796447300922714);
    let i23 = v2.hadamardL1(v3);
    expect(i23).toEqual(
      new WordVector({
        b: 0.31497039417435596,
        c: 0.0629940788348712,
      }),
    );
  });
  it('oneHot()', () => {
    let v = new WordVector({ a: 0.5, b: 2.5, c: 3, ignored: -0.1 });
    let v1 = v.oneHot();
    expect(v).not.toBe(v1);
    expect(v1).toEqual(new WordVector({ a: 1, b: 1, c: 1 }));
  });
  it('scale()', () => {
    let v = new WordVector({ a: 1, b: 2, c: 3 });
    expect(v.scale(3)).toBe(v);
    expect(v).toEqual(new WordVector({ a: 3, b: 6, c: 9 }));
  });
  it('toString()', () => {
    let v = new WordVector({
      'a@1': 1, // non-identifier keys
      a2: 0.987654321,
      a3: 0.5,
      a4: 0.49,
      a5: 0.05,
      a6: 0.049,
      a7: 0.001,
      a8: 0.0001, // not shown
    });

    // precision 1, minValue: 0.05
    let vs1 = v.toString({ precision: 1 });
    expect(vs1).toBe('a@1:1,a2:1,a3:.5,a4:.5,a5:.1,…3');

    // precision 2, minValue: 0.005
    let vs2 = v.toString({ order: 'key' });
    expect(vs2).toBe('a@1:1,a2:.99,a3:.50,a4:.49,a5:.05,a6:.05,…2');

    // order:'value', minValue: 0.0005
    let vs3 = v.toString({ precision: 3 });
    expect(vs3).toBe(
      'a@1:1,a2:.988,a3:.500,a4:.490,a5:.050,a6:.049,a7:.001,…1',
    );

    // order:'value', precision:2 minValue: 0.001
    let vs4 = v.toString({ minValue: 0.001 });
    expect(vs4).toBe('a@1:1,a2:.99,a3:.50,a4:.49,a5:.05,a6:.05,a7:0,…1');

    // show all
    let vs5 = v.toString({ minValue: 0.0001 });
    expect(vs5).toBe('a@1:1,a2:.99,a3:.50,a4:.49,a5:.05,a6:.05,a7:0,a8:0');
  });
  it('andOneHot()', () => {
    let v1 = new WordVector({ a: 1, b: 0.5, c: 2 });
    let v2 = new WordVector({ b: 1, c: 3, d: 4 });
    expect(v1.andOneHot(v2)).toEqual(new WordVector({ b: 1, c: 1 }));
  });
  it('orOneHot()', () => {
    let v1 = new WordVector({ a: 1, b: 0.5, c: 2 });
    let v2 = new WordVector({ b: 1, c: 3, d: 4 });
    expect(v1.orOneHot(v2)).toEqual(
      new WordVector({ a: 1, b: 1, c: 1, d: 1 }),
    );
  });
});
