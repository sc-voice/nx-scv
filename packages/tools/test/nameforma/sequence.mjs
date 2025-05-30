import { NameForma } from '../../index.mjs';
const { Forma, Task } = NameForma;
import { ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { S2P, S6E } = DBG.N8A;
const { Fraction } = ScvMath;
const { Unicode, ColorConsole } = Text;
const { UOK, URX, cc } = ColorConsole;

const dbg = 2;

class Sequence extends Forma {
  #steps;
  #stepIndex;

  constructor(cfg = {}) {
    super(cfg);
    const msg = `${this.prefix}.ctor`;
    let { unit = 'Step', steps = [], name = this.id, stepIndex = 0 } = cfg;

    Object.assign(this, { unit, name });

    // phrases are not externally mutable
    this.#steps = [];
    steps.forEach((p) => this.addStep(p));
    // cc.ok1(msg + UOK, ...cc.props(this), 'steps:', steps.length);
    Object.defineProperty(this, 'steps', {
      enumerable: true,
      get: () => this.#steps.map((p) => p.toString()),
    });
  }

  get progress() {
    const msg = 's6e.progress';
    const dbg = S6E.PROGRESS;
    let { unit } = this;
    let steps = this.#steps;
    let denominator = steps.length;
    let numerator = steps.reduce((a, s) => {
      return a + s.progress.value;
    }, 0);

    let p6s = new Fraction(numerator, denominator, unit);

    dbg && cc.ok1(msg + UOK, p6s);
    return p6s;
  }

  toString() {
    return `(${this.name})[${this.#steps.length}]`;
  } // s6e.toString

  addStep(cfg = {}) {
    const msg = `${this.prefix}.addStep`;
    let { unit, id: seqId } = this;
    let stepNum = this.#steps.length + 1;
    let { id = `${unit}${stepNum}`, name = 'no-name', progress } = cfg;
    let title = name;
    let s2p = new Task({ id, title, progress });
    this.#steps.push(s2p);
    // cc.ok1(msg + UOK, id + ':', s2p);
  } // s6e.addStep

  remove(value = {}) {
    const msg = 's6e.remove';
    const dbg = S6E.REMOVE;
    dbg > 2 && cc.ok(msg, value);

    let { steps: srcSteps = [] } = value;
    let { unit } = this;
    let dstSteps = this.#steps;
    let result = { removed: 0 }
    for (let i = 0; i < srcSteps.length; i++) {
      let srcStep = srcSteps[i];
      dbg > 2 && cc.ok(msg, srcStep);
      let matched = 0;
      for (let j = 0; j < dstSteps.length; j++) {
        let dstStep = dstSteps[j];
        if (srcStep.id === dstStep.id) {
          dstSteps.splice(j,1);
          dbg > 1 && cc.ok(msg, 'removed:', dstStep);
          matched = 1;
          break;
        }
      }
      if (matched) {
        result.removed++;
      } else {
        dbg > 1 && cc.bad(msg, 'ignored:', srcStep);
      }
    }
    dbg && cc.ok1(msg + UOK, result);

    return result;
  }

  update(value = {}) {
    const msg = 's6e.update';
    const dbg = S6E.UPDATE;
    dbg > 2 && cc.ok(msg, value);

    let { steps: srcSteps = [] } = value;
    let { unit } = this;
    let dstSteps = this.#steps;
    let result = { updated: 0, added: 0, }
    for (let i = 0; i < srcSteps.length; i++) {
      let srcStep = srcSteps[i];
      dbg > 2 && cc.ok(msg, srcStep);
      let matched = 0;
      for (let j = 0; j < dstSteps.length; j++) {
        let dstStep = dstSteps[j];
        if (srcStep.id === dstStep.id) {
          dstStep.patch(srcStep);
          dbg > 1 && cc.ok(msg, 'updated:', dstStep);
          matched = 1;
          break;
        }
      }
      if (matched) {
        result.updated++;
      } else {
        this.addStep(srcStep);
        dbg > 1 && cc.ok(msg, 'added:', srcStep);
      }
    }
    result.added++;
    dbg && cc.ok1(msg + UOK, result);

    return result;
  } // update

  patch(value = {}) {
    const msg = 's6e.patch';
    const dbg = S6E.PATCH;
    const { remove, update } = value;
    const removed = this.remove(remove);
    const updated = this.update(update);

    dbg && cc.ok1(msg + UOK, { updated, removed });

    return Object.assign({}, removed, updated);
  } // patch
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

describe('sequence', () => {
  it('ctor', () => {
    const msg = 's6e.ctor';
    dbg > 1 && cc.tag1(msg, '=========');
    let s6e = new Sequence();
    should(s6e.id).match(/^S6E[0-9]+$/);
    should(s6e.name).equal(s6e.id);
    should(s6e.steps.length).equal(0);
    should.deepEqual(s6e.progress, new Fraction(0, 0, 'Step'));

    dbg && cc.tag1(msg, 'default ctor');
  });
  it('addStep() recipe', () => {
    const msg = 'ts6e.recipe';
    dbg && cc.tag(msg, '=========');
    const id = 't.recipe';
    const name = 'fry egg';
    const unit = 'P';

    // Create a recipe by enumerating the steps
    let s6e = new Sequence({ unit, id, name });
    FRY_EGG.forEach((p) => s6e.addStep(p));

    dbg > 1 && cc.tag(msg, 'initial progress starts at 0F');
    let { steps } = s6e;
    let p6s = s6e.progress;
    should(p6s.denominator).equal(6);
    should(p6s.numerator).equal(0 / 300);
    should(p6s.units).equal('P');

    // steps are immutable views
    should(steps.length).equal(FRY_EGG.length);
    should(steps[3]).equal('P4. cover pan (0/1lid)');

    dbg && cc.tag1(msg + UOK, 'pan is covered');
  });
  it('TESTTESTpatch', () => {
    const msg = 'ts6e.patch';
    const id = 't.patch';
    const name = 'fry egg';
    dbg && cc.tag(msg, '===============');

    let s6e = new Sequence({ id, name, steps: FRY_EGG });
    should(s6e.steps.length).equal(FRY_EGG.length);
    should(s6e.progress.toString()).equal('0Step');
    dbg > 1 && cc.tag(msg, 'sequence created');

    s6e.patch();
    should(s6e.steps[0]).match(/0.300F/);
    should(s6e.progress.toString()).equal('0Step');
    dbg > 1 && cc.tag(msg, 'empty patch');

    s6e.patch({ update: { steps: [] } });
    should(s6e.steps[0]).match(/0.300F/);
    should(s6e.progress.toString()).equal('0Step');
    dbg > 1 && cc.tag(msg, 'patched no steps');

    let step1Patch = {
      id: 'Step1',
      progress: new Fraction(75, 300, 'F'),
    };
    let newStep = { name: 'NewStep' };
    const res3 = s6e.patch({
      remove: {
        steps: [{id:'Step6'}],
      },
      update: {
        steps: [step1Patch, newStep],
      },
    });
    should.deepEqual(res3, { removed:1, updated: 1, added: 1});
    should(s6e.steps[0]).match(/75.300F/);
    should(s6e.progress.toString()).equal('0.04Step');
    should(s6e.steps[5]).equal('Step6. NewStep (0/1done)');
    dbg && cc.tag1(msg + UOK, 'Step1 updated; NewStep added');
  });
});
