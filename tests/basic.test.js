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
	const TESTBACKEND = 'http://earthengine.openeo.org:8080/v0.3';
	const TESTCAPABILITIES = JSON.parse('{"version":"0.3.1","endpoints":[{"path":"/","methods":["GET"]},{"path":"/service_types","methods":["GET"]},{"path":"/output_formats","methods":["GET"]},{"path":"/stac","methods":["GET"]},{"path":"/collections","methods":["GET"]},{"path":"/collections/{collection_id}","methods":["GET"]},{"path":"/processes","methods":["GET"]},{"path":"/files/{user_id}","methods":["GET"]},{"path":"/files/{user_id}/{path}","methods":["GET","PUT","DELETE"]},{"path":"/preview","methods":["POST"]},{"path":"/jobs","methods":["POST","GET"]},{"path":"/jobs/{job_id}","methods":["GET","PATCH","DELETE"]},{"path":"/jobs/{job_id}/results","methods":["GET","POST","DELETE"]},{"path":"/temp/{token}/{file}","methods":["GET"]},{"path":"/services","methods":["GET","POST"]},{"path":"/services/{service_id}","methods":["GET","PATCH","DELETE"]},{"path":"/xyz/{service_id}/{z}/{x}/{y}","methods":["GET"]},{"path":"/subscription","methods":["GET"]},{"path":"/credentials/basic","methods":["GET"]},{"path":"/credentials","methods":["POST"]},{"path":"/me","methods":["GET"]},{"path":"/validation","methods":["POST"]},{"path":"/process_graphs","methods":["GET","POST"]},{"path":"/process_graphs/{process_graph_id}","methods":["GET","PATCH","DELETE"]}],"billing":{"currency":"USD","default_plan":"free","plans":[{"name":"free","description":"Earth Engine is free for research, education, and nonprofit use. For commercial applications, Google offers paid commercial licenses. Please contact earthengine-commercial@google.com for details."}]}}');
	const TESTCOLLECTION = JSON.parse(`{"name":"USGS/GTOPO30","title":"GTOPO30: Global 30 Arc-Second Elevation","description":"GTOPO30 is a global digital elevation model (DEM) with a horizontal grid spacing of 30 arc seconds (approximately 1 kilometer). The DEM was derived from several raster and vector sources of topographic information.  Completed in late 1996, GTOPO30 was developed over a three-year period through a collaborative effort led by the U.S. Geological Survey's Center for Earth Resources Observation and Science (EROS). The following organizations  participated by contributing funding or source data:  the National Aeronautics  and Space Administration (NASA), the United Nations Environment Programme/Global Resource Information Database (UNEP/GRID), the U.S. Agency for International Development (USAID), the Instituto Nacional de Estadistica Geografica e Informatica (INEGI) of Mexico, the Geographical Survey Institute  (GSI) of Japan, Manaaki Whenua Landcare Research of New Zealand, and the  Scientific Committee on Antarctic Research (SCAR).","license":"proprietary","extent":{"spatial":[-180,-90,180,90],"temporal":["1996-01-01T00:00:00Z","1996-01-01T00:00:00Z"]},"links":[{"rel":"self","href":"https://earthengine.openeo.org/v0.3/collections/USGS/GTOPO30"},{"rel":"parent","href":"https://earthengine.openeo.org/v0.3/collections"},{"rel":"root","href":"https://earthengine.openeo.org/v0.3/collections"}]}`);
	const TESTPROCESS = JSON.parse('{"name":"count_time","description":"Counts the number of images with a valid mask in a time series for all bands of the input dataset.","parameters":{"imagery":{"description":"EO data to process.","required":true,"schema":{"type":"object","format":"eodata"}}},"returns":{"description":"Processed EO data.","schema":{"type":"object","format":"eodata"}}}');
	const TESTPROCESSGGRAPH = {"process_id": "stretch_colors","imagery": {"process_id": "min_time","imagery": {"process_id": "NDVI","imagery": {"process_id": "filter_daterange","imagery": {"process_id": "get_collection","name": "COPERNICUS/S2"},"extent": ["2018-01-01T00:00:00Z","2018-01-31T23:59:59Z"]},"red": "B4","nir": "B8"}},"min": -1,"max": 1};
	var obj = new OpenEO();

	async function connectWithoutAuth() {
		return obj.connect(TESTBACKEND);
	}

	async function connectWithBasicAuth() {
		return obj.connect(TESTBACKEND, 'basic', {username: 'group5', password: 'test123'});
	}

	describe('Connecting', () => {	
		test('Connect without credentials', async () => {
			await connectWithoutAuth().then(async con => {
				expect(con).not.toBeNull();
				expect(Object.getPrototypeOf(con).constructor.name).toBe('Connection');
				expect(con.isLoggedIn()).toBeFalsy();
				expect(con.getUserId()).toBeNull();
			});
		});

		test('Connect with Basic Auth credentials', async () => {
			await connectWithBasicAuth().then(con => {
				expect(con).not.toBeNull();
				expect(Object.getPrototypeOf(con).constructor.name).toBe('Connection');
				expect(con.isLoggedIn()).toBeTruthy();
				expect(con.getUserId()).toBe('group5');
			});
		});

		test('Manually connect with Basic Auth credentials', async () => {
			await connectWithoutAuth().then(async con => {
				expect(con).not.toBeNull();
				expect(Object.getPrototypeOf(con).constructor.name).toBe('Connection');
				expect(con.isLoggedIn()).toBeFalsy();
				expect(con.getUserId()).toBeNull();
				var login = await con.authenticateBasic('group5', 'test123');
				expect(con).not.toBeNull();
				expect(Object.getPrototypeOf(con).constructor.name).toBe('Connection');
				expect(con.isLoggedIn()).toBeTruthy();
				expect(con.getUserId()).toBe('group5');
				expect(login).toHaveProperty('user_id');
				expect(login).toHaveProperty('access_token');
			});
		});

		test('Auth via OIDC is not implemented yet', async () => {
			await connectWithoutAuth().then(async con => {
				expect(con).not.toBeNull();
				expect(Object.getPrototypeOf(con).constructor.name).toBe('Connection');
				expect(con.isLoggedIn()).toBeFalsy();
				expect(con.getUserId()).toBeNull();
				expect(con.authenticateOIDC).toThrowError('Not implemented yet.');
			});
		});
	});
	
	describe('Getters', () => {
		test('Get baseurl', async () => {
			await connectWithoutAuth().then(con => {
				expect(con.getBaseUrl()).toBe(TESTBACKEND);
			});
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
			expect(caps).not.toBeNull();
			expect(Object.getPrototypeOf(caps).constructor.name).toBe('Capabilities');
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
			con = await connectWithBasicAuth();
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

		test('List files', async () => {
			var fs = await con.listFiles();
			expect(fs).not.toBeNull();
			expect(fs).toHaveLength(0);
		});
	});

	describe('CRUD process graphs', async () => {
		var con;
		beforeAll(async (done) => {
			con = await connectWithBasicAuth();
			done();
		});

		test('List process graphs', async () => {
			var pgs = await con.listProcessGraphs();
			expect(pgs).not.toBeNull();
		});

		test('Make sure there are no process graphs', async () => {
			var pgs = await con.listProcessGraphs();
			expect(pgs).toHaveLength(0);
		});

		var pg1;
		var pg2;
		test('Add process graph without metadata', async () => {
			var pg = await con.createProcessGraph(TESTPROCESSGGRAPH);
			expect(pg).not.toBeNull();
			expect(pg).not.toBeUndefined();
			expect(Object.getPrototypeOf(pg).constructor.name).toBe('ProcessGraph');
			expect(pg.connection).toBe(con);
			expect(pg.processGraphId).not.toBeNull();
			expect(pg.processGraphId).not.toBeUndefined();
			expect(pg.title).toBeNull();
			expect(pg.description).toBeNull();
			pg1 = pg;
		});

		test('Make sure there is now 1 process graph, with no metadata', async () => {
			var pgs = await con.listProcessGraphs();
			expect(pgs).toHaveLength(1);
			expect(pgs[0]).not.toBeNull();
			expect(pgs[0]).not.toBeUndefined();
			expect(Object.getPrototypeOf(pgs[0]).constructor.name).toBe('ProcessGraph');
			expect(pgs[0].processGraphId).not.toBeNull();
			expect(pgs[0].processGraphId).toBe(pg1.processGraphId);
			expect(pgs[0].title).toBeNull();
			expect(pgs[0].description).toBeNull();
			expect(pgs[0]).toEqual(pg1);
		});

		test('Add process graph with metadata', async () => {
			var pg = await con.createProcessGraph(TESTPROCESSGGRAPH, 'Test title', 'Test description');
			expect(pg).not.toBeNull();
			expect(pg).not.toBeUndefined();
			expect(Object.getPrototypeOf(pg).constructor.name).toBe('ProcessGraph');
			expect(pg.connection).toBe(con);
			expect(pg.processGraphId).not.toBeNull();
			expect(pg.processGraphId).not.toBe(pg1.processGraphId);
			expect(pg.title).toBe('Test title');
			expect(pg.description).toBe('Test description');
			pg2 = pg;
		});

		test('Make sure there are now 2 process graphs, the second with metadata', async () => {
			var pgs = await con.listProcessGraphs();
			expect(pgs).toHaveLength(2);
			var pg = (pgs[0].processGraphId != pg1.processGraphId ? pgs[0] : pgs[1]);
			expect(pg).not.toBeNull();
			expect(pg).not.toBeUndefined();
			expect(Object.getPrototypeOf(pg).constructor.name).toBe('ProcessGraph');
			expect(pg.processGraphId).not.toBeNull();
			expect(pg.processGraphId).not.toBe(pg1.processGraphId);
			expect(pg.processGraphId).toBe(pg2.processGraphId);
			expect(pg.title).toBe('Test title')
			expect(pg.description).toBe('Test description');
			if(pgs[0].processGraphId == pg1.processGraphId) {
				expect(pgs[0]).toEqual(pg1);
				expect(pgs[1]).toEqual(pg2);
			} else {
				expect(pgs[0]).toEqual(pg2);
				expect(pgs[1]).toEqual(pg1);
			}
			
		});

		test('Describe process graph without metadata', async () => {
			var pg = await pg1.describeProcessGraph();
			expect(pg).not.toBeNull();
			expect(pg).not.toBeUndefined();
			expect(pg.process_graph_id).not.toBeNull();
			expect(pg.process_graph_id).toBe(pg1.processGraphId);
			expect(pg.title).toBeNull();
			expect(pg.description).toBeNull();
		});

		test('Describe process graph with metadata', async () => {
			var pg = await pg2.describeProcessGraph();
			expect(pg).not.toBeNull();
			expect(pg).not.toBeUndefined();
			expect(pg.process_graph_id).not.toBeNull();
			expect(pg.process_graph_id).toBe(pg2.processGraphId);
			expect(pg.title).toBe('Test title');
			expect(pg.description).toBe('Test description');
		});

		test('Update process graph', async () => {
			await pg1.updateProcessGraph({title: 'Test title 2'});
			var pg = await pg1.describeProcessGraph();
			expect(pg).not.toBeNull();
			expect(pg).not.toBeUndefined();
			expect(pg.process_graph_id).not.toBeNull();
			expect(pg.process_graph_id).toBe(pg1.processGraphId);
			expect(pg.title).toBe('Test title 2');
			expect(pg.description).toBeNull();
		});

		test('Delete the second process graph', async () => {
			const success = await pg2.deleteProcessGraph();
			expect(success).toBeTruthy();
			
			var pgs = await con.listProcessGraphs();
			expect(pgs).toHaveLength(1);
			expect(pgs[0].processGraphId).toBe(pg1.processGraphId);
		});
	});

	describe('CRUD jobs', async () => {
		var con;
		beforeAll(async (done) => {
			con = await connectWithBasicAuth();
			done();
		});

		test('List jobs in general', async () => {
			var jobs = await con.listJobs();
			expect(jobs).not.toBeNull();
		});

		test('Make sure there are no jobs', async () => {
			var jobs = await con.listJobs();
			expect(jobs).toHaveLength(0);
		});

		var job;
		test('Add minimal job', async () => {
			job = await con.createJob(TESTPROCESSGGRAPH);
			expect(Object.getPrototypeOf(job).constructor.name).toBe('Job');
			expect(job.jobId).not.toBeNull();
			expect(job.jobId).not.toBeUndefined();
			var jobs = await con.listJobs();
			expect(jobs).toHaveLength(1);
			expect(Object.getPrototypeOf(jobs[0]).constructor.name).toBe('Job');
			expect(jobs[0].jobId).toBe(job.jobId);
		});

		test('Describe job', async () => {
			var jobdetails = await job.describeJob();
			expect(jobdetails).not.toBeNull();
			expect(jobdetails).not.toBeUndefined();
			expect(jobdetails.job_id).toBe(job.jobId);
			expect(jobdetails.title).toBeNull();
			expect(typeof jobdetails.submitted).toBe('string');
		})

		test('Update job', async () => {
			var success = await job.updateJob({title: 'Test job'});
			expect(success).toBeTruthy();
			var jobdetails = await job.describeJob();
			expect(jobdetails).not.toBeNull();
			expect(jobdetails).not.toBeUndefined();
			expect(jobdetails.job_id).toBe(job.jobId);
			expect(jobdetails.title).toBe('Test job');
			expect(typeof jobdetails.submitted).toBe('string');
		});

		test('Delete job', async () => {
			var success = await job.deleteJob();
			expect(success).toBeTruthy();
			var jobs = await con.listJobs();
			expect(jobs).toHaveLength(0);
		});
	});

	describe('CRUD services', async () => {
		var con;
		beforeAll(async (done) => {
			con = await connectWithBasicAuth();
			done();
		});

		test('List services in general', async () => {
			var svcs = await con.listServices();
			expect(svcs).not.toBeNull();
		});

		test('Make sure there are no services', async () => {
			var svcs = await con.listServices();
			expect(svcs).toHaveLength(0);
		});

		var svc;
		test('Add minimal service', async () => {
			svc = await con.createService(TESTPROCESSGGRAPH, 'xyz');
			expect(Object.getPrototypeOf(svc).constructor.name).toBe('Service');
			expect(svc.serviceId).not.toBeNull();
			expect(svc.serviceId).not.toBeUndefined();
			var svcs = await con.listServices();
			expect(svcs).toHaveLength(1);
			expect(Object.getPrototypeOf(svcs[0]).constructor.name).toBe('Service');
			expect(svcs[0].serviceId).toBe(svc.serviceId);
		});

		test('Describe service', async () => {
			var svcdetails = await svc.describeService();
			expect(svcdetails).not.toBeNull();
			expect(svcdetails).not.toBeUndefined();
			expect(svcdetails.service_id).toBe(svc.serviceId);
			expect(svcdetails.title).toBeNull();
			expect(typeof svcdetails.url).toBe('string');
		})

		test('Update service', async () => {
			var success = await svc.updateService({title: 'Test service'});
			expect(success).toBeTruthy();
			var svcdetails = await svc.describeService();
			expect(svcdetails).not.toBeNull();
			expect(svcdetails).not.toBeUndefined();
			expect(svcdetails.service_id).toBe(svc.serviceId);
			expect(svcdetails.title).toBe('Test service');
			expect(typeof svcdetails.url).toBe('string');
		});

		test('Delete service', async () => {
			var success = await svc.deleteService();
			expect(success).toBeTruthy();
			var svcs = await con.listServices();
			expect(svcs).toHaveLength(0);
		});
	});

	describe('CRUD files', async () => {
		var con;
		beforeAll(async (done) => {
			con = await connectWithBasicAuth();
			done();
		});

		test('List files in general', async () => {
			var files = await con.listFiles();
			expect(files).not.toBeNull();
		});

		test('Make sure there are no files', async () => {
			var files = await con.listFiles();
			expect(files).toHaveLength(0);
		});

		var f;
		test('Upload file', async () => {
			f = await con.createFile('test.txt');
			expect(Object.getPrototypeOf(f).constructor.name).toBe('File');
			expect(f.name).toBe('test.txt');
			expect(f.userId).toBe('group5');
			var files = await con.listFiles();
			expect(files).toHaveLength(0); // SIC!!! Zero! createFile only creates it locally
			await f.uploadFile('Lorem ipsum');
			var files = await con.listFiles();
			expect(files).toHaveLength(1); // now it should be there
			expect(Object.getPrototypeOf(files[0]).constructor.name).toBe('File');
			expect(files[0].name).toBe(f.name);
		});

		test('Download file', async (done) => {  // use `done` to wait for the event
			var blob = await f.downloadFile(undefined);
			
			var reader = new FileReader();
			reader.addEventListener("loadend", () => {
				// expect(...) can throw itself, so we have to wrap this assertion in try/catch.
				// Otherwise it could happen that done() is never called!
				try {
					expect(reader.result).toBe('Lorem ipsum');
					done();  // all good
				}
				catch(error) {
					console.log(error);  // it's not being printed by expect itself
					done.fail();  // explicitly fail the test (we're in a catch block and that's no good)
				}
			 });
			 reader.readAsText(blob);
		})

		test('Update file being not supported', async () => {
			expect(f.updateFile).toBeUndefined();
			expect(f.replaceFile).toBeUndefined();
		});

		test('Delete file', async () => {
			var success = await f.deleteFile();
			expect(success).toBeTruthy();
			var files = await con.listFiles();
			expect(files).toHaveLength(0);
		});
	});

	afterAll(async (done) => {
		// clean up all the stuff created during CRUD testing
		con = await connectWithBasicAuth();
		await con.listProcessGraphs().then(list => list.forEach(async pg => await pg.deleteProcessGraph()));
		await con.listJobs().then(list => list.forEach(async j => await j.deleteJob()));
		await con.listServices().then(list => list.forEach(async s => await s.deleteService()));
		await con.listFiles().then(list => list.forEach(async f => await f.deleteFile()));
		done();
	});
});
