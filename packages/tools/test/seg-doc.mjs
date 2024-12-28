import fs from 'node:fs';
import path from 'node:path';
import should from 'should';
import tmp from 'tmp';
import { SegDoc } from '../index.mjs';

describe('SegDoc', function () {
	this.timeout(5 * 1000);

	it('default ctor', () => {
		let sd = new SegDoc();
		should(sd).properties({
			author: undefined,
			lang: undefined,
			segMap: {},
			suid: undefined,
			bilaraPath: undefined,
		});
	});
	it('custom ctor', () => {
		let suid = 'dn33';
		let lang = 'en';
		let author = 'sujato';
		let segMap = {
			'dn33:0.1': 'test dn33',
		};
		let bilaraPath = 'test-path';
		let sd = new SegDoc({
			author,
			lang,
			segMap,
			suid,
			bilaraPath,
		});
		should(sd).properties({
			author: 'sujato',
			lang: 'en',
			segMap,
			suid: 'dn33',
			bilaraPath,
		});
	});
	it('load(...) loads SegDoc file', async () => {
		let dn33 = new SegDoc({
			bilaraPath: 'data/dn33.json',
		});
		let res = await dn33.load(import.meta.dirname);
		should(dn33.segMap['dn33:1.10.31']).equal(
			'form, formlessness, and cessation. ',
		);
	});
	it('loadSync(...) loads SegDoc file', () => {
		let dn33 = new SegDoc({
			bilaraPath: 'data/dn33.json',
		});
		should(dn33.loadSync(import.meta.dirname)).equal(dn33);
		should(dn33.segMap['dn33:1.10.31']).equal(
			'form, formlessness, and cessation. ',
		);
		should.deepEqual(dn33.scids().slice(0, 10), [
			'dn33:0.1',
			'dn33:0.2',
			'dn33:1.1.1',
			'dn33:1.1.2',
			'dn33:1.1.3',
			'dn33:1.2.1',
			'dn33:1.2.2',
			'dn33:1.2.3',
			'dn33:1.2.4',
			'dn33:1.2.5',
		]);
	});
	it('import(...) imports SegDoc file', () => {
		let tmpObj = tmp.dirSync();
		let dn33 = new SegDoc({
			bilaraPath: 'data/dn33.json',
		});
		dn33.loadSync(import.meta.dirname);
		dn33.bilaraPath = 'dn33.json';

		// add a new segment and save the SegDoc
		dn33.segMap['dn33:0.0'] = 'import-test';
		dn33.import(tmpObj.name);
		let dn33path = path.join(tmpObj.name, dn33.bilaraPath);
		should(fs.existsSync(dn33path)).equal(true);
		let json = JSON.parse(fs.readFileSync(dn33path));
		should(json['dn33:0.0']).equal('import-test');
		should(json['dn33:1.10.31']).equal(
			'form, formlessness, and cessation. ',
		);
		fs.unlinkSync(dn33path);
		tmpObj.removeCallback();
	});
	it('segments() returns sn1.1 segment array', () => {
		let sutta = new SegDoc({
			suid: 'sn1.1',
			lang: 'en',
			bilaraPath: 'data/en_sn1.1.json',
		}).loadSync(import.meta.dirname);
		let segments = sutta.segments();
		should.deepEqual(segments[0], {
			scid: 'sn1.1:0.1',
			en: 'Linked Discourses 1 ',
		});
		should.deepEqual(segments[1], {
			scid: 'sn1.1:0.2',
			en: '1. A Reed ',
		});
		should.deepEqual(segments[11], {
			scid: 'sn1.1:1.9',
			en: 'That’s how I crossed the flood neither standing nor swimming.” ',
		});
		should.deepEqual(segments[12], {
			scid: 'sn1.1:2.1',
			en: '“After a long time I see ',
		});
	});
	it('segments() returns an1.1-10 segment array', () => {
		let sutta = new SegDoc({
			suid: 'an1.1-10',
			lang: 'en',
			bilaraPath: 'data/en_an1.1-10.json',
		}).loadSync(import.meta.dirname);
		let scids = sutta.scids();
		should.deepEqual(scids.slice(0, 15), [
			'an1.1:0.1',
			'an1.1:0.2',
			'an1.1:0.3',
			'an1.1:1.1',
			'an1.1:1.2',
			'an1.1:1.3',
			'an1.1:1.4',
			'an1.1:1.5',
			'an1.1:1.6',
			'an1.1:2.1',
			'an1.1:2.2',
			'an1.1:2.3',
			'an1.2:0.1',
			'an1.2:1.1',
			'an1.2:1.2',
		]);
		let segments = sutta.segments();
		should.deepEqual(segments[0], {
			scid: 'an1.1:0.1',
			en: 'Numbered Discourses 1 ',
		});
		should.deepEqual(segments[1], {
			scid: 'an1.1:0.2',
			en: '1. Sights, Etc. ',
		});
		should.deepEqual(segments[11], {
			scid: 'an1.1:2.3',
			en: ' ',
		});
		should.deepEqual(segments[12], {
			scid: 'an1.2:0.1',
			en: '2 ',
		});
	});
	it('fillWordMap(...) can train a FuzzyWordSet', () => {
		/*
		let fws = new FuzzyWordSet();
		let dn33 = new SegDoc({
			bilaraPath: 'data/dn33.json',
		});
		dn33.loadSync(import.meta.dirname);
		let dn33pli = new SegDoc({
			bilaraPath: 'data/dn33_pli.json',
		});
		dn33pli.loadSync(import.meta.dirname);

		// Build wordmap
		let wordMap = {};
		let wm = dn33.fillWordMap(wordMap, false); // English includes Pali

		// Pali has no English, so that must come last
		wm = dn33pli.fillWordMap(wordMap, true, true);
		should(wm).equal(wordMap);
		should(wm).properties({
			ekam: true,
			ekaṃ: true,
		});

		// train fws
		let iterations = fws.train(wordMap, true);
		should(fws.contains('bhante')).equal(true);
		should(fws.contains('sariputta')).equal(true);
		should(fws.contains('ekaṃ')).equal(true);
		should(fws.contains('ekam')).equal(true);
		should(fws.contains('an')).equal(false);
		should(fws.contains('anicca')).equal(true);
		should(fws.contains('radiance')).equal(false);
		should(fws.contains('ratti')).equal(true);
		should(JSON.stringify(wordMap).length).equal(109070); // fat
		should(JSON.stringify(fws).length).equal(27629); // skinny
		should(iterations).equal(6);
  */
	});
});
