
import { Fraction } from './src/math/fraction.mjs';

export const ScvMath = {
  Fraction,
};

import { BilaraPath } from './src/text/bilara-path.mjs';
import { EbtDoc } from './src/text/ebt-doc.mjs';
import { LegacyDoc } from './src/text/legacy-doc.mjs';
import { MerkleJson } from './src/text/merkle-json.mjs';
import { SuttaCentralId } from './src/text/sutta-central-id.mjs';
import { Unicode } from './src/text/unicode.mjs';
import { WordSpace } from './src/text/word-space.mjs';
import { WordVector } from './src/text/word-vector.mjs';
import { TfidfSpace } from './src/text/tfidf-space.mjs';
import { LogEntry, Logger } from './src/text/logger.mjs';

export const Text = {
  BilaraPath,
  EbtDoc,
  LegacyDoc,
  LogEntry,
  Logger,
  MerkleJson,
  SuttaCentralId,
  Unicode,
  WordSpace,
  WordVector,
  TfidfSpace,
};

import { default as Sankey } from './src/graph/sankey.mjs';
export const Graph = {
  Sankey, 
}

