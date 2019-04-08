const { OpenEO, Util } = require('../openeo.js');
const packageInfo = require('../package.json');

describe('Client Basics', () => {
	var obj = new OpenEO();
	test('Check that import worked', () => {
		expect(obj).not.toBeNull();
		expect(obj).toBeInstanceOf(OpenEO);
	});
	test('Check version number', () => {
		expect(obj.version()).toBe(packageInfo.version);
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
});