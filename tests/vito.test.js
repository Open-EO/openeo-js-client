// @ts-nocheck
const { OpenEO, Connection, Capabilities } = require('../src/openeo');
const { Utils } = require('@openeo/js-commons');

describe('VITO back-end', () => {
	const TESTBACKEND = 'https://openeo.vito.be';

	describe('Request processes from namespace', () => {

		let con;
		test('Connect', async () => {
			con = await OpenEO.connect(TESTBACKEND);
			expect(con instanceof Connection).toBeTruthy();
			let cap = con.capabilities();
			expect(cap instanceof Capabilities).toBeTruthy();
		});

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
