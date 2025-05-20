import { NameForma } from '../../index.mjs';
const { Forma } = NameForma;
import { ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { S2P, S6E } = DBG.N8A;
const { Fraction } = ScvMath;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { ELLIPSIS, CHECKMARK: UOK } = Unicode;

class Step extends Forma {
  constructor(cfg = {}) {
    super({ id: cfg.id });
    let { name, progress = new Fraction(0, 1), unit = 'Step' } = cfg;
    let msStart = undefined;
    let msEnd = undefined;
    Object.assign(this, { unit, name, progress, msStart, msEnd });

    Object.defineProperty(this, 'started', {
      enumerable: true,
      get() {
        return this.msStart != null;
      },
    });
    Object.defineProperty(this, 'done', {
      enumerable: true,
      get() {
        return this.msEnd != null;
      },
    });
  } // s2p.ctor

  update(value) {
    const msg = 's2p.update';
    const dbg = S2P.UPDATE;
    const now = Date.now();
    let { msStart, msEnd, progress } = this;
    if (this.msStart == null) {
      this.msStart = now;
      dbg > 1 && cc.ok(msg, 'msStart:', now);
    }
    progress.numerator = value;
    if (msEnd == null && progress.value >= 1) {
      this.msEnd = Date.now();
      dbg > 1 && cc.ok(msg, 'msStart:', now);
    }
    dbg && cc.ok(msg + UOK, this.toString());
  } // s2p.update

  toString() {
    let { unit, id, name, progress, msStart, msEnd, done, started } = this;
    let time = '';
    let now = Date.now();
    let symbol = '.';
    let status = progress.toString({ asRange: '/' });
    if (done) {
      symbol = UOK;
      status = '' + progress.denominator + progress.units;
    } else if (started) {
      symbol = Unicode.RIGHT_GUILLEMET;
    }
    if (msStart != null) {
      let elapsed = (((msEnd || now) - msStart) / 1000).toFixed(1);
      time = ' ' + elapsed + 's';
    }

    return `${unit}${id}${symbol} ${name} (${status}${time})`;
  } // s2p.toString
} // class Step

class Sequence extends Forma {
  #steps;
  #stepIndex;

  constructor(cfg = {}) {
    super(cfg);
    const msg = `${this.prefix}.ctor`;
    let { unit = 'Step', steps = [], name = this.id, stepIndex = 0 } = cfg;

    this.#stepIndex = stepIndex;
    Object.assign(this, { unit, name });

    // phrases are not externally mutable
    this.#steps = [];
    steps.forEach((p) => this.addStep(p));
    cc.ok1(msg + UOK, ...cc.props(this), 'steps:', steps.length);
    Object.defineProperty(this, 'steps', {
      enumerable: true,
      get: () => this.#steps.map((p) => p.toString()),
    });
  }

  get stepIndex() {
    return this.#stepIndex;
  }

  progress() {
    let steps = this.#steps;
    let denominator = steps.length;
    let numerator = steps.reduce((a, s) => {
      return a + s.progress.value;
    }, 0);

    return new Fraction(numerator, denominator);
  }

  toString() {
    return `(${this.name})[${this.#steps.length}]`;
  } // s6e.toString

  addStep(cfg = {}) {
    const msg = `${this.prefix}.addStep`;
    let { unit, id: seqId } = this;
    let stepNum = this.#steps.length + 1;
    let { id = `${stepNum}`, name, progress } = cfg;
    let s2p = new Step({ unit, id, name, progress });
    this.#steps.push(s2p);
    cc.ok1(msg + UOK, id + ':', s2p);
  } // s6e.addStep

  updateStep(stepNum, value) {
    const msg = 's6e.updateStep';
    const dbg = S6E.UPDATE_STEP;
    this.#steps[stepNum - 1].update(value);
  } // s6e.updateStep
} // class Sequence

import should from 'should';

const FRY_EGG = [
  { name: 'heat pan medium heat', progress: new Fraction(0, 300, 'F') },
  { name: 'add oil', progress: new Fraction(0, 1, 'Tbs') },
  { name: 'break egg into pan', progress: new Fraction(0, 2, 'Egg') },
  { name: 'cover pan', progress: new Fraction(0, 1, 'lid') },
  { name: 'cook', progress: new Fraction(0, 5, 'minutes') },
  {
    name: 'turn off heat and serve',
    progress: new Fraction(0, 1, 'serving'),
  },
];

let dbg = 2;

describe('TESTTESTsequence', () => {
  it('ctor', () => {
    const msg = 's6e.ctor';
    dbg && cc.tag1(msg, 'START');
    let s6e = new Sequence();
    should(s6e.id).match(/^S6E[0-9]+$/);
    should(s6e.name).equal(s6e.id);
    should(s6e.steps.length).equal(0);
    should.deepEqual(s6e.progress(), new Fraction(0, 0));
    dbg && cc.tag1(msg, 'END');
  });
  it('addStep() recipe', () => {
    const msg = 'ts6e.recipe';
    dbg && cc.tag1(msg, 'START');
    const id = 't.recipe';
    const name = 'fry egg';
    const unit = 'P';

    // Create a recipe by enumerating the steps
    let s6e = new Sequence({ unit, id, name });
    should(s6e.stepIndex).equal(0);
    FRY_EGG.forEach((p) => s6e.addStep(p));

    dbg > 1 && cc.tag(msg, 'initial progress starts at 0F');
    let { steps } = s6e;
    let p6s = s6e.progress();
    should(p6s.denominator).equal(6);
    should(p6s.numerator).equal(0 / 300);
    should(p6s.units).equal(''); // unitless

    // steps are immutable views
    should(steps.length).equal(FRY_EGG.length);
    should(steps[3]).equal('P4. cover pan (0/1lid)');

    dbg && cc.tag1(msg, 'END');
  });
  it('updateStep() cook', async () => {
    const msg = 'ts6e.cook';
    const id = 't.cook';
    const name = 'fry egg';
    dbg && cc.tag1(msg, 'START');

    let s6e = new Sequence({ id, name, steps: FRY_EGG });
    should(s6e.stepIndex).equal(0);
    should(s6e.steps.length).equal(FRY_EGG.length);

    dbg > 1 && cc.tag(msg, 'room temperature pan is progress');
    s6e.updateStep(1, 70);
    let p6s = s6e.progress();
    should(s6e.steps[0]).match(new RegExp(`.*${FRY_EGG[0].name}.*`));
    should(s6e.steps[0]).match(/.*70\/300F 0.0s/);
    await new Promise((r) => setTimeout(() => r(), 100));
    should(s6e.steps[0]).match(/.*70\/300F 0.1s/);
    await new Promise((r) => setTimeout(() => r(), 100));
    s6e.updateStep(1, 80);
    should(s6e.steps[0]).match(/.*80\/300F 0.2s/);
    p6s = s6e.progress();
    should(p6s.denominator).equal(6);
    should(p6s.numerator).equal(80 / 300); // pan got warmer

    dbg > 1 && cc.tag(msg, 'pan is heated to 300F');
    await new Promise((r) => setTimeout(() => r(), 200));
    s6e.updateStep(1, 300);
    should(s6e.steps[0]).match(/.*300F 0.4s/);
    p6s = s6e.progress();
    should(p6s.denominator).equal(6);
    should(p6s.numerator).equal(1); // Step 1 done!

    dbg && cc.tag1(msg, 'END');
  });
});
