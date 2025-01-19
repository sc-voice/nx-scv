
import { Fraction } from './src/math/fraction.mjs';

export const ScvMath = {
  Fraction,
};

import { 
  Aligner, Alignment, AlignmentStatus 
} from './src/text/aligner.mjs';
import { BilaraPath } from './src/text/bilara-path.mjs';
import { EbtDoc } from './src/text/ebt-doc.mjs';
import { LegacyDoc } from './src/text/legacy-doc.mjs';
import { MerkleJson } from './src/text/merkle-json.mjs';
import { SuttaCentralId } from './src/text/sutta-central-id.mjs';
import { Unicode } from './src/text/unicode.mjs';
import { WordSpace } from './src/text/word-space.mjs';

export const Text = {
  Aligner,
  Alignment,
  AlignmentStatus,
  BilaraPath,
  EbtDoc,
  LegacyDoc,
  MerkleJson,
  SuttaCentralId,
  Unicode,
  WordSpace,
};

import { default as Sankey } from './src/graph/sankey.mjs';
export const Graph = {
  Sankey, 
}

import { default as MockDeepL } from 
  './src/translate/mock-deepl.mjs';
import { default as DeepLAdapter } from 
  './src/translate/deepl-adapter.mjs';
import { default as QuoteParser } from 
  './src/translate/quote-parser.mjs';
export const Translate = {
  MockDeepL,
  QuoteParser,
  DeepLAdapter,
}
