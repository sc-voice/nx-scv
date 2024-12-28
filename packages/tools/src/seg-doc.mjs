import fs from 'node:fs';
import path from 'node:path';
import { 
  SuttaCentralId, 
  Unicode,
} from '../index.mjs';

export default class SegDoc {
	constructor(opts = {}) {
		this.suid = opts.suid;
		this.lang = opts.lang;
		this.author = opts.author;
		this.bilaraPath = opts.bilaraPath;
		this.segMap = opts.segMap || {};
	}

	scids() {
		let result = Object.keys(this.segMap);
		result.sort(SuttaCentralId.compareLow);
		return result;
	}

	loadSync(root) {
		const msg = 'SegDoc.loadSync:';
		let dbg = 0;
		let { suid, lang, author, bilaraPath } = this;
		let spath = path.join(root, bilaraPath);
		dbg && console.log(msg, { spath, root });
		this.segMap = JSON.parse(fs.readFileSync(spath));
		return this;
	}

	async load(root) {
		let { suid, lang, author, bilaraPath } = this;
		let spath = path.join(root, bilaraPath);
		let data = await fs.promises.readFile(spath);
		this.segMap = JSON.parse(data);
		return this;
	}

	import(root) {
		let { bilaraPath } = this;
		let spath = path.join(root, bilaraPath);
		let parts = bilaraPath.split('/');
		parts.reduce((acc, p, i) => {
			if (i < parts.length - 1) {
				acc = path.join(acc, p);
				if (!fs.existsSync(acc)) {
					fs.mkdirSync(acc);
				}
			}
			return acc;
		}, root);
		let json = JSON.stringify(this.segMap, null, 2);
		fs.writeFileSync(spath, json);
		return this;
	}

	segments() {
		return this.scids().map((scid) => ({
			scid,
			[this.lang]: this.segMap[scid] || '',
		}));
	}

	fillWordMap(wordMap = {}, isMember = true, romanize = true) {
		let unicode = new Unicode();
		let segMap = this.segMap;
		let scids = this.scids();
		scids.forEach((scid) => {
			let text = segMap[scid];
			text.split(' ').forEach((t) => {
				let w = unicode.stripSymbols(t.toLowerCase());
				wordMap[w] = isMember;
				if (romanize) {
					wordMap[unicode.romanize(w)] = isMember;
				}
			});
		});
		return wordMap;
	}
}
