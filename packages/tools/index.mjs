
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
};

import { default as Sankey } from './src/graph/sankey.mjs';
export const Graph = {
  Sankey, 
}

import { 
  Aligner, Alignment, AlignmentStatus 
} from './src/translate/aligner.mjs';
import { DpdTransformer } from './src/translate/dpd-transformer.mjs';
import { MockDeepL } from './src/translate/mock-deepl.mjs';
import { DeepLAdapter } from './src/translate/deepl-adapter.mjs';
import { QuoteParser } from './src/translate/quote-parser.mjs';
export const Translate = {
  Aligner,
  Alignment,
  AlignmentStatus,
  DeepLAdapter,
  DpdTransformer,
  MockDeepL,
  QuoteParser,
}
