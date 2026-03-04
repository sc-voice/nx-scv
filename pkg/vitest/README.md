# @sc-voice/vitest

Vitest testing utilities for SC-Voice with extensions for migration from Mocha to Vitest.

## Installation

```bash
npm install @sc-voice/vitest
```

## Quick Start

Import from `@sc-voice/vitest` instead of `vitest`:

```javascript
import { describe, it, expect } from '@sc-voice/vitest';
```

## Extensions

### Functions are compared by .toString()

```javascript
    // Function comparison by source code
    const fn1 = () => 42;
    const fn2 = () => 42;
    expect(fn1).toEqual(fn2); // passes - same source code
```

### .properties() matcher

Extended assertion for checking object properties with deep equality support.

```javascript
  expect(obj).properties('name')` // single property
  expect(obj).properties(['name', 'age'])` // multiple properties
  expect(obj).properties({ name: 'John', age: 30 })` // property values (deep equal)
```

## Mocha transformations
This guide documents the conversion of scv-esm from Mocha to Vitest, following the pattern established in `../nx-scv/pkg/tools`.

### package.json

Add vitest:
```javascript
npm install @sc-voice/vitest@latest
```

Update test scripts:
```json
"test": "vitest run --config test/vitest.config.mjs",
"test:test": "vitest --config test/vitest.config.mjs",
"mtest": "mocha --inline-diffs",
"mtest:test": "mocha --config test/mocha-watch.json",
```

## Create test/vitest.config.mjs

```javascript
import { defineConfig } from '@sc-voice/vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.mjs'],
    exclude: ['test/vitest.config.mjs'],
  },
});
```

## Migrate Test Files

### Remove Mocha guard clauses
Change:
```javascript
typeof describe === "function" && describe("...", function () {
```

To:
```javascript
describe("...", () => {
```

### Replace `should` assertions with Vitest's `expect`

#### Examples:

**should.deepEqual → expect().toEqual()**
```javascript
// Before
should.deepEqual(Authors.authorInfo('ms'), ms);

// After
expect(Authors.authorInfo('ms')).toEqual(ms);
```

**should().equal() → expect().toBe()**
```javascript
// Before
should(Authors.compare()).equal(0);

// After
expect(Authors.compare()).toBe(0);
```

**should().deepEqual() → expect().toEqual()**
```javascript
// Before
should(result).deepEqual(expected);

// After
expect(result).toEqual(expected);
```

**should() with undefined/null → toBeUndefined/toBeNull**
```javascript
// Before
should(Authors.langAuthor('pt')).equal(undefined);

// After
expect(Authors.langAuthor('pt')).toBeUndefined();
```

### Keep async syntax
No changes needed for async functions:
```javascript
it("description", async () => {
  // test code
});
```

## Step 5: Run and Verify

```bash
npm test
```

All tests should pass. If custom equality matchers are needed (like the function comparison in setup.mjs), they should be added to the setup file.

## Key Differences

| Aspect | Mocha | Vitest |
|--------|-------|--------|
| Assertion library | should.js | vitest (expect) |
| Config file | .mocharc.json or mocha-watch.json | vitest.config.mjs |
| Global test functions | Implicit (describe, it) | Imported from 'vitest' (optional with defineConfig) |
| Async handling | Native promises/async-await | Native promises/async-await |
| Setup files | Not standard | setupFiles in config |

## Common Conversion Patterns

### should.throws() → expect().toThrow()
```javascript
// Before
should.throws(() => {
  var scid = new SuttaCentralId();
});

// After
expect(() => {
  var scid = new SuttaCentralId();
}).toThrow();
```

### should().above() and below() → toBeGreaterThan/toBeLessThan
```javascript
// Before
should(sujato.sutta).above(4000).below(6000);

// After
expect(sujato.sutta).toBeGreaterThan(4000);
expect(sujato.sutta).toBeLessThan(6000);
```

### should().properties() → expect().toMatchObject()
```javascript
// Before
should(sujato).properties({
  lang: 'en',
  category: 'sutta',
  version: '1',
});

// After
expect(sujato).toMatchObject({
  lang: 'en',
  category: 'sutta',
  version: '1',
});
```

### should.deepEqual() with multiple arguments
```javascript
// Before
should.deepEqual(sref1, sref2);

// After - CORRECT
expect(sref1).toEqual(sref2);

// WRONG - never use two-argument expect()
// expect(sref1, sref2);  // ❌ INCORRECT
```

## Common Pitfalls and Lessons

### 1. Never use two-argument expect()
Vitest's `expect()` takes only ONE argument. Always chain matchers after expect():
```javascript
// ❌ WRONG
expect(actual, expected).toEqual(expected);

// ✓ CORRECT
expect(actual).toEqual(expected);
```

### 2. Automated sed replacements can break code
Using sed without verification can introduce subtle bugs:
```bash
# ❌ Risky - can create broken syntax
sed 's/should(/expect(/g' file.mjs

# ✓ Better - verify the output before and after
```

Always verify critical transformations by:
- Running tests after each file or section
- Reviewing diffs manually
- Testing incrementally, not all at once

### 3. Context is critical when explaining changes
When describing a conversion, always show both the before and after code:
```javascript
// ✓ CLEAR - reader can verify the equivalence
// Before: should.throws(() => { ... });
// After:  expect(() => { ... }).toThrow();

// ❌ UNCLEAR - reader must trust the explanation
// "I changed it to .toThrow()"
```

Without full context, readers cannot verify correctness and must blindly trust.

### 4. Don't claim "no functional changes" without verification
- Always run tests before claiming equivalence
- Semantic differences can hide in assertion syntax:
  - `.toBe()` is strict equality (===)
  - `.toEqual()` is deep equality
  - `.toBeInstanceOf()` checks prototype chain
- Hook behavior changes (e.g., `before()` → `beforeAll()`) affect test semantics
- Timeout handling differs between frameworks

### 5. Timeout syntax differs significantly
Mocha's `this.timeout()` doesn't work in Vitest:
```javascript
// ❌ WRONG in Vitest
describe("test", function() {
  this.timeout(5000);  // 'this' context doesn't exist
});

// ✓ CORRECT in Vitest - use test config or remove
describe("test", () => {
  it("test case", () => {
    // test code
  });
});
```

## References
- Vitest docs: https://vitest.dev/
