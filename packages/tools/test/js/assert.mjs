import should from 'should';
import { JS } from '../../index.mjs';
const { Assert } = JS;

describe('assert', () => {
  it('ok', () => {
    should(Assert.ok('hello')).equal('hello');
    should(Assert.ok(true)).equal(true);
    should(Assert.ok(1 + 2)).equal(3);
    should.deepEqual(Assert.ok({ a: 1 }), { a: 1 });
    let f = () => 'f';
    should(Assert.ok(f)).equal(f);
    let list = [];
    should(Assert.ok(list)).equal(list);

    let eCaught;
    try {
      Assert.ok(undefined, 'undefined?');
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).equal('undefined?');
    try {
      Assert.ok(null, 'null?');
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).equal('null?');
    try {
      Assert.ok(false, 'false?');
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).equal('false?');
    try {
      Assert.ok(0, '0?');
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).equal('0?');
    try {
      Assert.ok(Number('NaN'), 'NaN?');
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).equal('NaN?');
  });
});
