const OpenEO = require('../openeo.js');

test('Checks for credentials', () => {
	OpenEO.Auth.setCredentials("test", "test");
	expect(OpenEO.Auth.hasCredentials()).toBe(true);
});