import fs from 'node:fs';
import path from 'node:path';
import should from 'should';
import { Text } from '../../index.mjs';
const { LegacyDoc } = Text;
const { dirname: TEST_DIR, filename: TEST_FILE } = import.meta;
const TEST_DATA = path.join(TEST_DIR, 'data');

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
    'Bienheureux :</p>',
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
    should(eCaught.message).match(/use LegacyDoc.create()/);
  });
  it('create()', () => {
    let ldoc = LegacyDoc.create(TEST_DOC);
    should(ldoc).properties({
      uid: 'mn8',
      lang: 'fr',
      author: 'Môhan Wijayaratna',
      author_uid: 'wijayaratna',
      title: 'Le déracinement',
    });
    let [l0, l1, l2, l3] = ldoc.lines;
    should(l0).match(/^8. Le déracinement$/);
    should(l1).match(/^<span.*entendu.*séjournait.*Sāvatthi\.$/);
    should(l2).match(
      /^En.*solitaire.*trouvait.*assis.*Bienheureux.:$/,
    );
    should(l3).equal(undefined);
  });
  it('filterHtml()', () => {
    should(LegacyDoc.filterHtml('text')).equal(true);
    should(LegacyDoc.filterHtml('<p>text')).equal(true);
    should(LegacyDoc.filterHtml('text</b>')).equal(true);

    should(LegacyDoc.filterHtml('<!DOCTYPE asdf>')).equal(false);
    should(LegacyDoc.filterHtml('<meta asdf>')).equal(false);
    should(LegacyDoc.filterHtml('<title>asdf</title>')).equal(false);
    should(LegacyDoc.filterHtml('<article asdf>')).equal(false);
    should(LegacyDoc.filterHtml('<html>')).equal(false);
    should(LegacyDoc.filterHtml('</html>')).equal(false);
    should(LegacyDoc.filterHtml('<head asdf>')).equal(false);
    should(LegacyDoc.filterHtml('<body asdf>')).equal(false);
    should(LegacyDoc.filterHtml('</body>')).equal(false);
    should(LegacyDoc.filterHtml('</head>')).equal(false);
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
});
