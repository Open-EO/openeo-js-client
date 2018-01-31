const OpenEOClient = require('../openeo.js');

test('Checks for credentials', () => {
	OpenEOClient.Auth.setCredentials("test", "test");
	expect(OpenEOClient.Auth.hasCredentials()).toBe(true);
});