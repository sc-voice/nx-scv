import { describe, it, expect } from '@sc-voice/vitest';

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
    expect(act).toMatchObject({ a, b, c, d, fEval, dEval });

    // Apply activation function
    expect(act.f(x)).toBe([x, a, b, c, d].join(','));
    expect(act.df(x)).toBe([x, a, b, c, d].join(';'));

    // Change activation parameter to modify activation
    let A = 'TEST-A';
    let B = 'TEST-B';
    let C = 'TEST-C';
    let D = 'TEST-D';
    act.a = A;
    act.b = B;
    act.c = C;
    act.d = D;
    expect(act.f(x)).toBe([x, A, B, C, D].join(','));
    expect(act.df(x)).toBe([x, A, B, C, D].join(';'));
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
      expect(Math.abs(tanh.f(x) - Math.tanh(x))).toBeLessThan(0.000000000000001);
    }
    let act1111 = Activation.createSoboleva(a, b, c, d);
    expect(act1111.a).toBe(tanh.a);
    expect(act1111.b).toBe(tanh.b);
    expect(act1111.c).toBe(tanh.c);
    expect(act1111.d).toBe(tanh.d);
  });
  it('createRareN()', () => {
    const msg = 'a8n.createRareN';
    // activate when classifying x things in a population
    // => [0:not rare, 1:rare]
    let n = 100; // population size

    // default weight
    let wDefault = 1;
    let act1 = Activation.createRareN(n, wDefault);
    expect(act1.f(n)).toBe(0); // ignore ubiquitous things
    expect(act1.f((3 * n) / 4)).toBe(0.28346868942621073);
    expect(act1.f((2 * n) / 4)).toBe(0.6321205588285577);
    expect(act1.f((1 * n) / 4)).toBe(0.950212931632136);
    expect(act1.f(5)).toBe(0.9999999943972036);
    expect(act1.f(1)).toBe(1); // singletons are always rare
    expect(act1.f(0)).toBe(1);
    expect(act1.df(-1)).toBe(0);
    expect(act1.df(0)).toBe(0);
    expect(act1.df(1)).toBe(-100);
    expect(act1.df(2)).toBe(-25);
    expect(act1.df(3)).toBe(-11.11111111111101);
    expect(act1.df(50)).toBe(-0.025284822353142306);
    expect(act1.df(100)).toBe(-0);

    // increasing weight includes less rare things
    let w2 = 2;
    let act2 = Activation.createRareN(n, w2);
    expect(act2.f(n)).toBe(0); // ignore ubiquitous things
    expect(act2.f((3 * n) / 4)).toBe(0.486582880967408);
    expect(act2.f((2 * n) / 4)).toBe(0.8646647167633873);
    expect(act2.f((1 * n) / 4)).toBe(0.9975212478233336);
    expect(act2.f(5)).toBe(1);
    expect(act2.f(1)).toBe(1); // singletons are always rare
    expect(act2.f(0)).toBe(1);

    // decreasing weight finds very rare things
    let w_5 = 0.5;
    let act_5 = Activation.createRareN(n, w_5);
    expect(act_5.f(n)).toBe(0); // ignore everyday things
    expect(act_5.f((3 * n) / 4)).toBe(0.15351827510938598);
    expect(act_5.f((2 * n) / 4)).toBe(0.3934693402873666);
    expect(act_5.f((1 * n) / 4)).toBe(0.7768698398515702);
    expect(act_5.f(5)).toBe(0.9999251481701124);
    expect(act_5.f(1)).toBe(1); // singletons are always rare
    expect(act_5.f(0)).toBe(1);
  });
  it('createElu()', () => {
    let a = 0.1;
    let x = 0.5;

    // ReLU
    let act1 = Activation.createElu();
    expect(act1.f(x)).toBe(x);
    expect(act1.f(0)).toBe(0);
    expect(act1.f(-x)).toBe(-0);
    let act2 = Activation.createElu(0);
    expect(act2.a).toBe(act1.a);
    expect(act2.b).toBe(act1.b);
    expect(act2.c).toBe(act1.c);
    expect(act2.d).toBe(act1.d);

    // ELU
    let act3 = Activation.createElu(a);
    expect(act3.f(x)).toBe(x);
    expect(act3.f(0)).toBe(0);
    expect(act3.f(-x)).toBe(a * (Math.exp(-x) - 1));
  });
});
