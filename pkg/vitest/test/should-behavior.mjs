/**
 * Test to understand actual should.js .properties() behavior
 * Run with: node test/should-behavior.mjs
 */

import should from 'should';

console.log('Testing should.js .properties() behavior...\n');

// Test 1: Single property (string)
console.log('Test 1: Single property (string)');
try {
  const obj1 = { name: 'John' };
  obj1.should.have.properties('name');
  console.log('✓ Single property exists: obj.should.have.properties("name")');
} catch (e) {
  console.log('✗ Failed:', e.message);
}

// Test 2: Multiple properties (array)
console.log('\nTest 2: Multiple properties (array)');
try {
  const obj2 = { name: 'John', age: 30 };
  obj2.should.have.properties(['name', 'age']);
  console.log('✓ Multiple properties: obj.should.have.properties(["name", "age"])');
} catch (e) {
  console.log('✗ Failed:', e.message);
}

// Test 3: Properties with primitive value check
console.log('\nTest 3: Properties with primitive value check (object argument)');
try {
  const obj3 = { name: 'John', age: 30 };
  obj3.should.have.properties({ name: 'John', age: 30 });
  console.log('✓ Value check passes: obj.should.have.properties({ name: "John", age: 30 })');
} catch (e) {
  console.log('✗ Failed:', e.message);
}

// Test 4: Properties with wrong value
console.log('\nTest 4: Properties with wrong primitive value');
try {
  const obj4 = { name: 'John', age: 30 };
  obj4.should.have.properties({ name: 'Jane', age: 30 });
  console.log('✓ Wrong value check passed (unexpected)');
} catch (e) {
  console.log('✓ Wrong value fails (expected):', e.message);
}

// Test 5: Nested object values
console.log('\nTest 5: Nested object values - does it do deep equality?');
try {
  const obj5 = { a: { x: 1 }, b: { y: 2 }, c: { z: 3 } };
  obj5.should.have.properties({ b: { y: 2 } });
  console.log('✓ Nested object check passes: obj.should.have.properties({ b: { y: 2 } })');
} catch (e) {
  console.log('✗ Nested object check fails:', e.message);
}

// Test 6: Nested object - reference equality
console.log('\nTest 6: Nested object - reference vs deep equality');
try {
  const nested = { y: 2 };
  const obj6a = { b: nested };
  const obj6b = { b: { y: 2 } };

  obj6a.should.have.properties({ b: nested });
  console.log('✓ Reference equality works: obj.should.have.properties({ b: nested })');

  obj6b.should.have.properties({ b: { y: 2 } });
  console.log('✓ Deep equality works: obj.should.have.properties({ b: { y: 2 } })');
} catch (e) {
  console.log('✗ Failed:', e.message);
}

// Test 7: Arrow functions with same source
console.log('\nTest 7: Arrow functions with same source code');
try {
  const fn1 = () => 42;
  const fn2 = () => 42;
  const obj = { fn: fn1 };

  obj.should.have.properties({ fn: fn2 });
  console.log('✓ Arrow functions with same source are equal');
} catch (e) {
  console.log('✗ Arrow functions with same source fail:', e.message);
}

// Test 8: Function declarations with same body
console.log('\nTest 8: Function declarations with same body');
try {
  function f1(a, b) {
    return a * b;
  }
  function f2(a, b) {
    return a * b;
  }
  const obj = { fn: f1 };

  obj.should.have.properties({ fn: f2 });
  console.log('✓ Function declarations with same body are equal');
} catch (e) {
  console.log('✗ Function declarations with same body fail:', e.message);
}

// Test 9: Same function reference
console.log('\nTest 9: Same function reference');
try {
  const fn = () => 42;
  const obj = { fn };

  obj.should.have.properties({ fn });
  console.log('✓ Same function reference works');
} catch (e) {
  console.log('✗ Same function reference fails:', e.message);
}
