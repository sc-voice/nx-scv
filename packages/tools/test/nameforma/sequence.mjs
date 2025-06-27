import { NameForma } from '../../index.mjs';
const { Forma, Task } = NameForma;
import { ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { SEQUENCE: S6E } = DBG;
const { Fraction } = ScvMath;
const { Unicode, ColorConsole } = Text;
const { UOK, URX, cc } = ColorConsole;

const dbg = DBG.SEQUENCE.TEST;

class Sequence extends Forma {
  #steps;
  #stepIndex;

  constructor(cfg = {}) {
    super(cfg);
    const msg = `${this.prefix}.ctor`;
    const dbg = S6E.CTOR;
    let {
      unit = 'Step',
      steps = [],
      //name = this.id,
      stepIndex = 0,
    } = cfg;

    Object.assign(this, { unit });

    // phrases are not externally mutable
    this.#steps = steps.reduce((a, cfg) => {
      let step = new Task(cfg);
      a.push(step);
      return a;
    }, []);
    this.#renameSteps();

    Object.defineProperty(this, 'steps', {
      enumerable: true,
      get: () => this.#steps.map((p) => p.toString()),
    });

    dbg && cc.ok1(msg + UOK, ...cc.props(this), 'steps:', steps.length);
  }

  get progress() {
    const msg = 's6e.progress';
    const dbg = S6E.PROGRESS;
    let { unit } = this;
    let steps = this.#steps;

    let numerator = steps.reduce((a, s) => {
      return a + s.progress.value;
    }, 0);
    let denominator = steps.length;

    let p6s = new Fraction(numerator, denominator, unit);

    dbg && cc.ok1(msg + UOK, p6s);
    return p6s;
  }

  toString() {
    return `(${this.name})[${this.#steps.length}]`;
  } // s6e.toString

  #renameSteps() {
    const msg = 's6e.#renameSteps';
    const dbg = S6E.RENAME_STEPS;
    let { unit } = this;
    let steps = this.#steps;
    for (let i = 0; i < steps.length; i++) {
      let step = steps[i];
      let { id, title } = step;
      let name = `${unit}${i + 1}`;
      step.patch({ name });
      dbg > 1 && cc.ok(msg, { id, name, title });
    }
    dbg && cc.ok1(msg + UOK, 'steps:', steps.length);
  }

  remove(value = {}) {
    const msg = 's6e.remove';
    const dbg = S6E.REMOVE;
    dbg > 2 && cc.ok(msg, value);

    let { steps: srcSteps = [] } = value;
    let { unit } = this;
    let dstSteps = this.#steps;
    let result = { removed: 0 };
    for (let i = 0; i < srcSteps.length; i++) {
      let srcStep = srcSteps[i];
      dbg > 2 && cc.ok(msg, srcStep);
      let matched = 0;
      for (let j = 0; j < dstSteps.length; j++) {
        let dstStep = dstSteps[j];
        if (srcStep.id === dstStep.id || srcStep.name === dstStep.name) {
          dstSteps.splice(j, 1);
          dbg > 1 && cc.ok(msg, `removed[${j}]:`, dstStep);
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

  upsert(value = {}) {
    const msg = 's6e.upsert';
    const dbg = S6E.UPSERT;
    dbg > 2 && cc.ok(msg, 'value:', value);

    let { steps: srcSteps = [] } = value;
    let { unit } = this;
    let dstSteps = this.#steps;
    let result = { updated: 0, inserted: 0 };
    let cursor = 0;
    for (let i = 0; i < srcSteps.length; i++) {
      let srcStep = srcSteps[i];
      let { id: srcId, name: srcName } = srcStep;
      dbg > 2 && cc.ok(msg, 'srcStep:', srcStep);
      let matched = 0;
      for (let j = 0; j < dstSteps.length; j++) {
        let dstStep = dstSteps[j];
        if (srcStep.name === dstStep.name) {
          cursor = j + 1;
          dstStep.patch(srcStep);
          dbg > 1 && cc.ok(msg, `updated[${j}]:`, dstStep);
          matched = 1;
          break;
        }
      }
      if (matched) {
        result.updated++;
      } else if (srcId == null && srcName == null) {
        let s2p = new Task(srcStep);
        this.#steps.splice(cursor, 0, s2p);
        result.inserted++;
        cursor++;
        dbg > 1 && cc.ok(msg, `inserted[${cursor}]:`, srcStep);
      }
    }
    dbg && cc.ok1(msg + UOK, '=>', result);

    return result;
  } // upsert

  patch(value = {}) {
    const msg = 's6e.patch';
    const dbg = S6E.PATCH;
    const { remove, upsert } = value;
    const removed = this.remove(remove);
    const upserted = this.upsert(upsert);
    this.#renameSteps();

    let result = Object.assign({}, removed, upserted);
    dbg && cc.ok1(msg + UOK, result);

    return result;
  } // patch
} // class Sequence

import should from 'should';

const FRY_EGG = [
  {
    title: '#0 heat pan medium heat',
    progress: new Fraction(0, 300, 'F'),
  },
  { title: '#1 add oil', progress: new Fraction(0, 1, 'Tbs') },
  { title: '#2 break egg into pan', progress: new Fraction(0, 2, 'Egg') },
  { title: '#3 cover pan', progress: new Fraction(0, 1, 'lid') },
  { title: '#4 cook', progress: new Fraction(0, 5, 'minutes') },
  {
    title: '#5 turn off heat and serve',
    progress: new Fraction(0, 1, 'serving'),
  },
];

describe('sequence', () => {
  it('ctor', () => {
    const msg = 's6e.ctor';
    dbg > 1 && cc.tag1(msg, '=========');
    let s6e = new Sequence();
    should(s6e.id).match(/^S6E[-0-9a-z]+$/);
    should(s6e.name).equal(s6e.id.split('-').slice(0, 2).join('-'));
    should(s6e.steps.length).equal(0);
    should.deepEqual(s6e.progress, new Fraction(0, 0, 'Step'));

    dbg && cc.tag1(msg, 'default ctor');
  });
  it('patch remove', () => {
    const msg = 'ts6e.patch';
    const id = 't.patch';
    const name = 'fry egg';
    dbg && cc.tag(msg, '===============');

    let s6e = new Sequence({ id, name, steps: FRY_EGG });
    should(s6e.steps.length).equal(FRY_EGG.length);
    should(s6e.progress.toString()).equal('0Step');
    dbg > 1 && cc.tag(msg, 'sequence created');

    should(s6e.steps[3]).match(/Step4. #3 cover pan.*$/); // remove
    should(s6e.steps[4]).match(/Step5. #4 cook.*$/); // rename
    const res1 = s6e.patch({
      remove: {
        steps: [{ name: 'Step4' }],
      },
    });
    let { steps: steps1 } = s6e;
    should(steps1[0]).match(/Step1. #0 heat pan.*$/);
    should(steps1[1]).match(/Step2. #1 add oil.*$/);
    should(steps1[2]).match(/Step3. #2 break egg.*$/);
    should(steps1[3]).match(/Step4. #4 cook.*$/); // renamed
    should(s6e.progress.toString()).equal('0Step');
    should.deepEqual(res1, { removed: 1, updated: 0, inserted: 0 });
    dbg && cc.tag1(msg + UOK, 'Step4 removed');
  });
  it('patch upsert', () => {
    const msg = 'ts6e.patch';
    const id = 't.patch';
    const name = 'fry egg';
    dbg && cc.tag(msg, '===============');

    let s6e = new Sequence({ id, name, steps: FRY_EGG });
    should(s6e.steps.length).equal(FRY_EGG.length);
    should(s6e.progress.toString()).equal('0Step');
    dbg > 1 && cc.tag(msg, 'sequence created');

    let step1Patch = {
      name: 'Step1',
      progress: new Fraction(75, 300, 'F'),
    };
    let newStep1 = { title: '#7 new-step-title-a' };
    let newStep2 = { title: '#8 new-step-title-b' };
    const res = s6e.patch({
      upsert: {
        steps: [step1Patch, newStep1, newStep2],
      },
    });
    let steps = s6e.steps;
    should(steps[0]).match(/Step1.*75.300F/);
    should(steps[1]).match(/Step2. #7 new-step-title-a.*$/);
    should(steps[2]).match(/Step3. #8 new-step-title-b.*$/);
    should(steps[3]).match(/Step4. #1 add oil.*$/);
    should(steps[4]).match(/Step5. #2 break egg.*$/);
    should(steps[5]).match(/Step6. #3 cover pan.*$/);
    should(s6e.progress.toString()).equal('0.03Step');
    should.deepEqual(res, { removed: 0, updated: 1, inserted: 2 });

    dbg &&
      cc.tag1(
        msg + UOK,
        'updated Step1 updated; inserted newStep1, newStep2',
      );
  });
});
