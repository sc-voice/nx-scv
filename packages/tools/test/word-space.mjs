import should from "should";
import { WordSpace } from '../index.mjs';

const Vector = WordSpace.Vector;
const FOX = "Fox, a quick brown fox, jumped over the fence";
const MN8_NOE = {
  "mn8:0.1": "Discours de Longueur Moyenne 8 ",
  "mn8:0.2": "L’effacement de soi ",
  "mn8:1.1": "Ainsi ai-je entendu. ",
  "mn8:1.2": "À une époque, le Bouddha séjournait près de Sāvatthī dans le Bosquet de Jeta, au monastère d’Anāthapiṇḍika. ",
  "mn8:2.1": "Vers le soir, le Vénérable Mahācunda quitta sa retraite méditative et se dirigea vers le Bouddha. Après l’avoir respectueusement salué, il prit place à ses côtés et s’adressa ainsi au Bouddha : ",
  "mn8:3.1": "« Vénérable, de nombreuses croyances surgissent dans le monde, ",
  "mn8:3.2": "liées à des doctrines du soi ou à des conceptions du cosmos. ",
  "mn8:3.3": "Est-ce que, dès le début, en y prêtant attention, un monastique parvient à renoncer à ces croyances, à se libérer de ces conceptions ? » ",
  "mn8:3.4": "« Cunda, de nombreuses croyances surgissent dans le monde, ",
  "mn8:3.5": "liées à des doctrines du soi ou à des conceptions du cosmos. ",
  "mn8:3.6": "Un monastique renonce à ces croyances et se libère de ces conceptions en percevant avec clarté, grâce à la juste sagesse, leur origine, leur fondement et leur mécanisme, en réalisant : « Ceci n’est pas à moi, je ne suis pas cela, ce n’est pas mon soi. › ",
  "mn8:4.1": "Il se peut qu’un monastique, détaché des plaisirs sensoriels et des états nuisibles, puisse entrer et demeurer dans la première absorption, empreinte de joie et de bien-être nés de la solitude, tout en focalisant son esprit et le maintenant engagé. ",
  "mn8:4.2": "Il pourrait penser ",
  "mn8:4.3": "qu’il pratique l’effacement de soi. ",
  "mn8:4.4": "Cependant, dans la discipline du Noble, cela n’est pas désigné comme ‹ l’effacement de soi › ; ",
  "mn8:4.5": "cela est qualifié de ‹ méditation bienheureuse dans la vie présente ›. ",
}
const MN8_MOHAN = [
  "<article id='mn8' lang='fr'>",
  "<header>",
  "<h1 class='sutta-title'>8. Le déracinement</h1>",
  "</header>",
  "<p><span class='evam'>Ainsi ai-je entendu :</span> une fois le Bienheureux séjournait dans le parc d’Anāthapiṇḍika, au bois de Jeta, près de la ville de Sāvatthi.</p>",
  "<p>En ce temps-là, un jour, l’Āyasmanta Mahā-Cunda, s’étant levé de son repos solitaire de l’après-midi, s’approcha de l’endroit où se trouvait le Bienheureux.",
  "S’étant approché, il rendit hommage au Bienheureux et s’assit à l’écart sur un côté. ",
  "S’étant assis à l’écart sur un côté, l’Āyasmanta Mahā-Cunda dit au Bienheureux :</p>",
  "<p>« Vénéré, si toutes ces opinions diverses concernant la théorie du Soi ou concernant la théorie du monde se produisent chez les gens, sont-elles éliminées tout au début chez un bhikkhu lorsqu’il réfléchit correctement ?",
  "Ainsi, y a-t-il un abandon de ces opinions ? »</p>",
  "<p>Le Bienheureux dit : « Ô Cunda, si toutes ces opinions diverses concernant la théorie du Soi ou concernant la théorie du monde se produisent chez les gens, lorsqu’on voit le lieu où ces diverses opinions se produisent, où ces diverses opinions restent installées, où ces diverses opinions circulent, lorsqu’on le voit selon la réalité tel qu’il est : « Ceci n’est pas à moi, ceci n’est pas moi, ceci n’est pas mon Soi », alors chez lui, ces mêmes opinions disparaissent, ces mêmes opinions sont abandonnées.</p>",
  "<p>Se voit, Ô Cunda, la situation où un certain bhikkhu, s’étant séparé du désir, s’étant séparé des pensées inefficaces, entre dans le premier <i lang='pli' translate='no'>jhāna</i> pourvu de raisonnement et de réflexion, qui est joie et bonheur, né de la séparation des choses mauvaises et il y demeure.",
  "Chez lui peut se produire une pensée orgueilleuse en se disant : “Je demeure en ayant déraciné <span class='add'>[les souillures mentales]</span>”.",
  "Ces <i lang='pli' translate='no'>jhānas</i>, ô Cunda, ne sont pas appelés “les états déracinés <span class='add'>[des souillures mentales]</span>” dans cette discipline noble.",
  "Par contre, dans cette discipline noble, ils sont appelés “les demeures heureuses où l’on vit dans cette vie présente”.</p>",
];

const wsTest = new WordSpace({
  wordMap: {
    "Bienheureux": "Bouddha",
    "Mahācunda": "Cunda",
  }
});

describe('word-space', ()=>{
  it("default ctor", ()=>{
    let ws = new WordSpace();
    should(ws.minWord).equal(3);
  });
  it("custom ctor", ()=>{
    let wordMap = { "a": "x" };
    let minWord = 3;
    let ws = new WordSpace({minWord, wordMap});
    should(ws.minWord).equal(minWord);
    should.deepEqual(ws.wordMap, wordMap);
    should(ws.wordMap).not.equal(wordMap);
  });
  it("string2Vector() FOX", ()=>{
    let v = wsTest.string2Vector(FOX);
    should.deepEqual(v, new Vector({
      // a: 1, // minWord
      brown: 1,
      fence: 1,
      fox: 2,
      jumped: 1,
      over: 1,
      quick: 1,
      the: 1,
    }));
    should(v.length).equal(7);
  });
  it("TESTTESTstring2Vector() Bienheureux", ()=>{
    let v = wsTest.string2Vector("le Bienheureux dit");
    should.deepEqual(v, new Vector({
      bouddha: 1,
      dit: 1,
    }));
    should(v.length).equal(2);
  });
  it("norm()", ()=>{
    let a = new Vector({a:2});
    should(a.norm()).equal(2);
    let ab = new Vector({a:1, b:1});
    should(ab.norm()).equal(Math.sqrt(2));
    let abc = new Vector({a:1, b:2, c:3});
    should(abc.norm()).equal(Math.sqrt(1+4+9));
    let cba = new Vector({c:1, b:2, a:3});
    should(cba.norm()).equal(abc.norm());
    let xy = new Vector({x:10, y:20});
    should(xy.norm()).equal(Math.sqrt(100+400));
  });
  it("dot()", ()=>{
    let abc = new Vector({a:1, b:2, c:3});
    should(abc.dot(abc)).equal(14);
    let ab = new Vector({a:10, b:20});
    should(ab.dot(abc)).equal(50);
    should(abc.dot(ab)).equal(50);
    let cba = new Vector({a:3, b:2, c:1});
    should(cba.dot(cba)).equal(14);
    should(abc.dot(cba)).equal(10);
    let xyz = new Vector({x:10, y:11, z:12});
    should(xyz.dot(abc)).equal(0);
  });
  it("similar()", ()=>{
    let abc = new Vector({a:1, b:2, c:3});
    let ab = new Vector({a:1, b:2});
    should(abc.similar(abc)).equal(1);
    should(ab.similar(abc)).equal(0.5976143046671968);
    should(abc.similar(ab)).equal(0.5976143046671968);
    should(abc.similar(ab)).equal(0.5976143046671968);

    let AB = new Vector({a:10, b:20});
    should(abc.similar(AB)).equal(0.5976143046671968);

    let ab_c = new Vector({a:1, b:2, c:1});
    should(abc.similar(ab_c)).equal(0.8728715609439696);

    let xyz = new Vector({x:1, y:1, z:1});
    let wxyz = new Vector({w: 1, x:1, y:1, z:1});
    should(xyz.similar(wxyz)).equal(0.8660254037844387);
    should(wxyz.similar(xyz)).equal(0.8660254037844387);
  });
  it("similar() mn8:1.2", ()=>{
    let mn8mohan = MN8_MOHAN[4];
    let vmohan = wsTest.string2Vector(mn8mohan);
    let scoreMax = 0;
    let dbg = 0;
    dbg && console.log(mn8mohan);
    let scan = Object.keys(MN8_NOE).reduce((a,k)=>{
      let segText = MN8_NOE[k];
      dbg && console.log(k, segText);
      let vmn8 = wsTest.string2Vector(segText);
      let score = vmn8.similar(vmohan);
      a.similar[k] = score;
      if (scoreMax < score) {
        scoreMax = score;
        a.match = k;
        dbg && console.log('better', k, score);
      }
      return a;
    }, {similar:{}});
    dbg && console.log(scan);
    should(scan.match).equal('mn8:1.2');
  });
  it("TESTTESTsimilar() mn8:1.2", ()=>{
    const msg = "test.WordSpace@148";
    let dbg = 0;
    let mn8mohan = MN8_MOHAN[5];
    let vmohan = wsTest.string2Vector(mn8mohan);
    let vmn8_expected = wsTest.string2Vector(MN8_NOE["mn8:2.1"]);
    let scoreMax = 0;
    dbg && console.log(msg, 'vmn8_expected', vmn8_expected, vmohan);
    let scan = Object.keys(MN8_NOE).reduce((a,k)=>{
      let segText = MN8_NOE[k];
      let vmn8 = wsTest.string2Vector(segText);
      let score = vmn8.similar(vmohan);
      a.similar[k] = score;
      if (scoreMax < score) {
        scoreMax = score;
        a.match = k;
        dbg && console.log(msg, 'better', k, score, 
          vmohan.intersect(vmn8));
      }
      return a;
    }, {similar:{}});
    dbg && console.log(msg, scan);
    should(scan.match).equal('mn8:2.1');
  });
});
