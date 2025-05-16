import should from 'should';
import { NameForma } from '../../index.mjs';
const { Forma } = NameForma;
import { ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { P3E, S6E } = DBG.N8A;
const { Fraction } = ScvMath;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { ELLIPSIS, CHECKMARK: UOK } = Unicode;

class Phase extends Forma {
  constructor(cfg = {}) {
    super({id:cfg.id});
    let { name, progress = new Fraction(0, 1) } = cfg;
    let msStart = undefined;
    let msEnd = undefined;
    Object.assign(this, { name, progress, msStart, msEnd });

    Object.defineProperty(this, 'started', {
      enumerable: true,
      get() { return this.msStart != null; },
    });
    Object.defineProperty(this, 'done', {
      enumerable: true,
      get() { return this.msEnd != null; },
    });
  }

  update(value) {
    const msg = 'p3e.update';
    const dbg = P3E.UPDATE;
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
    dbg && cc.ok(msg+UOK, this.toString());
  }

  toString() {
    let { id, name, progress, msStart, msEnd, done, started } = this;
    let time = '';
    let now = Date.now();
    let symbol = ' ';
    let status = progress.toString();
    if (done) {
      symbol = UOK;
      status = '' + progress.denominator + progress.units;
    } else if (started) {
      symbol = Unicode.RIGHT_GUILLEMET;
    }
    if (msStart != null) {
      let elapsed = (((msEnd || now) - msStart)/1000).toFixed(1);
      time = ' ' + elapsed + 's';
    }

    return `${symbol} ${id}. ${name} (${status}${time})`;
  }
}

class Sequence extends Forma {
  #phases;
  #phaseIndex;

  constructor(cfg = {}) {
    super(cfg);
    const msg = `${this.prefix}.ctor`;
    let { phases = [], name = this.id, phaseIndex = 0, } = cfg;

    this.#phaseIndex = phaseIndex;
    this.name = name;

    // phrases are not externally mutable
    this.#phases = [];
    phases.forEach(p => this.addPhase(p));
    cc.ok1(msg + UOK, ...cc.props(this), 'phases:', phases.length);
    Object.defineProperty(this, 'phases', {
      enumerable: true,
      get: () => this.#phases.map(p => p.toString()),
    });
  }

  get phaseIndex() {
    return this.#phaseIndex;
  }

  toString() {
    return `(${this.name})[${this.#phases.length}]`;
  }

  addPhase(cfg = {}) {
    const msg = `${this.prefix}.addPhase`;
    let { id: seqId } = this;
    let phaseNum = this.#phases.length + 1;
    let { id = `P${phaseNum}`, name, progress } = cfg;
    let p3e = new Phase({ id, name, progress });
    this.#phases.push(p3e);
    cc.ok1(msg + UOK, id + ':', p3e);
  }

  updatePhase(phaseNum, value) {
    const msg = 's6e.updatePhase';
    const dbg = S6E.UPDATE_PHASE;
    this.#phases[phaseNum-1].update(value)
  }

}

const FRY_EGG = [
  { name: 'heat pan medium heat', progress: new Fraction(70, 300, 'F') },
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
    let s6e = new Sequence();
    should(s6e.id).match(/^S6E[0-9]+$/);
    should(s6e.name).equal(s6e.id);
    should(s6e.phases.length).equal(0);
  });
  it('TESTTESTaddPhase() recipe', () => {
    let msg = 'ts6e.recipe';
    let id = 't.recipe';
    let name = 'fry egg';

    // Create a recipe by enumerating the steps (phases)
    let s6e = new Sequence({ id, name });
    should(s6e.phaseIndex).equal(0);
    FRY_EGG.forEach((p) => s6e.addPhase(p));
    let { phases } = s6e;

    // phases are immutable views
    should(phases.length).equal(FRY_EGG.length);
    should(phases[3]).equal('  P4. cover pan (0/1 lid)');
  });
  it('TESTTESTupdatePhase() cook', async () => {
    let msg = 'ts6e.cook';
    let id = 't.cook';
    let name = 'fry egg';
    let s6e = new Sequence({ id, name, phases: FRY_EGG });
    should(s6e.phaseIndex).equal(0);
    should(s6e.phases.length).equal(FRY_EGG.length);

    // heat pan
    s6e.updatePhase(1, 70); 
    cc.tag(msg, s6e.phases[0]);
    should(s6e.phases[0]).match(new RegExp(`.*${FRY_EGG[0].name}.*`));
    should(s6e.phases[0]).match(new RegExp(`.*70/300 F 0.0s`));
    await new Promise(r=>setTimeout(()=>r(),100));
    should(s6e.phases[0]).match(new RegExp(`.*70/300 F 0.1s`));
    await new Promise(r=>setTimeout(()=>r(),100));
    s6e.updatePhase(1, 80); 
    should(s6e.phases[0]).match(new RegExp(`.*80/300 F 0.2s`));

    await new Promise(r=>setTimeout(()=>r(),200));
    s6e.updatePhase(1, 300); 
    should(s6e.phases[0]).match(new RegExp(`.*300F 0.4s`));
  });
});
