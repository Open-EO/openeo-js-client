const { OpenEO } = require('../openeo.js');

describe('Basic standalone', () => {
	var obj = new OpenEO();
	test('Check that import worked', () => {
		expect(obj).not.toBeNull();
		expect(obj).toBeInstanceOf(OpenEO);
	});
	test('Check version number', () => {
		expect(obj.version()).toBe("0.3.0");
	});
});

describe('With earth-engine-driver', () => {
	const TESTBACKEND = 'http://giv-openeo.uni-muenster.de:8080/v0.3';
	const TESTCAPABILITIES = JSON.parse('{"version":"0.3.1","endpoints":[{"path":"/","methods":["GET"]},{"path":"/service_types","methods":["GET"]},{"path":"/output_formats","methods":["GET"]},{"path":"/stac","methods":["GET"]},{"path":"/collections","methods":["GET"]},{"path":"/collections/{collection_id}","methods":["GET"]},{"path":"/processes","methods":["GET"]},{"path":"/files/{user_id}","methods":["GET"]},{"path":"/files/{user_id}/{path}","methods":["GET","PUT","DELETE"]},{"path":"/preview","methods":["POST"]},{"path":"/jobs","methods":["POST","GET"]},{"path":"/jobs/{job_id}","methods":["GET","PATCH","DELETE"]},{"path":"/jobs/{job_id}/results","methods":["GET","POST","DELETE"]},{"path":"/temp/{token}/{file}","methods":["GET"]},{"path":"/services","methods":["GET","POST"]},{"path":"/services/{service_id}","methods":["GET","PATCH","DELETE"]},{"path":"/xyz/{service_id}/{z}/{x}/{y}","methods":["GET"]},{"path":"/subscription","methods":["GET"]},{"path":"/credentials/basic","methods":["GET"]},{"path":"/credentials","methods":["POST"]},{"path":"/me","methods":["GET"]},{"path":"/validation","methods":["POST"]},{"path":"/process_graphs","methods":["GET","POST"]},{"path":"/process_graphs/{process_graph_id}","methods":["GET","PATCH","DELETE"]}],"billing":{"currency":"USD","default_plan":"free","plans":[{"name":"free","description":"Earth Engine is free for research, education, and nonprofit use. For commercial applications, Google offers paid commercial licenses. Please contact earthengine-commercial@google.com for details."}]}}');
	const TESTCOLLECTION = JSON.parse('{"name":"AAFC/ACI","title":"Canada AAFC Annual Crop Inventory","description":"Starting in 2009, the Earth Observation Team of the Science and Technology\nBranch (STB) at Agriculture and Agri-Food Canada (AAFC) began the process\nof generating annual crop type digital maps. Focusing on the Prairie\nProvinces in 2009 and 2010, a Decision Tree (DT) based methodology was\napplied using optical (Landsat-5, AWiFS, DMC) and radar (Radarsat-2) based\nsatellite images. Beginning with the 2011 growing season, this activity has\nbeen extended to other provinces in support of a national crop inventory.\nTo date this approach can consistently deliver a crop inventory that meets\nthe overall target accuracy of at least 85% at a final spatial resolution of\n30m (56m in 2009 and 2010).\n","license":"proprietary","extent":{"spatial":[-51.24,36.83,-135.17,62.25],"temporal":["2009-01-01T00:00:00Z",null]},"links":[{"href":"http://giv-openeo.uni-muenster.de:8080/v0.3/collections/AAFC/ACI","rel":"self"},{"href":"http://giv-openeo.uni-muenster.de:8080/v0.3/collections","rel":"parent"},{"href":"http://giv-openeo.uni-muenster.de:8080/v0.3/collections","rel":"root"},{"href":"http://www.agr.gc.ca/atlas/data_donnees/agr/annualCropInventory/tif","rel":"source"}]}'.replace(/\n/g, '\\n'));
	const TESTPROCESS = JSON.parse('{"name":"count_time","description":"Counts the number of images with a valid mask in a time series for all bands of the input dataset.","parameters":{"imagery":{"description":"EO data to process.","required":true,"schema":{"type":"object","format":"eodata"}}},"returns":{"description":"Processed EO data.","schema":{"type":"object","format":"eodata"}}}');
	var obj = new OpenEO();

	describe('Connecting', () => {	
		test('Connect without credentials', async () => {
			await obj.connect(TESTBACKEND).then(async con => {
				expect(con).not.toBeNull();
				expect(con.isLoggedIn()).toBeFalsy();
				expect(con.getUserId()).toBeNull();
			});
		});

		test('Connect with Basic Auth credentials', async () => {
			await obj.connect(TESTBACKEND, 'basic', {username: 'group5', password: 'test123'}).then(con => {
				expect(con).not.toBeNull();
				expect(con.isLoggedIn()).toBeTruthy();
				expect(con.getUserId()).toBe('group5');
			});
		});

		test('Manually connect with Basic Auth credentials', async () => {
			await obj.connect(TESTBACKEND).then(async con => {
				expect(con).not.toBeNull();
				expect(con.isLoggedIn()).toBeFalsy();
				expect(con.getUserId()).toBeNull();
				var login = await con.authenticateBasic('group5', 'test123');
				expect(con).not.toBeNull();
				expect(con.isLoggedIn()).toBeTruthy();
				expect(con.getUserId()).toBe('group5');
				expect(login).toHaveProperty('user_id');
				expect(login).toHaveProperty('access_token');
			});
		});

		test('Auth via OIDC is not implemented yet', async () => {
			await obj.connect(TESTBACKEND).then(async con => {
				expect(con).not.toBeNull();
				expect(con.isLoggedIn()).toBeFalsy();
				expect(con.getUserId()).toBeNull();
				expect(con.authenticateOIDC).toThrowError('Not implemented yet.');
			});
		});
	});
	
	describe('Getters', () => {
		test('Get baseurl', async () => {
			await obj.connect(TESTBACKEND).then(con => {
				expect(con.getBaseUrl()).toBe(TESTBACKEND);
			});
		});
	});
	
	describe('Discovery', () => {
		var con;
		beforeAll(async (done) => {
			con = await obj.connect(TESTBACKEND);
			done();
		});
		
		test('Capabilities', async () => {
			var caps = await con.capabilities();
			expect(caps).not.toBeNull();
			expect(caps._data).toEqual(TESTCAPABILITIES);
			expect(caps.version()).toBe('0.3.1');
			expect(caps.listFeatures()).toEqual(TESTCAPABILITIES.endpoints);
			expect(caps.listPlans()).toEqual(TESTCAPABILITIES.billing.plans);
			expect(caps.currency()).toEqual(TESTCAPABILITIES.billing.currency);
			expect(caps.hasFeature('startJob')).toBeTruthy();
			expect(caps.hasFeature('somethingThatIsntSupported')).toBeFalsy();
		});

		test('Collections', async () => {
			var colls = await con.listCollections();
			expect(colls).not.toBeNull();
			expect(colls).toHaveProperty('collections');
			expect(colls.collections.length).toBeGreaterThan(400);
			expect(colls.collections).toContainEqual(TESTCOLLECTION);
		});

		test('Collections in detail', async () => {
			var coll = await con.describeCollection(TESTCOLLECTION.name);
			expect(coll).not.toBeNull();
			expect(coll).toHaveProperty('name');
			expect(coll).toHaveProperty('description');
			expect(coll).toHaveProperty('license');
			expect(coll).toHaveProperty('extent');
			expect(coll.name).toBe(TESTCOLLECTION.name);
		});

		test('Processes', async () => {
			var procs = await con.listProcesses();
			expect(procs).not.toBeNull();
			expect(procs).toHaveProperty('processes');
			expect(procs.processes.length).toBeGreaterThan(10);
			expect(procs.processes).toContainEqual(TESTPROCESS);
		});

		test('File types', async () => {
			var types = await con.listFileTypes();
			expect(types).not.toBeNull();
			expect(types).toHaveProperty('default');
			expect(types).toHaveProperty('formats');
			expect(types.formats).toHaveProperty('PNG');
		});

		test('Service types', async () => {
			var types = await con.listServiceTypes();
			expect(types).not.toBeNull();
			expect(types).toHaveProperty('xyz');
		});
	});

	describe('Getting empty user-specific data', async () => {
		var con;
		beforeAll(async (done) => {
			con = await obj.connect(TESTBACKEND, 'basic', {username: 'group5', password: 'test123'});
			done();
		});

		test('Describe account', async () => {
			var acc = await con.describeAccount();
			expect(acc).not.toBeNull();
			expect(acc.user_id).toBe('group5');
		});

		test('List process graphs', async () => {
			var pgs = await con.listProcessGraphs();
			expect(pgs).not.toBeNull();
			expect(pgs).toHaveLength(0);
		});

		test('List jobs', async () => {
			var js = await con.listJobs();
			expect(js).not.toBeNull();
			expect(js).toHaveLength(0);
		});

		test('List services', async () => {
			var ss = await con.listServices();
			expect(ss).not.toBeNull();
			expect(ss).toHaveLength(0);
		});
	});
});

