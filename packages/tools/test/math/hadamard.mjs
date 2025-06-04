import avro from 'avro-js';
import should from 'should';
import { ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Hadamard } = ScvMath;
const { cc } = Text.ColorConsole;
const { CHECKMARK: UOK } = Text.Unicode;

const dbg = DBG.T2T.HADAMARD;

describe('hadamard', () => {
  it('encode/decode n=5', () => {
    const msg = 'th6d.encode.decode.5';
    const signal = [1, 5, -3, 2, 2.1];
    dbg > 1 && cc.tag(msg, '====================');

    let h6d = Hadamard.encode(signal);
    dbg > 1 && cc.tag(msg, h6d);

    let output = h6d.decode();
    let errorSquared = output.reduce((a,v,i)=>{
      let error = v - signal[i];
      return a + error * error;
    }, 0);
    let rmsd = Math.sqrt(errorSquared/signal.length);
    should(rmsd).below(1e-14);
    dbg > 1 && cc.tag(msg, rmsd, ...h6d.signal);

    dbg && cc.tag1(msg + UOK, ...output);
  });
  it('encode/decode n=8', () => {
    const msg = 'th6d.encode.decode.8';
    const signal = '10100110'.split('').map(n=>Number(n));
    dbg > 1 && cc.tag(msg, '====================');

    let h6d = Hadamard.encode(signal);
    dbg > 1 && cc.tag(msg, `signal[${signal.length}]:`, ...signal);

    let output = h6d.decode();
    dbg > 1 && cc.tag(msg, ...output);
    let errorSquared = output.reduce((a,v,i)=>{
      let error = v - signal[i];
      return a + error * error;
    }, 0);
    let rmsd = Math.sqrt(errorSquared/signal.length);
    dbg > 1 && cc.tag(msg, 'rmsd:', rmsd);
    should(rmsd).below(1e-14);

    dbg && cc.tag1(msg + UOK, ...output);
  });
  it('TESTTESTheavyside n=8', () => {
    const msg = 'th6d.heavyside.8';
    let N = 8;
    const A = 1; // amplitude
    const input = '1'.padEnd(N,'0').split('').map(n=>Number(n) * A);
    dbg > 1 && cc.tag(msg, '====================');

    let output;
    for (let phase = 0; phase < input.length; phase++) {
      let h6d = Hadamard.encode(input);
      dbg > 1 && cc.tag(msg, `hadamard[${input.length}]:`, ...h6d.signal);

      for (let i = N-1; i < N; i++) {
        h6d.signal[i] = 0; // low-pass filter
      }

      output = h6d.decode();
      dbg > 2 && cc.tag(msg, ...output);
      let errorSquared = output.reduce((a,v,i)=>{
        let error = v - input[i];
        return a + error * error;
      }, 0);
      let rmsd = Math.sqrt(errorSquared/input.length);
      dbg > 1 && cc.tag(msg, `input :`, ...input);
      dbg > 1 && cc.tag(msg, 'output:', ...output, 'phase:', phase, 'rmsd:', rmsd.toString());
      //should(rmsd).below(1e-14);

      input.unshift(A);
      input.pop();
    }

    dbg && cc.tag1(msg + UOK, ...output);
  });
});
