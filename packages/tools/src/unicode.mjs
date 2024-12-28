let SYMBOLS = {
	0: {
		name: 'digit',
	},
	1: {
		name: 'digit',
	},
	2: {
		name: 'digit',
	},
	3: {
		name: 'digit',
	},
	4: {
		name: 'digit',
	},
	5: {
		name: 'digit',
	},
	6: {
		name: 'digit',
	},
	7: {
		name: 'digit',
	},
	8: {
		name: 'digit',
	},
	9: {
		name: 'digit',
	},
	'\n': {
		name: 'end of line',
		eol: true,
	},
	'!': {
		name: 'exclamation mark',
		isWordTrim: true,
		cuddle: 'left',
		endSegment: true,
	},
	'"': {
		name: 'quotation mark',
	},
	'#': {
		name: 'number sign',
	},
	$: {
		name: 'dollar sign',
	},
	'%': {
		name: 'percent',
	},
	'&': {
		name: 'ampersand',
	},
	"'": {
		name: 'apostrophe',
		isWordTrim: true,
		isWord: false,
	},
	'(': {
		name: 'left parenthesis',
		cuddle: 'right',
	},
	')': {
		name: 'right parenthesis',
		cuddle: 'left',
	},
	'*': {
		name: 'asterisk',
	},
	'+': {
		name: 'plus sign',
	},
	',': {
		name: 'comma',
		isWordTrim: true,
		cuddle: 'left',
	},
	'-': {
		name: 'hyphen minus',
		isWord: true,
	},
	'{': {
		name: 'left brace',
	},
	'}': {
		name: 'right brace',
	},
	'.': {
		name: 'full stop',
		isWordTrim: true,
		endSegment: true,
		cuddle: 'left',
	},
	'/': {
		name: 'solidus',
	},

	':': {
		name: 'colon',
	},
	';': {
		isWordTrim: true,
		name: 'semicolon',
	},
	'<': {
		name: 'less-than sign',
	},
	'=': {
		name: 'equals sign',
	},
	'>': {
		name: 'greater-than sign',
	},
	'?': {
		name: 'question mark',
		isWordTrim: true,
		endSegment: true,
		cuddle: 'left',
	},
	'@': {
		name: 'commercial at',
	},

	'[': {
		name: 'left square bracket',
		cuddle: 'right',
	},
	']': {
		name: 'right square bracket',
	},

	'\u2014': {
		name: 'em dash',
		cuddle: 'both',
	},
	'\u2018': {
		name: 'left single quote',
		cuddle: 'right',
	},
	'\u2019': {
		name: 'right single quote',
		isWordTrim: true,
		cuddle: 'left',
		isWord: true,
	},
	'\u02bc': {
		name: 'apostrophe',
		cuddle: 'left',
		isWord: true,
	},
	'\u201C': {
		name: 'left double quote',
		cuddle: 'right',
	},
	'\u201D': {
		name: 'right double quote',
		cuddle: 'left',
	},
	'\u2026': {
		name: 'ellipsis',
		ellipsisBreak: true,
		cuddle: 'left',
	},
};

let ROMANIZE_MAP = {
	'\u0101': 'a',
	'\u1e0d': 'd',
	'\u1e25': 'h',
	'\u012b': 'i',
	'\u1e37': 'l',
	'\u1e39': 'l',
	'\u1e41': 'm',
	'\u1e43': 'm',
	'\u1e47': 'n',
	'\u1e45': 'n',
	'\u00f1': 'n',
	'\u1e5b': 'r',
	'\u1e5d': 'r',
	'\u1e63': 's',
	'\u015b': 's',
	'\u1e6d': 't',
	'\u016b': 'u',
};

export default class Unicode {
	static get LSQUOTE() {
		return '\u2018';
	}
	static get RSQUOTE() {
		return '\u2019';
	}
	static get LDQUOTE() {
		return '\u201C';
	}
	static get RDQUOTE() {
		return '\u201D';
	}
	static get HYPHEN() {
		return '\u2010';
	}
	static get APOSTROPHE() {
		return '\u02BC';
	}
	static get ENDASH() {
		return '\u2013';
	}
	static get EMDASH() {
		return '\u2014';
	}
	static get ELLIPSIS() {
		return '\u2026';
	}
	static get A_MACRON() {
		return '\u0100';
	}
	static get a_MACRON() {
		return '\u0101';
	}
	static get u_MACRON() {
		return '\u016d'; /* UTF-8 c5ab */
	}

	constructor(opts = {}) {
		if (opts.romanizeMap == null) {
			Object.defineProperty(this, 'romanizeMap', {
				value: Unicode.ROMANIZE_MAP,
			});
		} else {
			this.romanizeMap = opts.romanizeMap;
		}
		if (opts.symbols == null) {
			Object.defineProperty(this, 'symbols', {
				value: Unicode.SYMBOLS,
			});
		} else {
			this.symbols = opts.symbols; // enumerable
		}
		let syms = Object.keys(this.symbols)
			.sort((a, b) => {
				if (a === b) {
					return 0;
				}
				if (a === '-') {
					return -1;
				}
				if (b === '-') {
					return 1;
				}
				return a.localeCompare(b);
			})
			.join('')
			.replace(']', '\\]');
		Object.defineProperty(this, 'reSymbols', {
			value: new RegExp(`[${syms}]`, 'ugm'),
		});
	}

	static get ROMANIZE_MAP() {
		return ROMANIZE_MAP;
	}

	static get SYMBOLS() {
		return SYMBOLS;
	}

	get LSQUOTE() {
		return Unicode.LSQUOTE;
	}
	get RSQUOTE() {
		return Unicode.RSQUOTE;
	}
	get LDQUOTE() {
		return Unicode.LDQUOTE;
	}
	get RDQUOTE() {
		return Unicode.RDQUOTE;
	}
	get HYPHEN() {
		return Unicode.HYPHEN;
	}
	get APOSTROPHE() {
		return Unicode.APOSTROPHE;
	}
	get ENDASH() {
		return Unicode.ENDASH;
	}
	get EMDASH() {
		return Unicode.EMDASH;
	}
	get ELLIPSIS() {
		return Unicode.ELLIPSIS;
	}
	get A_MACRON() {
		return Unicode.A_MACRON;
	}
	get a_MACRON() {
		return Unicode.a_MACRON;
	}
	get u_MACRON() {
		return Unicode.u_MACRON;
	}

	stripSymbols(text) {
		return text.replace(this.reSymbols, '');
	}

	romanize(text) {
		if (this.romanizePats == null) {
			let srcChars = Object.keys(this.romanizeMap);
			Object.defineProperty(this, 'romanizePats', {
				value: srcChars.map((c) => {
					return {
						rep: this.romanizeMap[c],
						pat: new RegExp(c, 'gui'),
					};
				}),
			});
		}
		let result = text.toLowerCase();
		this.romanizePats.forEach((pat, i) => {
			result = result.replace(pat.pat, pat.rep);
		});
		return result;
	}
}
