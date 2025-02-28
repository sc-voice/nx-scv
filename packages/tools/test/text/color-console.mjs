import should from 'should';
import { Text } from '../../index.mjs';
const { ColorConsole, Corpus } = Text;

describe('TESTTESTtext/color-console', () => {
  it('default ctor', () => {
    let cc = new ColorConsole();
    cc.ok1('test_ok1', 1, 'hello', { a: 1, b: 2 });
    cc.ok2('test_ok2', 2, 'hello', { a: 1, b: 2 });

    cc.bad1('test_bad1', 1, 'hello', { a: 1, b: 2 });
    cc.bad2('test_bad2', 2, 'hello', { a: 1, b: 2 });

    cc.tag1('test_tag1', 1, 'hello', { a: 1, b: 2 });
    cc.tag2('test_tag2', 2, 'hello', { a: 1, b: 2 });
    cc.tag3('test_tag3', 1, 'hello', { a: 1, b: 2 });
    cc.tag4('test_tag4', 2, 'hello', { a: 1, b: 2 });
  });
});
