// @ts-nocheck
const { UserFile } = require('../src/openeo');

describe('UserFile', () => {
	// Records the URLs of the requests instead of sending them
	const fakeConnection = () => {
		const urls = [];
		return {
			urls,
			download: async (url) => {
				urls.push(url);
				return null;
			},
			_send: async (options) => {
				urls.push(options.url);
				return {data: {}};
			},
			_delete: async (url) => {
				urls.push(url);
			}
		};
	};

	test('folder and file names are URL-encoded, the path separators are not', async () => {
		const con = fakeConnection();
		const file = new UserFile(con, 'földer/50% cover?#.tif');
		await file.retrieveFile();
		await file.uploadFile(__filename);
		await file.deleteFile();
		expect(con.urls).toEqual(Array(3).fill('/files/f%C3%B6lder/50%25%20cover%3F%23.tif'));
		// The path itself stays as it is
		expect(file.path).toBe('földer/50% cover?#.tif');
	});

	test('the example of the openEO API', async () => {
		const con = fakeConnection();
		await new UserFile(con, 'europe/österreich/münster.shp').deleteFile();
		expect(con.urls).toEqual(['/files/europe/%C3%B6sterreich/m%C3%BCnster.shp']);
	});
});
