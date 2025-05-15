
import should from 'should';
import { NameForma } from '../../index.mjs';
const { Forma } = NameForma;
import { ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Fraction } = ScvMath;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

class Phase extends Forma {
  constructor(cfg={}) {
    super(cfg);
    let {
      name,
      progress = new Fraction(0,1), 
    } = cfg;
    Object.assign(this, {name, progress });
  }

  toString() {
    let { name, progress } = this;
    return `${name} (${progress})`;
  }
}

class Sequence extends Forma {
  #age;
  #phases;
  #phaseIndex;

  constructor(cfg={}) {
    super(cfg);
    const msg = `${this.prefix}.ctor`;
    let {
      phases = [],
      name = this.id,
      phaseIndex = 0,
      age = 0,
    } = cfg;

    this.#age = age;
    this.#phaseIndex = phaseIndex;
    this.name = name;
    Object.defineProperty(this, 'age', {
      enumerable: true,
      get: ()=>this.#age,
    });
    Object.defineProperty(this, 'phases', {
      enumerable: true,
      get: () => this.#phases.map(p=>({
        id:p.id,
        duration:p.duration,
      })),
    });
    this.#phases = phases;
    cc.ok1(msg+UOK, ...cc.props(this));
  }

  get phaseIndex() { return this.#phaseIndex; }

  toString() {
    return `(${this.name})[${this.#phases.length}]`;
  }

  addPhase(cfg={}) {
    const msg = `${this.prefix}.addPhase`;
    let { id:seqId } = this;
    let phaseNum= this.#phases.length + 1;
    let {
      id = `${seqId}.${phaseNum}`,
      name,
      duration,
      progress,
    } = cfg;
    let p3e = new Phase({id, duration, name, progress});
    this.#phases.push(p3e);
    cc.ok1(msg+UOK, id+':', p3e);
  }

  advance(dAge = 1) {
    let { phase, phases } = this;
    let nextAge = Math.min(phases.length-1, age + dAge);
    if (nextAge <= age) {
      return false;
    }

    this.age = nextAge;
  }
}

describe('TESTTESTsequence', () => {
  it('ctor', () => {
    let s6e = new Sequence();
    should(s6e.id).match(/^S6E[0-9]+$/);
    should(s6e.age).equal(0);
  });
  it('addPhase()', () => {
    let msg = 'ts6e.addPhase';
    let id = 'ts6e.a6e';
    let name = 'fry egg';
    let state = {
      color: 'red',
    }
    let s6e = new Sequence({id, name});
    should(s6e.phaseIndex).equal(0);
    s6e.addPhase({name: 'heat pan medium heat', progress: new Fraction(70,300,'F')});
    s6e.addPhase({name: 'add oil', progress: new Fraction(0,3,'Tbs')});
    s6e.addPhase({name: 'break egg into pan', progress: new Fraction(0,2,'Egg')});
    s6e.addPhase({name: 'cover pan', progress: new Fraction(0,1,'lid')});
    s6e.addPhase({name: 'cook', progress: new Fraction(0,5,'minutes')});
    s6e.addPhase({name: 'turn off heat and serve', progress: new Fraction(0,1,'serving')});
    cc.ok1(msg+UOK, s6e);
  });
  it('advance', () => {
  });
});
