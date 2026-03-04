import { describe, it, expect as vitestExpect } from 'vitest';
import { addPropertiesExtension } from './src/properties.mjs';
import { addEqualityTestersExtension } from './src/equality-testers.mjs';

// Apply all extensions to expect
addPropertiesExtension(vitestExpect);
addEqualityTestersExtension(vitestExpect);

export { describe, it };
export const expect = vitestExpect;

export default {
  describe,
  it,
  expect,
};
