// @ts-nocheck
const { OpenEO, Connection, Capabilities } = require('../src/openeo');
const { Utils } = require('@openeo/js-commons');

describe('With eodc-driver', () => {
	const TESTBACKEND = 'https://openeo.eodc.eu';

	const TESTCOLLECTION = 'boa_landsat_8';

	describe('Request Collection Items', () => {

		let con;
		test('Connect', async () => {
			con = await OpenEO.connect(TESTBACKEND);
			expect(con instanceof Connection).toBeTruthy();
			let cap = con.capabilities();
			expect(cap instanceof Capabilities).toBeTruthy();
		});

		test('Check collection', async () => {
			let col = await con.describeCollection(TESTCOLLECTION);
			expect(col.id).toBe(TESTCOLLECTION);
			expect(col).toHaveProperty("links");
			expect(typeof con._getLinkHref(col.links, 'items')).toBe("string");
		});

		// Skip this test for now, EODC back-end is not responding
		test.skip('Request three pages of items', async () => {
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
