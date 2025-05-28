import should from 'should';
import { NameForma } from '../../index.mjs';
const { Schema } = NameForma;
import avro from 'avro-js';
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = DBG.T2T.SCHEMA;

describe('TESTTESTschema', () => {
  it('ctor', () => {
    const msg = 'ts4a.ctor';
    dbg>1 && cc.tag(msg, '==============');
    const name = 'test-name';
    const namespace = 'test-namespace';

    let s4aEmpty = new Schema();
    const noName = 'UnnamedSchema';
    should(s4aEmpty).properties({
      name: noName, 
      fullName: noName,
    });
    should(s4aEmpty.namespace).equal(undefined);
    dbg>1 && cc.tag(msg, 'default ctor');

    const fEvil = () => {throw new Error(msg, 'EVIL');}
    let s4aFun = new Schema({name, namespace, fullName: fEvil});
    should(s4aFun).properties({
      name, namespace,
      fullName: `${namespace}.${name}`,
    });
    dbg>1 && cc.tag(msg, 'evil ctor');

    let s4a = new Schema({name, namespace});
    should(s4a).properties({
      name, namespace,
      fullName: `${namespace}.${name}`,
    });

    dbg && cc.tag1(msg+UOK, 'typical ctor');
  });
});
