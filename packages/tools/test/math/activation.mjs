import should from 'should';

import { ScvMath, Text } from '../../index.mjs';
const { ColorConsole } = Text;
const { cc } = ColorConsole;
const { Fraction, Activation } = ScvMath;

describe('scv-math/activation', () => {
  it('ctor', () => {
    let x = 'test-x';
    let a = 'test-a';
    let b = 'test-b';
    let c = 'test-c';
    let d = 'test-d';
    let fEval = (x, a, b, c, d) => [x, a, b, c, d].join(',');
    let dEval = (x, a, b, c, d) => [x, a, b, c, d].join(';');
    let act = new Activation({ a, b, c, d, fEval, dEval });
    should(act).properties({ a, b, c, d, fEval, dEval });

    // Apply activation function
    should(act.f(x)).equal([x, a, b, c, d].join(','));
    should(act.df(x)).equal([x, a, b, c, d].join(';'));

    // Change activation parameter to modify activation
    let A = 'TEST-A';
    let B = 'TEST-B';
    let C = 'TEST-C';
    let D = 'TEST-D';
    act.a = A;
    act.b = B;
    act.c = C;
    act.d = D;
    should(act.f(x)).equal([x, A, B, C, D].join(','));
    should(act.df(x)).equal([x, A, B, C, D].join(';'));
  });
  it('createSoboleva()', () => {
    const msg = 'a8n.createSoboleva';
    const dbg = 0;
    let a = 1;
    let b = 1;
    let c = 1;
    let d = 1;
    let tanh = Activation.createSoboleva();
    for (let i = -10; i <= 10; i++) {
      let x = i / 10;
      dbg && cc.fyi(msg, 'tanh', x, tanh.f(x));
      should(Math.abs(tanh.f(x) - Math.tanh(x))).below(0.000000000000001);
    }
    let act1111 = Activation.createSoboleva(a, b, c, d);
    should.deepEqual(act1111, tanh);
  });
  it('createRareN()', () => {
    const msg = 'a8n.createRareN';
    // activate when classifying x things in a population
    // => [0:not rare, 1:rare]
    let n = 100; // population size

    // default weight
    let wDefault = 1;
    let act1 = Activation.createRareN(n, wDefault);
    should(act1.f(n)).equal(0); // ignore ubiquitous things
    should(act1.f((3 * n) / 4)).equal(0.28346868942621073);
    should(act1.f((2 * n) / 4)).equal(0.6321205588285577);
    should(act1.f((1 * n) / 4)).equal(0.950212931632136);
    should(act1.f(5)).equal(0.9999999943972036);
    should(act1.f(1)).equal(1); // singletons are always rare
    should(act1.f(0)).equal(1);
    should(act1.df(-1)).equal(0);
    should(act1.df(0)).equal(0);
    should(act1.df(1)).equal(-100);
    should(act1.df(2)).equal(-25);
    should(act1.df(3)).equal(-11.11111111111101);
    should(act1.df(50)).equal(-0.025284822353142306);
    should(act1.df(100)).equal(-0);

    // increasing weight includes less rare things
    let w2 = 2;
    let act2 = Activation.createRareN(n, w2);
    should(act2.f(n)).equal(0); // ignore ubiquitous things
    should(act2.f((3 * n) / 4)).equal(0.486582880967408);
    should(act2.f((2 * n) / 4)).equal(0.8646647167633873);
    should(act2.f((1 * n) / 4)).equal(0.9975212478233336);
    should(act2.f(5)).equal(1);
    should(act2.f(1)).equal(1); // singletons are always rare
    should(act2.f(0)).equal(1);

    // decreasing weight finds very rare things
    let w_5 = 0.5;
    let act_5 = Activation.createRareN(n, w_5);
    should(act_5.f(n)).equal(0); // ignore everyday things
    should(act_5.f((3 * n) / 4)).equal(0.15351827510938598);
    should(act_5.f((2 * n) / 4)).equal(0.3934693402873666);
    should(act_5.f((1 * n) / 4)).equal(0.7768698398515702);
    should(act_5.f(5)).equal(0.9999251481701124);
    should(act_5.f(1)).equal(1); // singletons are always rare
    should(act_5.f(0)).equal(1);
  });
  it('createElu()', () => {
    let a = 0.1;
    let x = 0.5;

    // ReLU
    let act1 = Activation.createElu();
    should(act1.f(x)).equal(x);
    should(act1.f(0)).equal(0 * -0);
    should(act1.f(-x)).equal(0 * -x);
    let act2 = Activation.createElu(0);
    should.deepEqual(act2, act1);

    // ELU
    let act3 = Activation.createElu(a);
    should(act3.f(x)).equal(x);
    should(act3.f(0)).equal(0);
    should(act3.f(-x)).equal(a * (Math.exp(-x) - 1));
  });
});
