import { SuttaCentralId } from '../index.mjs';

export default class SegDoc {
	constructor(opts = {}) {
		let { suid, lang, author, bilaraPath, segMap = {} } = opts;
		if (typeof segMap === 'string' || segMap instanceof Buffer) {
			segMap = JSON.parse(segMap);
		}

		Object.assign(this, {
			suid,
			lang,
			author,
			bilaraPath,
			segMap,
		});
	}

	scids() {
		let result = Object.keys(this.segMap);
		result.sort(SuttaCentralId.compareLow);
		return result;
	}

	segments() {
		return this.scids().map((scid) => ({
			scid,
			[this.lang]: this.segMap[scid] || '',
		}));
	}
}
