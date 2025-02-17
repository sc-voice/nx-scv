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
  it('intersect', () => {
    const msg = 'tw8e.intersect:';
    let v1 = new WordVector({ a: 1, b: 1 });
    let v2 = new WordVector({ b: 1, c: 1 });
    let i12 = v1.intersect(v2);
    should.deepEqual(i12, new WordVector({ b: 1 }));
    should.deepEqual(v1.intersect(), new WordVector({}));
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
    should.deepEqual(v, new WordVector({ a: 3, b: 6, c: 9}));
  });
  it('TESTTESTtoString()', () => {
    let v = new WordVector({a:1, b:0.123456789, "(c)":1.002});

    let vs2 = v.toString(); // precision 2
    should(vs2).equal('a:1,b:0.12,(c):1');

    let vs3 = v.toString({precision:3});
    should(vs3).equal('a:1,b:0.123,(c):1.002');
  });
});
