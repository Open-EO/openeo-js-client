// @ts-nocheck
const { OpenEO } = require('../src/openeo');
const packageInfo = require('../package.json');

describe('Client Basics', () => {
	test('Check version number', () => {
		expect(OpenEO.clientVersion()).toBe(packageInfo.version);
	});
});