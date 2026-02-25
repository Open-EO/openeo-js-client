// @ts-nocheck
const { Client, OidcProvider } = require('../src/client');
const packageInfo = require('../package.json');

describe('Client Basics', () => {
	test('Check version number', () => {
		expect(Client.clientVersion()).toBe(packageInfo.version);
	});

	describe('OIDC', () => {
		test('isSupported', async () => {
			expect(OidcProvider.isSupported()).toBeTruthy();
		});
	});
});