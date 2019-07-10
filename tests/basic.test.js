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
	test('Version number validation', () => {
		expect(Util.validateVersionNumber("1.7.1")).toBe(true);
		expect(Util.validateVersionNumber("1.0.0-alpha.1")).toBe(false);
		expect(Util.validateVersionNumber(1)).toBe(false);
	});
	test('Version number comparison', () => {
		expect(Util.compareVersionNumbers("0.4.0", "0.4.1")).toBe(-1);
		expect(Util.compareVersionNumbers("100.7.1", "100.7.10")).toBe(-1);
		expect(Util.compareVersionNumbers("1.6.1", "1.7.10")).toBe(-1);
		expect(Util.compareVersionNumbers("1.6.20", "1.7.10")).toBe(-1);
		expect(Util.compareVersionNumbers("1.7.1", "1.7.10")).toBe(-1);
		expect(Util.compareVersionNumbers("1.7", "1.8.0")).toBe(-1);

		expect(Util.compareVersionNumbers("1.7.10", "1.7.1")).toBe(1);
		expect(Util.compareVersionNumbers("1.7.10", "1.6.1")).toBe(1);
		expect(Util.compareVersionNumbers("1.7.10", "1.6.20")).toBe(1);
		expect(Util.compareVersionNumbers("1.8.0", "1.7")).toBe(1);

		expect(Util.compareVersionNumbers("1.7.10", "1.7.10")).toBe(0);
		expect(Util.compareVersionNumbers("1.7", "1.7")).toBe(0);
		expect(Util.compareVersionNumbers("1.0.0", "1.0")).toBe(0);
		expect(Util.compareVersionNumbers("1.0.0", "1")).toBe(0);

		expect(Util.compareVersionNumbers("1.7", "1..7")).toBe(null);
		expect(Util.compareVersionNumbers("1.7", "Bad")).toBe(null);
		expect(Util.compareVersionNumbers("1..7", "1.7")).toBe(null);
		expect(Util.compareVersionNumbers("Bad", "1.7")).toBe(null);
	});
	test('Version sorting', () => {
		var v0_4_0 = {
			"url": "https://www.openeo.org/api/v0.4",
			"api_version": "0.4.0"
		};
		var v0_4_1 = {
			"url": "https://www.openeo.org/api/v0.4.1",
			"production": true,
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

		expect(Util.mostCompatible(null)).toEqual([]);
		expect(Util.mostCompatible([v_0_5_0, v0_4_0, v0_4_1, v0_4_10])).toEqual([v0_4_1, v0_4_0, v0_4_10]);
		expect(Util.mostCompatible([v_0_5_0])).toEqual([]);
		expect(Util.mostCompatible([v_0_5_0,v0_4_10,v0_4_11])).toEqual([v0_4_11, v0_4_10]);
	});
});