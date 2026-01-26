// @ts-nocheck
const { OpenEO, Connection, Capabilities } = require('../src/openeo');
const { Utils } = require('@openeo/js-commons');

jest.setTimeout(30*1000);

describe('EODC back-end', () => {
	const { TESTBACKEND } = require('./config');;

	const TESTCOLLECTION = 'SENTINEL2_L2A';

	describe('Request Collection Items', () => {

		let con;
		// Skip this test for now, EODC back-end has no CORS headers

		test.skip('Connect', async () => {
			con = await OpenEO.connect(TESTBACKEND);
			expect(con instanceof Connection).toBeTruthy();
			let cap = con.capabilities();
			expect(cap instanceof Capabilities).toBeTruthy();
		});

		// Skip this test for now, EODC back-end has no CORS headers
		test('Check collection', async () => {
			let col = await con.describeCollection(TESTCOLLECTION);
			console.log(col.id);
			expect(col.id).toBe(TESTCOLLECTION);
			expect(col).toHaveProperty("links");
			expect(typeof con._getLinkHref(col.links, 'items')).toBe("string");
		});

		// Skip this test for now, EODC back-end requires Auth
		test('Request three pages of items', async () => {
			let page = 1;
			let spatialExtent = [5.0,45.0,20.0,50.0];
			let temporalExtent = [Date.UTC(2015, 0, 1), Date.UTC(2017, 0, 1)];
			let limit = 5;
			for await(let response of con.listCollectionItems(TESTCOLLECTION, spatialExtent, temporalExtent, limit)) {
				expect(Utils.isObject(response)).toBeTruthy();
				expect(response).toHaveProperty('features');
				expect(Array.isArray(response.features)).toBeTruthy();
				expect(response.features.length).toBe(limit);
				page++;
				if (page > 3) {
					break;
				}
			}
		});

	});
});
