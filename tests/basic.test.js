// @ts-nocheck
const { OpenEO, OidcProvider } = require('../src/openeo');
const packageInfo = require('../package.json');

describe('Client Basics', () => {
	test('Check version number', () => {
		expect(OpenEO.clientVersion()).toBe(packageInfo.version);
	});

	describe('OIDC', () => {
		test('isSupported', async () => {
			expect(OidcProvider.isSupported()).toBeTruthy();
		});
	});
});