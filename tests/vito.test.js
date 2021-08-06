// @ts-nocheck
const { OpenEO, Connection, Capabilities, BasicProvider, OidcProvider } = require('../src/openeo');
const { Utils } = require('@openeo/js-commons');

describe('VITO back-end', () => {
	const TESTBACKEND = 'https://openeo.vito.be';

	let con;
	test('Connect', async () => {
		con = await OpenEO.connect(TESTBACKEND);
		expect(con instanceof Connection).toBeTruthy();
		let cap = con.capabilities();
		expect(cap instanceof Capabilities).toBeTruthy();
	});

	describe('OIDC', () => {
		test('listAuthProviders', async () => {
			let providers = await con.listAuthProviders();
			expect(Array.isArray(providers)).toBeTruthy();
			expect(providers.find(p => p instanceof BasicProvider)).toBeDefined();
			expect(providers.find(p => p instanceof OidcProvider)).toBeDefined();
		});
	});

	describe('UDFs', () => {
		test('listUdfRuntimes', async () => {
			let runtime = "Python";
			let udfs = await con.listUdfRuntimes();
			expect(Utils.isObject(udfs)).toBeTruthy();
			expect(udfs).toHaveProperty(runtime);
			expect(Utils.isObject(udfs[runtime])).toBeTruthy();
			expect(Utils.isObject(udfs[runtime].versions)).toBeTruthy();
			expect(udfs[runtime].type).toBe("language");
		});
	});

	describe('Request processes from namespace', () => {

		// Not implemented yet by VITO
/*		test('Check process namespace list', async () => {
			let p = await con.listProcesses();
			expect(Array.isArray(p.namespaces)).toBeTruthy();
			expect(p.namespaces).toContain("vito");
		}); */

		test('Check pre-defined process list does not contain "MSI"', async () => {
			let p = await con.listProcesses();
			expect(Array.isArray(p.processes)).toBeTruthy();
			let msi = p.processes.find(process => process.id === 'MSI');
			expect(msi).toBeUndefined();
		});

		test('Request processes from namespace "vito"', async () => {
			let p = await con.listProcesses("vito");
			expect(Array.isArray(p.processes)).toBeTruthy();
			let msi = p.processes.find(process => process.id === 'MSI');
			expect(Utils.isObject(msi)).toBeTruthy();
			expect(msi.description).toBeDefined();
		});

		test('Request process "MSI" from namespace "vito"', async () => {
			let msi = await con.describeProcess("MSI", "vito");
			expect(Utils.isObject(msi)).toBeTruthy();
			expect(msi.id).toBe("MSI");
			expect(msi.description).toBeDefined();
			expect(msi.process_graph).toBeDefined();
		});

	});
});
