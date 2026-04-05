// Re-export barrel namespaces
export * as ScvMath from './math/index.js';
export * as Text from './text/index.js';
export * as Util from './util/index.js';

// Also export for default import
import * as ScvMath from './math/index.js';
import * as Text from './text/index.js';
import * as Util from './util/index.js';

export default { ScvMath, Text, Util };
