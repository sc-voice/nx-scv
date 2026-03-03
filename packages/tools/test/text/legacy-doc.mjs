import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { LegacyDoc } = Text;
const { dirname: TEST_DIR, filename: TEST_FILE } = import.meta;
const TEST_DATA = path.join(TEST_DIR, '../data');

function mn8MohanApiCache(url) {
  const msg = 'tl8c.mn8MohanApiCache:';
  return {
    ok: true,
    json: async () => {
      let fname = 'mn8-fr-wijayaratna-scapi.json';
      let fpath = path.join(TEST_DATA, fname);
      let json = JSON.parse(fs.readFileSync(fpath));
      return json;
    },
  };
}

const TEST_DOC = {
  uid: 'mn8',
  lang: 'fr',
  title: 'Le déracinement',
  author: 'Môhan Wijayaratna',
  author_uid: 'wijayaratna',
  text: [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    "<meta charset='UTF-8'>",
    "<meta name='author' content='Môhan Wijayaratna'>",
    '<title></title>',
    '</head>',
    '<body>',
    "<article id='mn8' lang='fr'>",
    '<header>',
    "<h1 class='sutta-title'>8. Le déracinement</h1>",
    '</header>',
    "<p><span class='evam'>Ainsi ai-je entendu :</span> une fois le",
    'Bienheureux séjournait dans le parc d’Anāthapiṇḍika, au bois de',
    'Jeta, près de la ville de Sāvatthi.</p>',
    '<p>En ce temps-là, un jour, l’Āyasmanta Mahā-Cunda, s’étant levé',
    'de son repos solitaire de l’après-midi, s’approcha de l’endroit où',
    'se trouvait le Bienheureux. S’étant approché, il rendit hommage au',
    'Bienheureux et s’assit à l’écart sur un côté. S’étant assis à',
    'l’écart sur un côté, l’Āyasmanta Mahā-Cunda dit au',
    'Bienheureux :',
    '<footer>test-footer</footer>',
    '</p>',
    '</article>',
    '</body>',
    '</html>',
  ],
};

describe('text/legacy-doc', () => {
  it('default ctor', () => {
    let eCaught;
    try {
      let ldoc = new LegacyDoc();
    } catch (e) {
      eCaught = e;
    }
    expect(eCaught.message).toMatch(/use LegacyDoc.create()/);
  });
  it('create()', () => {
    let ldoc = LegacyDoc.create(TEST_DOC);
    expect(ldoc).toMatchObject({
      uid: 'mn8',
      lang: 'fr',
      author: 'Môhan Wijayaratna',
      author_uid: 'wijayaratna',
      title: 'Le déracinement',
      footer: 'test-footer',
    });
    let [l0, l1, l2, l3] = ldoc.lines;
    expect(l0).toMatch(/^8. Le déracinement$/);
    expect(l1).toMatch(/^<span.*entendu.*séjournait.*Sāvatthi\.$/);
    expect(l2).toMatch(/^En.*solitaire.*trouvait.*assis.*Bienheureux.:$/);
    expect(l3).toBe(undefined);
  });
  it('filterHtml()', () => {
    expect(LegacyDoc.filterHtml('text')).toBe(true);
    expect(LegacyDoc.filterHtml('<p>text')).toBe(true);
    expect(LegacyDoc.filterHtml('text</b>')).toBe(true);

    expect(LegacyDoc.filterHtml('<!DOCTYPE asdf>')).toBe(false);
    expect(LegacyDoc.filterHtml('<meta asdf>')).toBe(false);
    expect(LegacyDoc.filterHtml('<title>asdf</title>')).toBe(false);
    expect(LegacyDoc.filterHtml('<article asdf>')).toBe(false);
    expect(LegacyDoc.filterHtml('<html>')).toBe(false);
    expect(LegacyDoc.filterHtml('</html>')).toBe(false);
    expect(LegacyDoc.filterHtml('<head asdf>')).toBe(false);
    expect(LegacyDoc.filterHtml('<body asdf>')).toBe(false);
    expect(LegacyDoc.filterHtml('</body>')).toBe(false);
    expect(LegacyDoc.filterHtml('</head>')).toBe(false);
  });
  it('mn8_legacy-fr', async () => {
    const msg = 'LEGACYDOC.mn8_legacy-fr';
    const MN8_LEG_LINES_PATH = path.join(
      TEST_DATA,
      'mn8_legacy-fr-wijayaratna-lines.json',
    );
    if (!fs.existsSync(MN8_LEG_LINES_PATH)) {
      const MN8_MOHAN_JSON = JSON.parse(
        fs.readFileSync(
          path.join(TEST_DATA, 'mn8_legacy-fr-wijayaratna.json'),
        ),
      );
      const MN8_LEG_DOC = LegacyDoc.create(MN8_MOHAN_JSON);
      let { lines } = MN8_LEG_DOC;
      console.log(msg, 'creating', MN8_LEG_LINES_PATH);
      await fs.promises.writeFile(
        MN8_LEG_LINES_PATH,
        JSON.stringify(lines, null, 2),
      );
    }
  });
  it('fetchLegacy-mn8-fr', async () => {
    const msg = 'TL7c.fetchLegacy-mn8-fr:';
    let res = mn8MohanApiCache('http://ignored');
    let cache = DBG.L7C_FETCH_LEGACY_SC ? undefined : mn8MohanApiCache;
    expect(res.ok).toBe(true);
    let json = await res.json();
    expect(json.root_text.uid).toBe('mn8');
    expect(json.root_text.lang).toBe('fr');
    expect(json.root_text.author_uid).toBe('wijayaratna');
    let sutta_uid = 'mn8';
    let lang = 'fr';
    let author = 'wijayaratna';
    let legacyDoc = await LegacyDoc.fetchLegacy({
      sutta_uid,
      lang,
      author,
      cache,
    });
    expect(legacyDoc.uid).toBe(sutta_uid);
    expect(legacyDoc.lang).toBe(lang);
    expect(legacyDoc.author_uid).toBe(author);
    expect(legacyDoc.author).toBe('Môhan Wijayaratna');
    expect(legacyDoc.footer).toMatch(/Môhan.*Ismet/);
    expect(legacyDoc.lines.at(0)).toMatch(/8. Le déracinement/);
    expect(legacyDoc.lines.at(-1)).toMatch(/Ainsi parla le Bienheureux./);
    expect(legacyDoc.lines.length).toBe(67);
  });
});
