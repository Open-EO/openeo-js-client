const { OpenEO } = require('../openeo.js');

test('Check version number', () => {
	var obj = new OpenEO();
	obj.version();
	expect(obj.version()).toBe("0.3.0");
});