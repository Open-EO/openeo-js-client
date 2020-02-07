const { OpenEO } = require('../openeo.js');
const packageInfo = require('../package.json');

describe('Client Basics', () => {
	test('Check version number', () => {
		expect(OpenEO.clientVersion()).toBe(packageInfo.version);
	});
});