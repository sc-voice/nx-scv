import should from 'should';
import { Text } from '../../index.mjs';
const { WordVector } = Text;

describe('text/word-vector', () => {
  it('add()', () => {
    let v1 = new WordVector({ a: 1, b: 2 });
    let v2 = new WordVector({ b: 10, c: 10 });
    let v3 = v1.add(v2);
    should.deepEqual(v3, new WordVector({ a: 1, b: 12, c: 10 }));
  });
  it('increment()', () => {
    let v1 = new WordVector({ a: 1, b: 2 });
    let v2 = new WordVector({ b: 10, c: 10 });
    let v3 = v1.increment(v2);
    should(v3).equal(v1);
    should.deepEqual(v3, new WordVector({ a: 1, b: 12, c: 10 }));
  });
  it('norm()', () => {
    let a = new WordVector({ a: 2 });
    should(a.norm()).equal(2);
    let ab = new WordVector({ a: 1, b: 1 });
    should(ab.norm()).equal(Math.sqrt(2));
    let abc = new WordVector({ a: 1, b: 2, c: 3 });
    should(abc.norm()).equal(Math.sqrt(1 + 4 + 9));
    let cba = new WordVector({ c: 1, b: 2, a: 3 });
    should(cba.norm()).equal(abc.norm());
    let xy = new WordVector({ x: 10, y: 20 });
    should(xy.norm()).equal(Math.sqrt(100 + 400));
  });
  it('TESTTESTmultiply()', () => {
    const msg = 'tw8r.multiply:';
    let abc = new WordVector({ a: 1, b: 2, c: 3 });
    should.deepEqual(
      abc.multiply(abc),
      new WordVector({ a: 1, b: 4, c: 9 }),
    );
    let mask = new WordVector({ a: 1, d: 1 });
    should.deepEqual(abc.multiply(mask), new WordVector({ a: 1 }));
  });
  it('dot()', () => {
    let abc = new WordVector({ a: 1, b: 2, c: 3 });
    should(abc.dot(abc)).equal(14);
    let ab = new WordVector({ a: 10, b: 20 });
    should(ab.dot(abc)).equal(50);
    should(abc.dot(ab)).equal(50);
    let cba = new WordVector({ a: 3, b: 2, c: 1 });
    should(cba.dot(cba)).equal(14);
    should(abc.dot(cba)).equal(10);
    let xyz = new WordVector({ x: 10, y: 11, z: 12 });
    should(xyz.dot(abc)).equal(0);
  });
  it('similar()', () => {
    let abc = new WordVector({ a: 1, b: 2, c: 3 });
    let ab = new WordVector({ a: 1, b: 2 });
    should(abc.similar(abc)).equal(1);
    should(ab.similar(abc)).equal(0.5976143046671968);
    should(abc.similar(ab)).equal(0.5976143046671968);
    should(abc.similar(ab)).equal(0.5976143046671968);

    let AB = new WordVector({ a: 10, b: 20 });
    should(abc.similar(AB)).equal(0.5976143046671968);

    let ab_c = new WordVector({ a: 1, b: 2, c: 1 });
    should(abc.similar(ab_c)).equal(0.8728715609439696);

    let xyz = new WordVector({ x: 1, y: 1, z: 1 });
    let wxyz = new WordVector({ w: 1, x: 1, y: 1, z: 1 });
    should(xyz.similar(wxyz)).equal(0.8660254037844387);
    should(wxyz.similar(xyz)).equal(0.8660254037844387);
  });
  it('TESTTESThadamardL1', () => {
    const msg = 'tw8e.hadamardL1:';
    // L1 norm of Hadamard product
    let v1 = new WordVector({ a: 1, b: 1 });
    let v2 = new WordVector({ b: 1, c: 1 });
    let v3 = new WordVector({ a: 1, b: 0.5, c: 0.1 });

    should.deepEqual(v1.hadamardL1(), new WordVector({}));

    let i12 = v1.hadamardL1(v2);
    should(v1.similar(v2)).equal(0.4999999999999999);
    should.deepEqual(i12, new WordVector({ b: v1.similar(v2) }));

    let i13 = v1.hadamardL1(v3);
    should(v1.similar(v3)).equal(0.9449111825230679);
    should.deepEqual(
      i13,
      new WordVector({
        a: 0.6299407883487119,
        b: 0.31497039417435596,
      }),
    );

    should(v2.similar(v3)).equal(0.37796447300922714);
    let i23 = v2.hadamardL1(v3);
    should.deepEqual(
      i23,
      new WordVector({
        b: 0.31497039417435596,
        c: 0.0629940788348712,
      }),
    );
  });
  it('oneHot()', () => {
    let v = new WordVector({ a: 0.5, b: 2.5, c: 3, ignored: -0.1 });
    let v1 = v.oneHot();
    should(v).not.equal(v1);
    should.deepEqual(v1, new WordVector({ a: 1, b: 1, c: 1 }));
  });
  it('scale()', () => {
    let v = new WordVector({ a: 1, b: 2, c: 3 });
    should(v.scale(3)).equal(v);
    should.deepEqual(v, new WordVector({ a: 3, b: 6, c: 9 }));
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
    should(vs1).equal('a@1:1,a2:1,a3:.5,a4:.5,a5:.1');

    // precision 2, minValue: 0.005
    let vs2 = v.toString({ order: 'key' });
    should(vs2).equal('a@1:1,a2:.99,a3:.50,a4:.49,a5:.05,a6:.05');

    // order:'value', minValue: 0.0005
    let vs3 = v.toString({ precision: 3 });
    should(vs3).equal(
      'a@1:1,a2:.988,a3:.500,a4:.490,a5:.050,a6:.049,a7:.001',
    );

    // order:'value', precision:2 minValue: 0.001
    let vs4 = v.toString({ minValue: 0.001 });
    should(vs4).equal(
      'a@1:1,a2:.99,a3:.50,a4:.49,a5:.05,a6:.05,a7:0',
    );
  });
  it('TESTTESTandOneHot()', () => {
    let v1 = new WordVector({ a: 1, b: 0.5, c: 2 });
    let v2 = new WordVector({ b: 1, c: 3, d: 4 });
    should.deepEqual(
      v1.andOneHot(v2),
      new WordVector({ b: 1, c: 1 }),
    );
  });
  it('TESTTESTorOneHot()', () => {
    let v1 = new WordVector({ a: 1, b: 0.5, c: 2 });
    let v2 = new WordVector({ b: 1, c: 3, d: 4 });
    should.deepEqual(
      v1.orOneHot(v2),
      new WordVector({ a: 1, b: 1, c: 1, d: 1 }),
    );
  });
});
