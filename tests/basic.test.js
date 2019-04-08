const { OpenEO, Util } = require('../openeo.js');
const packageInfo = require('../package.json');

describe('Client Basics', () => {
	test('Check version number', () => {
		expect(OpenEO.clientVersion()).toBe(packageInfo.version);
	});
});
	
describe('Utils', () => {
	test('Base64 encoder', () => {
		expect(Util.base64encode(Buffer.from("test"))).toBe("dGVzdA==");
		expect(Util.base64encode("test")).toBe("dGVzdA==");
	});
	test('Base64 encoder', () => {
		expect(Util.base64encode(Buffer.from("test"))).toBe("dGVzdA==");
		expect(Util.base64encode("test")).toBe("dGVzdA==");
	});
	test('String hashing', () => {
		expect(Util.hashString("a")).toBe("ca2e9442");
	});
	test('Object hashing', () => {
		expect(Util.hash(null)).toBe("40d6be39");
		expect(Util.hash(123)).toBe("fd895d50");
		expect(Util.hash({a:"b"})).toBe("2a0a2095");
		expect(Util.hash([true])).toBe("7f0d24dd");
	});
	test('Version sorting', () => {
		var v0_4_0 = {
			"url": "https://www.openeo.org/api/v0.4",
			"api_version": "0.4.0"
		};
		var v0_4_1 = {
			"url": "https://www.openeo.org/api/v0.4.1",
			"api_version": "0.4.1"
		};
		var v0_4_10 = {
			"url": "https://www.openeo.org/api/v0.4.10",
			"production": false,
			"api_version": "0.4.10"
		};
		var v0_4_11 = {
			"url": "https://www.openeo.org/api/v0.4.10",
			"production": false,
			"api_version": "0.4.11"
		};
		var v_0_5_0 = {
			"url": "https://www.openeo.org/api/v0.5",
			"api_version": "0.5.0"
		};

		expect(Util.compatibility(v0_4_0, v0_4_0)).toBe(0);
		expect(Util.compatibility(v0_4_0, v0_4_1)).toBe(1);
		expect(Util.compatibility(v0_4_0, v0_4_10)).toBe(-1);
		expect(Util.compatibility(v0_4_10, v0_4_11)).toBe(1);


		expect(Util.mostCompatible([v_0_5_0, v0_4_0, v0_4_1, v0_4_10])).toEqual([v0_4_1, v0_4_0, v0_4_10]);
		expect(Util.mostCompatible([v_0_5_0])).toEqual([]);
		expect(Util.mostCompatible([v_0_5_0,v0_4_10,v0_4_11])).toEqual([v0_4_11, v0_4_10]);
	});
});