// @ts-nocheck
const { OpenEO, Connection, FileTypes, Capabilities, UserProcess, Job, Service, UserFile, BasicProvider, Logs } = require('../src/openeo');
const { Utils } = require('@openeo/js-commons');
const waitForExpect = require("wait-for-expect");

var timeout = 2*60*1000;
jest.setTimeout(timeout); // Give Google some time to process data

// Generate random int
const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;

describe('GEE back-end', () => {
	const { TESTBACKEND, STAC_MIGRATE_VERSION } = require('./config.js');
	const TESTBACKENDDIRECT = TESTBACKEND + '/v1.0';
	const TESTUSERNAME = `group${random(20,29)}`;
	const TESTPASSWORD = 'test123';
	
	const FREE_PLAN = {"name":"free","description":"Earth Engine is free for research, education, and nonprofit use. For commercial applications, Google offers paid commercial licenses. Please contact earthengine-commercial@google.com for details.","paid":false};

	const TESTCAPABILITIES = {"api_version":"1.0.1","backend_version":"1.0.0-beta.5","stac_version":"1.0.0","type":"Catalog","production":false,"id":"openeo-earthengine-driver","title":"Google Earth Engine Proxy for openEO","description":"This is the Google Earth Engine Driver for openEO.\n\nGoogle Earth Engine is a planetary-scale platform for Earth science data & analysis. It is powered by Google's cloud infrastructure and combines a multi-petabyte catalog of satellite imagery and geospatial datasets with planetary-scale analysis capabilities. Google makes it available for scientists, researchers, and developers to detect changes, map trends, and quantify differences on the Earth's surface. Google Earth Engine is free for research, education, and nonprofit use.","endpoints":[{"path":"/","methods":["GET"]},{"path":"/conformance","methods":["GET"]},{"path":"/service_types","methods":["GET"]},{"path":"/file_formats","methods":["GET"]},{"path":"/collections","methods":["GET"]},{"path":"/collections/{collection_id}","methods":["GET"]},{"path":"/processes","methods":["GET"]},{"path":"/files","methods":["GET"]},{"path":"/files/{path}","methods":["GET","PUT","DELETE"]},{"path":"/result","methods":["POST"]},{"path":"/jobs","methods":["POST","GET"]},{"path":"/jobs/{job_id}","methods":["GET","PATCH","DELETE"]},{"path":"/jobs/{job_id}/logs","methods":["GET"]},{"path":"/jobs/{job_id}/results","methods":["GET","POST"]},{"path":"/services","methods":["GET","POST"]},{"path":"/services/{service_id}","methods":["GET","PATCH","DELETE"]},{"path":"/services/{service_id}/logs","methods":["GET"]},{"path":"/credentials/basic","methods":["GET"]},{"path":"/me","methods":["GET"]},{"path":"/validation","methods":["POST"]},{"path":"/process_graphs","methods":["GET"]},{"path":"/process_graphs/{process_graph_id}","methods":["GET","PUT","DELETE"]}],"billing":{"currency":"USD","default_plan":"free","plans":[FREE_PLAN]},"links":[{"rel":"about","href":"https://earthengine.google.com/","title":"Google Earth Engine Homepage"},{"rel":"terms-of-service","href":"https://earthengine.google.com/terms/","type":"text/html","title":"Google Earth Engine Terms of Service"},{"rel":"privacy-policy","href":"https://policies.google.com/privacy","type":"text/html","title":"Google Privacy Policy"},{"rel":"related","href":"https://github.com/Open-EO/openeo-earthengine-driver","title":"GitHub repository"},{"rel":"version-history","href":TESTBACKEND+"/.well-known/openeo","type":"application/json","title":"Supported API versions"},{"rel":"data","href":TESTBACKENDDIRECT+"/collections","type":"application/json","title":"Datasets"},{"rel":"conformance","href":TESTBACKENDDIRECT+"/conformance","type":"application/json","title":"OGC Conformance classes"}]};

	const TESTCOLLECTION = {"stac_version":"1.0.0","id":"AAFC/ACI","title":"Canada AAFC Annual Crop Inventory","gee:type":"image_collection","description":"Starting in 2009, the Earth Observation Team of the Science and Technology\nBranch (STB) at Agriculture and Agri-Food Canada (AAFC) began the process\nof generating annual crop type digital maps. Focusing on the Prairie\nProvinces in 2009 and 2010, a Decision Tree (DT) based methodology was\napplied using optical (Landsat-5, AWiFS, DMC) and radar (Radarsat-2) based\nsatellite images. Beginning with the 2011 growing season, this activity has\nbeen extended to other provinces in support of a national crop inventory.\nTo date this approach can consistently deliver a crop inventory that meets\nthe overall target accuracy of at least 85% at a final spatial resolution of\n30m (56m in 2009 and 2010).\n","license":"proprietary","links":[],"keywords":["aafc","canada","crop","landcover"],"providers":[{"name":"Agriculture and Agri-Food Canada","roles":["producer","licensor"],"url":"https://open.canada.ca/data/en/dataset/ba2645d5-4458-414d-b196-6303ac06c1c9"},{"name":"Google Earth Engine","roles":["host"],"url":"https://developers.google.com/earth-engine/datasets/catalog/AAFC_ACI"}],"extent":{"spatial":{"bbox":[[-135.17,36.83,-51.24,62.25]]},"temporal":{"interval":[["2009-01-01T00:00:00Z",null]]}},"summaries":{},"sci:citation":"Agriculture and Agri-Food Canada Annual Crop Inventory. {YEAR}","stac_extensions":["collection-assets"],"cube:dimensions":{"x":{"type":"spatial","axis":"x","extent":[-135.17,-51.24]},"y":{"type":"spatial","axis":"y","extent":[36.83,62.25]},"t":{"type":"temporal","extent":["2009-01-01T00:00:00Z",null]},"bands":{"type":"bands","values":["landcover"]}},"assets":{}};

	const TESTPROCESS = {"id":"min","summary":"Minimum value","description":"Computes the smallest value of an array of numbers, which is is equal to the last element of a sorted (i.e., ordered) version the array.\n\nAn array without non-`null` elements resolves always with `null`.","categories":["math","reducer"],"parameters":[{"name":"data","description":"An array of numbers.","schema":{"type":"array","items":{"type":["number","null"]}}}],"returns":{"description":"The minimum value.","schema":{"type":["number","null"]}},"examples":[{"arguments":{"data":[1,0,3,2]},"returns":0},{"arguments":{"data":[5,2.5,null,-0.7]},"returns":-0.7},{"arguments":{"data":[]},"returns":null}],"links":[{"rel":"about","href":"http://mathworld.wolfram.com/Minimum.html","title":"Minimum explained by Wolfram MathWorld"}]};

	const PROCESSGRAPH = {"1":{"process_id":"load_collection","arguments":{"id":"IDAHO_EPSCOR/TERRACLIMATE","spatial_extent":null,"temporal_extent":["2017-07-01T00:00:00Z","2017-07-31T23:59:59Z"],"bands":["tmmx"]}},"2":{"process_id":"save_result","arguments":{"data":{"from_node":"3"},"format":"PNG","options": {"epsgCode": 4326}},"result":true},"3":{"process_id":"apply","arguments":{"data":{"from_node":"1"},"process":{"process_graph":{"2":{"process_id":"linear_scale_range","arguments":{"x":{"from_parameter":"x"},"inputMin":-150,"inputMax":450,"outputMax":255},"result":true}}}}}};
	const VALID_PROCESS = {"process_graph":PROCESSGRAPH};
	const INVALID_PROCESS = {"process_graph":{"load": {"process_id": "load_collection","arguments": {}}}};

	var isBrowserEnv = (typeof Blob !== 'undefined');

	async function connectWithoutAuth() {
		return await OpenEO.connect(TESTBACKEND);
	}

	async function connectWithBasicAuth() {
		let con = await OpenEO.connect(TESTBACKEND);
		await con.authenticateBasic(TESTUSERNAME, TESTPASSWORD);
		return con;
	}

	describe('Connecting', () => {
		test('Connect with wrong Server URL', async () => {
			await expect(OpenEO.connect("http://invalid.openeo.org")).rejects.toThrow();
		});

		test('Connect', async () => {
			var con = await OpenEO.connect(TESTBACKEND);
			expect(con instanceof Connection).toBeTruthy();
			expect(con.isAuthenticated()).toBeFalsy();
			expect(con.getBaseUrl()).toBe(TESTBACKENDDIRECT);
			var cap = con.capabilities();
			expect(cap instanceof Capabilities).toBeTruthy();
		});

		test('Connect directly to a known version via connect', async () => {
			var con = await OpenEO.connect(TESTBACKENDDIRECT);
			expect(con instanceof Connection).toBeTruthy();
			expect(con.isAuthenticated()).toBeFalsy();
			expect(con.getBaseUrl()).toBe(TESTBACKENDDIRECT);
			var cap = con.capabilities();
			expect(cap instanceof Capabilities).toBeTruthy();
		});

		test('Connect directly to a known version via connectDirect', async () => {
			var con = await OpenEO.connectDirect(TESTBACKENDDIRECT);
			expect(con.isAuthenticated()).toBeFalsy();
			expect(con.getBaseUrl()).toBe(TESTBACKENDDIRECT);
			var cap = con.capabilities();
			expect(cap instanceof Capabilities).toBeTruthy();
		});
	});

	describe('Auth', () => {
		var con;
		beforeAll(async (done) => {
			con = await connectWithoutAuth();
			done();
		});

		var providers;
		var basic;
		test('List providers', async () => {
			expect(con instanceof Connection).toBeTruthy();
			providers = await con.listAuthProviders();
			expect(Array.isArray(providers)).toBeTruthy();
			filtered = providers.filter(p => p.getType() === 'basic');
			expect(filtered.length).toBe(1);
			basic = filtered[0];
			expect(basic instanceof BasicProvider).toBeTruthy();
			expect(basic.getId()).toEqual('basic');
			expect(basic.getToken()).toBeNull();
		});

		test('Connect with wrong Basic Auth credentials', async () => {
			await expect(basic.login("foo", "bar")).rejects.toThrow();
			expect(con.isAuthenticated()).toBeFalsy();
		});

		test('Connect with Basic Auth credentials', async () => {
			let tokenValue = null;
			con.on('tokenChanged', token => tokenValue = token);
			await basic.login(TESTUSERNAME, TESTPASSWORD);
			expect(basic.getToken()).not.toBeNull();
			expect(con.isAuthenticated()).toBeTruthy();
			expect(typeof tokenValue).toBe('string');
		});
	
	});

	describe('Discovery', () => {
		var con;
		beforeAll(async (done) => {
			con = await connectWithoutAuth();
			done();
		});
		
		test('Capabilities', async () => {
			var caps = await con.capabilities();
			expect(caps instanceof Capabilities).toBeTruthy();
			expect(caps.toJSON()).toEqual(TESTCAPABILITIES);
			expect(caps.apiVersion()).toBe(TESTCAPABILITIES.api_version);
			expect(caps.backendVersion()).toBe(TESTCAPABILITIES.backend_version);
			expect(caps.title()).toBe(TESTCAPABILITIES.title);
			expect(caps.description()).toBe(TESTCAPABILITIES.description);
			expect(caps.isStable()).toBe(TESTCAPABILITIES.production);
			expect(caps.links().length).toBeGreaterThan(0);
			expect(caps.listFeatures()).toEqual([
				"capabilities",
				"listFileTypes",
				"listServiceTypes",
				"listCollections",
				"describeCollection",
				"listProcesses",
				"describeProcess",
				"listAuthProviders",
				"authenticateBasic",
				"describeAccount",
				"listFiles",
				"validateProcess",
				"setUserProcess",
				"listUserProcesses",
				"computeResult",
				"listJobs",
				"createJob",
				"listServices",
				"createService",
				"debugJob",
				"debugService",
				"downloadFile",
				"getFile",
				"uploadFile",
				"deleteFile",
				"getJob",
				"describeJob",
				"updateJob",
				"deleteJob",
				"startJob",
				"listResults",
				"downloadResults",
				"describeUserProcess",
				"getUserProcess",
				"replaceUserProcess",
				"deleteUserProcess",
				"describeService",
				"getService",
				"updateService",
				"deleteService"
			].sort());
			let plans = TESTCAPABILITIES.billing.plans.map(p => Object.assign({}, p, {default: true}));
			expect(caps.listPlans()).toEqual(plans);
			expect(caps.currency()).toEqual(TESTCAPABILITIES.billing.currency);
			expect(caps.hasFeature('startJob')).toBeTruthy();
			expect(caps.hasFeature('getFile')).toBeTruthy();
			expect(caps.hasFeature('somethingThatIsntSupported')).toBeFalsy();
		});

		test('Collections', async () => {
			var colls = await con.listCollections();
			expect(colls).toHaveProperty('collections');
			expect(colls).toHaveProperty('links');
			expect(Array.isArray(colls.collections)).toBe(true);
			expect(colls.collections.length).toBeGreaterThan(400);
			expect(colls.collections[0]).toHaveProperty("description");
			expect(colls.collections[0]).toHaveProperty("license");
			expect(colls.collections[0]).toHaveProperty("extent");
			expect(colls.collections[0]).toHaveProperty("links");
		});

		test('Collections in detail', async () => {
			var coll = await con.describeCollection(TESTCOLLECTION.id);
			expect(coll.stac_version).toBe(STAC_MIGRATE_VERSION);
			expect(coll.stac_extensions).toEqual(["collection-assets"]);
			expect(coll.id).toBe(TESTCOLLECTION.id);
			expect(coll).toHaveProperty('description');
			expect(coll.license).toBe(TESTCOLLECTION.license);
			expect(coll.extent).toEqual(TESTCOLLECTION.extent);
			expect(coll).toHaveProperty("links");
			expect(coll).toHaveProperty('summaries');
			expect(coll).toHaveProperty('sci:citation');
			expect(coll['cube:dimensions']).toEqual(TESTCOLLECTION['cube:dimensions']);
		});

		test('Processes', async () => {
			var procs = await con.listProcesses();
			expect(procs).toHaveProperty('processes');
			expect(procs.processes.length).toBeGreaterThan(10);
			var min = procs.processes.filter(x => x.id === 'min');
			expect(min.length).toBe(1);
			expect(min[0]).toEqual(TESTPROCESS);
			expect(procs.processes).toContainEqual(TESTPROCESS);
		});

		test('Single Process', async () => {
			var min = await con.describeProcess('min');
			expect(min).toEqual(TESTPROCESS);
			var invalid = await con.describeProcess('invalid');
			expect(invalid).toBeNull();
		});

		test('File types', async () => {
			var types = await con.listFileTypes();
			expect(types instanceof FileTypes).toBeTruthy();
			expect(Utils.size(types.getInputTypes())).toBe(0);
			expect(Utils.size(types.getOutputTypes())).toBe(5);
			expect(types.getInputType('PNG')).toBeNull();
			expect(types.getOutputType('PNG')).toHaveProperty('title');
			expect(types.getOutputType('PNG')).toHaveProperty('gis_data_types');
			expect(types.getOutputType('PNG')).toHaveProperty('parameters');
			expect(types.getOutputType('png')).toHaveProperty('gis_data_types');
		});

		test('Service types', async () => {
			var types = await con.listServiceTypes();
			expect(types).toHaveProperty('xyz');
		});

		test('UDF runtimes', async () => {
			// Not implemented by GEE back-end
			await expect(con.listUdfRuntimes()).rejects.toThrow();
		});
	});

	describe('Getting user-specific data', () => {
		var con;
		beforeAll(async (done) => {
			con = await connectWithBasicAuth();
			done();
		});

		test('Describe account', async () => {
			var acc = await con.describeAccount();
			expect(acc.user_id).toBe(TESTUSERNAME);
		});
	});

	describe('Process graph validation', () => {
		var con;
		beforeAll(async (done) => {
			con = await connectWithBasicAuth();
			done();
		});

		test('Valid process graph', async () => {
			var result = await con.validateProcess(VALID_PROCESS);
			expect(Array.isArray(result)).toBeTruthy();
			expect(result).toEqual([]);
		});

		test('Invalid process graph', async () => {
			var result = await con.validateProcess({
				nodeId: {
					process_id: "unknown_process",
					arguments: {},
					result: true
				}
			});
			expect(Array.isArray(result)).toBeTruthy();
			expect(typeof result[0]).toBe('object');
			expect(result[0]).toHaveProperty('code');
			expect(result[0]).toHaveProperty('message');
		});
	});

	describe('Stored process graphs management', () => {
		var con;
		beforeAll(async () => {
			con = await connectWithBasicAuth();
			// clean up
			var list = await con.listUserProcesses();
			await Promise.all(list.map(pg => pg.deleteUserProcess()));
		});

		test('List process graphs', async () => {
			var pgs = await con.listUserProcesses();
			expect(pgs).not.toBeNull();
			expect(pgs).toHaveLength(0);
		});

		var pg1;
		var pg2;
		test('Add process graph without metadata', async () => {
			var pg = await con.setUserProcess('myndvi', VALID_PROCESS);
			expect(pg instanceof UserProcess).toBeTruthy();
			expect(pg.connection).toBe(con);
			expect(pg.id).toBe('myndvi');
			expect(pg.processGraph).toEqual(PROCESSGRAPH);
			pg1 = pg;
		});

		test('Make sure there is now 1 process graph, with no metadata', async () => {
			var pgs = await con.listUserProcesses();
			expect(pgs).toHaveLength(1);
			expect(pgs[0] instanceof UserProcess).toBeTruthy();
			expect(pgs[0].id).toBe('myndvi');
			expect(pgs[0].id).toBe(pg1.id);
		});

		var summary = "Test title";
		var description = "Test description";
		test('Add process graph with metadata', async () => {
			var pg = await con.setUserProcess('foobar', Object.assign({}, VALID_PROCESS, {summary, description}));
			expect(pg instanceof UserProcess).toBeTruthy();
			expect(pg.connection).toBe(con);
			expect(pg.id).toBe('foobar');
			expect(pg.id).not.toBe(pg1.id);
			expect(pg.summary).toBe(summary);
			expect(pg.description).toBe(description);
			expect(pg.processGraph).toEqual(PROCESSGRAPH);
			pg2 = pg;
		});

		test('Make sure there are now 2 process graphs, the second with metadata', async () => {
			var pgs = await con.listUserProcesses();
			expect(pgs).toHaveLength(2);
			var pg = (pgs[0].id != pg1.id ? pgs[0] : pgs[1]);
			expect(pg instanceof UserProcess).toBeTruthy();
			expect(typeof pg.id).toBe('string');
			expect(pg.id).not.toBe(pg1.id);
			expect(pg.id).toBe(pg2.id);
			expect(pg.summary).toBe('Test title')
			expect(pg.description).toBe('Test description');
			
		});

		test('Describe process graph without metadata', async () => {
			var pg = await con.getUserProcess(pg1.id);
			expect(pg instanceof UserProcess).toBeTruthy();
			expect(typeof pg.id).toBe('string');
			expect(pg.id).toBe(pg1.id);

			expect(pg.toJSON()).toEqual({
				id: 'myndvi',
				process_graph: PROCESSGRAPH
			});
			expect(pg.getAll()).toEqual({
				id: 'myndvi',
				processGraph: PROCESSGRAPH
			});
		});

		test('Describe process graph with metadata', async () => {
			var pg = await con.getUserProcess(pg2.id);
			expect(pg instanceof UserProcess).toBeTruthy();
			expect(typeof pg.id).toBe('string');
			expect(pg.id).toBe(pg2.id);
			expect(pg.summary).toBe(summary);
			expect(pg.description).toBe(description);
		});

		test('Update process graph', async () => {
			let summary = 'Test title 2';
			await pg1.replaceUserProcess(Object.assign({}, VALID_PROCESS, {summary}));
			var pg = await pg1.describeUserProcess();
			expect(pg instanceof UserProcess).toBeTruthy();
			expect(typeof pg.id).toBe('string');
			expect(pg.id).toBe(pg1.id);
			expect(pg.summary).toBe(summary);
			expect(pg.processGraph).toEqual(PROCESSGRAPH);
		});

		test('Delete the second process graph', async () => {
			await pg2.deleteUserProcess();
			
			var pgs = await con.listUserProcesses();
			expect(pgs).toHaveLength(1);
			expect(pgs[0].id).toBe(pg1.id);
		});
	});

	describe('Sync. computation of results', () => {
		var con;
		beforeAll(async () => {
			con = await connectWithBasicAuth();
		});

		test('Sync. compute a process graph result / Success', async () => {
			var resource = await con.computeResult(VALID_PROCESS, 'jpeg');
			expect(resource).not.toBeNull();
			expect(typeof resource).toBe('object');
			if (isBrowserEnv) { // Browser environment
				expect(resource.data).toBeInstanceOf(Blob);
				// ToDo: Check blob content
			}
			else { // Node environment
				const stream = require('stream');
				expect(resource.data).toBeInstanceOf(stream.Readable);
				// ToDo: Check blob content
			}
			expect(resource.costs).not.toBeUndefined();
			expect(Array.isArray(resource.logs)).toBeTruthy();
		});

		test('Sync. compute a process graph result / Failure', async () => {
			try {
				var r = await con.computeResult(INVALID_PROCESS, 'jpeg');
				expect(r).toBeUndefined();
			} catch (error) {
				expect(error.code).toBe("ResultNodeMissing");
				expect(error.message).toBe("No result node found for the process.")
			}
		});
	});

	describe('Job management', () => {
		var con;
		beforeAll(async () => {
			con = await connectWithBasicAuth();
			// clean up
			var list = await con.listJobs();
			await Promise.all(list.map(j => j.deleteJob()));
		});

		test('List jobs in general', async () => {
			var jobs = await con.listJobs();
			expect(jobs).not.toBeNull();
			expect(jobs).toHaveLength(0);
		});

		var job;
		var job2;
		test('Add two minimal job', async () => {
			job = await con.createJob(VALID_PROCESS);
			expect(job instanceof Job).toBeTruthy();
			expect(job.id).not.toBeNull();
			expect(job.id).not.toBeUndefined();

			var jobs = await con.listJobs();
			expect(jobs).toHaveLength(1);
			expect(jobs[0] instanceof Job).toBeTruthy();
			expect(jobs[0].id).toBe(job.id);

			job2 = await con.createJob(VALID_PROCESS);
			expect(job2 instanceof Job).toBeTruthy();

			jobs = await con.listJobs();
			expect(jobs).toHaveLength(2);
		});

		test('Describe job', async () => {
			var jobdetails = await con.getJob(job.id);
			expect(jobdetails).not.toBeNull();
			expect(jobdetails).not.toBeUndefined();
			expect(jobdetails.id).toBe(job.id);
			expect(jobdetails.title).toBeNull();
			expect(jobdetails.status).toBe('created');
			expect(typeof jobdetails.created).toBe('string');
		});

		test('Update job', async () => {
			var success = await job.updateJob({title: 'Test job'});
			expect(success).toBeTruthy();
			var jobdetails = await job.describeJob();
			expect(jobdetails).not.toBeNull();
			expect(jobdetails).not.toBeUndefined();
			expect(jobdetails.id).toBe(job.id);
			expect(jobdetails.title).toBe('Test job');
			expect(typeof jobdetails.created).toBe('string');
		});

		test('Estimate job', async () => {
			// Not implemented by GEE back-end
			await expect(job.estimateJob()).rejects.toThrow();
		});
		
		test('Queue Job', async () => {
			await expect(job.startJob()).resolves.toBeTruthy();
			var jobdetails = await job.describeJob();
			expect(['queued', 'running', 'finished']).toContain(jobdetails.status);
		});
		
		test('Debug Job', async () => {
			let logsIterator = job.debugJob();
			expect(logsIterator instanceof Logs).toBeTruthy();
			let logs1 = await logsIterator.next();
			expect(Array.isArray(logs1.logs)).toBeTruthy();
			expect(Array.isArray(logs1.links)).toBeTruthy();
			let logs2 = await logsIterator.nextLogs();
			expect(Array.isArray(logs2)).toBeTruthy();
			// ToDo: Add more tests
		});

		var targetFolder = Math.random().toString(36);
		test('Job Results', async () => {
			let finishedJob = null;
			job.monitorJob((job, logs) => {
				if (job.status === 'finished') {
					finishedJob = job;
				}
			}, 5);
			await waitForExpect(() => {
				expect(finishedJob).not.toBeNull();
			}, timeout * 5/6, 5000);

			// Get STAC
			var res = await job.getResultsAsStac();
			expect(res).not.toBeNull();
			expect(res.stac_version).toBe(STAC_MIGRATE_VERSION);
			expect(res).toHaveProperty("assets");
			expect(Utils.size(res)).toBeGreaterThan(0);
			expect(res).toHaveProperty("links");

			// Get links
			var assets = await job.listResults();
			expect(Array.isArray(assets)).toBeTruthy();
			expect(assets.length).toBeGreaterThan(0);

			// Download results
			if (isBrowserEnv) {
				// Browser environment
				await expect(job.downloadResults()).rejects.toThrow();
			}
			else {
				// Node environment
				// Create folder
				const fs = require('fs');
				if (!fs.existsSync(targetFolder)) {
					fs.mkdirSync(targetFolder);
				}
				expect(fs.existsSync(targetFolder)).toBeTruthy();
				// Download files
				var files = await job.downloadResults(targetFolder);
				expect(files.length).toBe(assets.length);
				for(var i in files) {
					expect(fs.existsSync(files[i])).toBeTruthy();
				}
			}
		});

		test('Stop job', async () => {
			// Not implemented by GEE back-end
			expect(job2 instanceof Job).toBeTruthy();
			
			await expect(job2.stopJob()).rejects.toThrow();
		});

		test('Delete job', async () => {
			expect(job2 instanceof Job).toBeTruthy();

			await job2.deleteJob();

			var jobs = await con.listJobs();
			expect(jobs).toHaveLength(1);
		});

		afterAll(async () => {
			if (!isBrowserEnv) {
				// clean up
				const fs = require('fs');
				const path = require('path');
				var files = fs.readdirSync(targetFolder);
				files.map(file => {
					fs.unlinkSync(path.join(targetFolder, file));
				});
				fs.rmdirSync(targetFolder);
			}
		});
	});

	describe('Secondary Services management', () => {
		var con;
		beforeAll(async () => {
			con = await connectWithBasicAuth();
			// clean up
			var list = await con.listServices();
			await Promise.all(list.map(s => s.deleteService()));
		});

		test('List services in general', async () => {
			var svcs = await con.listServices();
			expect(svcs).not.toBeNull();
			expect(svcs).toHaveLength(0);
		});

		var svc;
		test('Add minimal service', async () => {
			svc = await con.createService(VALID_PROCESS, 'xyz');
			expect(svc instanceof Service).toBeTruthy();
			expect(svc.id).not.toBeNull();
			expect(svc.id).not.toBeUndefined();
			var svcs = await con.listServices();
			expect(svcs).toHaveLength(1);
			expect(svcs[0] instanceof Service).toBeTruthy();
			expect(svcs[0].id).toBe(svc.id);
		});

		test('Describe service', async () => {
			var svcdetails = await con.getService(svc.id);
			expect(svcdetails).not.toBeNull();
			expect(svcdetails).not.toBeUndefined();
			expect(svcdetails.id).toBe(svc.id);
			expect(svcdetails.title).toBeNull();
			expect(typeof svcdetails.url).toBe('string');
		});

		test('Update service', async () => {
			var success = await svc.updateService({title: 'Test service'});
			expect(success).toBeTruthy();
			var svcdetails = await svc.describeService();
			expect(svcdetails).not.toBeNull();
			expect(svcdetails).not.toBeUndefined();
			expect(svcdetails.id).toBe(svc.id);
			expect(svcdetails.title).toBe('Test service');
			expect(typeof svcdetails.url).toBe('string');
		});

		test('Monitor service', async () => {
			expect(svc.enabled).toBeTruthy();

			let stoppedService = null;
			let stopFn = svc.monitorService((service, logs) => {
				if (!service.enabled) {
					stoppedService = service;
					stopFn();
				}
			}, 5);
			await svc.updateService({enabled: false});
			await waitForExpect(() => {
				expect(stoppedService).not.toBeNull();
				expect(stoppedService.enabled).toBeFalsy();
			}, timeout * 5/6, 5000);
		});


		test('Delete service', async () => {
			await svc.deleteService();

			var svcs = await con.listServices();
			expect(svcs).toHaveLength(0);
		});
	});


	describe('File management', () => {
		var con, f;
		var fileContent = "Lorem ipsum";
		var fileName = "lorem.txt";
		beforeAll(async () => {
			con = await connectWithBasicAuth();
			// clean up
			var list = await con.listFiles();
			await Promise.all(list.map(f => f.deleteFile()));
			if (!isBrowserEnv) {
				const fs = require('fs');
				fs.writeFileSync(fileName, fileContent);
			}
		});

		test('List files in general', async () => {
			var files = await con.listFiles();
			expect(files).not.toBeNull();
			expect(files).toHaveLength(0);
		});

		var f;
		test('Upload file', async () => {
			f = await con.getFile(fileName);
			expect(f instanceof UserFile).toBeTruthy();
			expect(f.path).toBe(fileName);
			var files = await con.listFiles();
			expect(files).toHaveLength(0); // Zero => getFile doesn't create a file yet
			await f.uploadFile(isBrowserEnv ? fileContent : fileName);
			var files = await con.listFiles();
			expect(files).toHaveLength(1); // now it should be there
			expect(files[0] instanceof UserFile).toBeTruthy();
			expect(files[0].path).toBe(f.path);
		});

		test('Get file contents', async (done) => {
			var resource = await f.retrieveFile();
			expect(resource).not.toBeNull();
			if (isBrowserEnv) { // Browser environment
				expect(resource).toBeInstanceOf(Blob);
				var reader = new FileReader();
				reader.addEventListener("loadend", () => {
					// expect(...) can throw itself, so we have to wrap this assertion in try/catch.
					// Otherwise it could happen that done() is never called!
					try {
						expect(reader.result).toBe(fileContent);
						done();
					}
					catch(error) {
						console.log(error.message); // it's not being printed by expect itself
						done.fail();
					}
				});
				reader.readAsText(resource);
			}
			else { // Node environment
				const stream = require('stream');
				expect(resource).toBeInstanceOf(stream.Readable);

				const chunks = [];
				resource.on("data", function (chunk) {
					chunks.push(chunk);
				});
				resource.on("end", function () {
					expect(Buffer.concat(chunks).toString()).toBe(fileContent);
					done();
				});
			}
		});

		var target = "downloaded_file.txt";
		test('Download/Save file', async () => {
			if (isBrowserEnv) { 
				// Browser environment
				// Hard to test a browser download, ignore
				return;
			}
			else {
				// Node environment
				const fs = require('fs');
				// Make sure no old file exists
				if (fs.existsSync(target)) {
					fs.unlinkSync(target);
				}
				expect(fs.existsSync(target)).toBeFalsy();
				// Download file
				await f.downloadFile(target);
				expect(fs.existsSync(target)).toBeTruthy();
				expect(fs.readFileSync(target).toString()).toBe(fileContent);
			}
		})

		test('Update file being not supported', async () => {
			expect(f.updateFile).toBeUndefined();
			expect(f.replaceFile).toBeUndefined();
		});

		test('Delete file', async () => {
			await f.deleteFile();

			var files = await con.listFiles();
			expect(files).toHaveLength(0);
		});

		afterAll(() => {
			if (!isBrowserEnv) {
				const fs = require('fs');
				fs.unlinkSync(fileName);
				fs.unlinkSync(target);
			}
		});

	});
});
