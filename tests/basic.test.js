const { OpenEO } = require('../openeo.js');
const packageInfo = require('../package.json');

describe('Basic client tests', () => {
	var obj = new OpenEO();
	test('Check that import worked', () => {
		expect(obj).not.toBeNull();
		expect(obj).toBeInstanceOf(OpenEO);
	});
	test('Check version number', () => {
		expect(obj.version()).toBe(packageInfo.version);
	});
});