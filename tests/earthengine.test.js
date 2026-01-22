// @ts-nocheck
const { Client, Connection, FileTypes, Capabilities, UserProcess, Job, Service, UserFile, BasicProvider, Logs } = require('../src/client');
const { Utils } = require('@openeo/js-commons');
const waitForExpect = require("wait-for-expect");

const timeout = 2*60*1000;
jest.setTimeout(timeout); // Give Google some time to process data

describe('GEE back-end', () => {
	const { TESTBACKEND, TESTPATH, TESTUSERNAME, TESTPASSWORD, STAC_MIGRATE_VERSION } = require('./config.js');
	const TESTBACKENDDIRECT = TESTBACKEND + TESTPATH;
	const TESTCOLLECTION = require("./data/gee/collection.json");
	const TESTPROCESS = require("./data/gee/process.json");
	const PROCESSGRAPH = require("./data/gee/processgraph.json");
	const VALID_PROCESS = {"process_graph":PROCESSGRAPH};
	const INVALID_PROCESS = {"process_graph":{"load": {"process_id": "load_collection","arguments": {}}}};

	const isBrowserEnv = (typeof Blob !== 'undefined');

	async function connectWithoutAuth() {
		return await Client.connect(TESTBACKEND);
	}

	async function connectWithBasicAuth() {
		let con = await Client.connect(TESTBACKEND);
		await con.authenticateBasic(TESTUSERNAME, TESTPASSWORD);
		return con;
	}

	describe('Connecting', () => {
		test('Connect with wrong Server URL', async () => {
			await expect(Client.connect("http://invalid.openeo.org")).rejects.toThrow();
		});

		test('Connect', async () => {
			let con = await Client.connect(TESTBACKEND);
			expect(con instanceof Connection).toBeTruthy();
			expect(con.isAuthenticated()).toBeFalsy();
			expect(con.getUrl()).toBe(TESTBACKEND);
			expect(con.getBaseUrl()).toBe(TESTBACKENDDIRECT);
			let cap = con.capabilities();
			expect(cap instanceof Capabilities).toBeTruthy();
		});

		test('Connect directly to a known version via connect', async () => {
			let con = await Client.connect(TESTBACKENDDIRECT);
			expect(con instanceof Connection).toBeTruthy();
			expect(con.isAuthenticated()).toBeFalsy();
			expect(con.getUrl()).toBe(TESTBACKENDDIRECT);
			expect(con.getBaseUrl()).toBe(TESTBACKENDDIRECT);
			let cap = con.capabilities();
			expect(cap instanceof Capabilities).toBeTruthy();
		});

		test('Connect directly to a known version via connectDirect', async () => {
			let con = await Client.connectDirect(TESTBACKENDDIRECT);
			expect(con.isAuthenticated()).toBeFalsy();
			expect(con.getUrl()).toBe(TESTBACKENDDIRECT);
			expect(con.getBaseUrl()).toBe(TESTBACKENDDIRECT);
			let cap = con.capabilities();
			expect(cap instanceof Capabilities).toBeTruthy();
		});
	});

	describe('Auth', () => {
		let con;
		beforeAll(async () => {
			con = await connectWithoutAuth();
		});

		let providers;
		let basic;
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
		let con;
		beforeAll(async () => {
			con = await connectWithoutAuth();
		});
		
		test('Capabilities', async () => {
			let caps = await con.capabilities();
			expect(caps instanceof Capabilities).toBeTruthy();
			expect(caps.apiVersion()).toBe("1.2.0");
			expect(caps.backendVersion()).not.toBeUndefined();
			expect(caps.title()).toBe("Google Earth Engine Proxy for openEO");
			expect(caps.description()).not.toBeUndefined();
			expect(caps.isStable()).toBe(false);
			expect(caps.links().length).toBeGreaterThan(0);
			expect(caps.listFeatures()).toEqual([
				"capabilities",
				"listFileTypes",
				"listServiceTypes",
				"listCollections",
				"describeCollection",
				"describeCollectionItem",
				"describeCollectionQueryables",
				"listProcesses",
				"describeProcess",
				"listAuthProviders",
				"listCollectionItems",
				"authenticateBasic",
				"authenticateOIDC",
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
				"stopJob",
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
			let plans = caps.listPlans();
			expect(plans.length).toBe(1);
			expect(plans[0].name).toBe("free");
			expect(plans[0].description).not.toBeUndefined();
			expect(plans[0].paid).toBe(false);
			expect(caps.currency()).toEqual("USD");
			expect(caps.hasFeature('startJob')).toBeTruthy();
			expect(caps.hasFeature('getFile')).toBeTruthy();
			expect(caps.hasFeature('somethingThatIsntSupported')).toBeFalsy();
		});

		test('Collections', async () => {
			let colls = await con.listCollections();
			expect(colls).toHaveProperty('collections');
			expect(colls).toHaveProperty('links');
			expect(Array.isArray(colls.collections)).toBe(true);
			expect(colls.collections.length).toBeGreaterThan(50);
			expect(colls.collections[0]).toHaveProperty("description");
			expect(colls.collections[0]).toHaveProperty("license");
			expect(colls.collections[0]).toHaveProperty("extent");
			expect(colls.collections[0]).toHaveProperty("links");
		});

		test('Collections in detail', async () => {
			let coll = await con.describeCollection(TESTCOLLECTION.id);
			expect(coll.stac_version).toBe(STAC_MIGRATE_VERSION);
			expect(coll.stac_extensions).toEqual(["https://stac-extensions.github.io/datacube/v2.2.0/schema.json"]);
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
			let procs = await con.listProcesses();
			expect(procs).toHaveProperty('processes');
			expect(procs.processes.length).toBeGreaterThan(10);
			let min = procs.processes.filter(x => x.id === 'min');
			expect(min.length).toBe(1);
			expect(min[0]).toEqual(TESTPROCESS);
			expect(procs.processes).toContainEqual(TESTPROCESS);
		});

		test('Single Process', async () => {
			let min = await con.describeProcess('min');
			expect(min).toEqual(TESTPROCESS);
			let invalid = await con.describeProcess('invalid');
			expect(invalid).toBeNull();
		});

		test('File types', async () => {
			let types = await con.listFileTypes();
			expect(types instanceof FileTypes).toBeTruthy();
			expect(Utils.size(types.getInputTypes())).toBe(0);
			expect(Utils.size(types.getOutputTypes())).toBeGreaterThan(1);
			expect(types.getInputType('PNG')).toBeNull();
			expect(types.getOutputType('PNG')).toHaveProperty('title');
			expect(types.getOutputType('PNG')).toHaveProperty('gis_data_types');
			expect(types.getOutputType('PNG')).toHaveProperty('parameters');
			expect(types.getOutputType('png')).toHaveProperty('gis_data_types');
		});

		test('Service types', async () => {
			let types = await con.listServiceTypes();
			expect(types).toHaveProperty('xyz');
		});

		test('UDF runtimes', async () => {
			// Not implemented by GEE back-end
			await expect(con.listUdfRuntimes()).rejects.toThrow();
		});
	});

	describe('Getting user-specific data', () => {
		let con;
		beforeAll(async () => {
			con = await connectWithBasicAuth();
		});

		test('Describe account', async () => {
			let acc = await con.describeAccount();
			expect(acc.user_id).not.toBeUndefined();
			expect(acc.name).toBe(TESTUSERNAME);
		});
	});
	
	describe('Process graph validation', () => {
		let con;
		beforeAll(async () => {
			con = await connectWithBasicAuth();
		});

		test('Valid process graph', async () => {
			let result = await con.validateProcess(VALID_PROCESS);
			expect(Array.isArray(result)).toBeTruthy();
			expect(result.length).toBe(0);
			expect(result["federation:backends"]).toEqual([]);
		});

		test('Invalid process graph', async () => {
			let result = await con.validateProcess({
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
		let con;
		beforeAll(async () => {
			con = await connectWithBasicAuth();
			// clean up
			let list = await con.listUserProcesses();
			await Promise.all(list.map(pg => pg.deleteUserProcess()));
		});

		test('List process graphs', async () => {
			let pgs = await con.listUserProcesses();
			expect(pgs).not.toBeNull();
			expect(pgs).toHaveLength(0);
			expect(pgs instanceof Array).toBeTruthy();
			expect(pgs.links).toHaveLength(1);
			expect(pgs['federation:missing']).toEqual([]);
		});

		let pg1;
		let pg2;
		test('Add process graph without metadata', async () => {
			let pg = await con.setUserProcess('myndvi', VALID_PROCESS);
			expect(pg instanceof UserProcess).toBeTruthy();
			expect(pg.connection).toBe(con);
			expect(pg.id).toBe('myndvi');
			expect(pg.processGraph).toEqual(PROCESSGRAPH);
			pg1 = pg;
		});

		test('Make sure there is now 1 process graph, with no metadata', async () => {
			let pgs = await con.listUserProcesses();
			expect(pgs).toHaveLength(1);
			expect(pgs[0] instanceof UserProcess).toBeTruthy();
			expect(pgs[0].id).toBe('myndvi');
			expect(pgs[0].id).toBe(pg1.id);
		});

		let summary = "Test title";
		let description = "Test description";
		test('Add process graph with metadata', async () => {
			let pg = await con.setUserProcess('foobar', Object.assign({}, VALID_PROCESS, {summary, description}));
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
			let pgs = await con.listUserProcesses();
			expect(pgs).toHaveLength(2);
			let pg = (pgs[0].id != pg1.id ? pgs[0] : pgs[1]);
			expect(pg instanceof UserProcess).toBeTruthy();
			expect(typeof pg.id).toBe('string');
			expect(pg.id).not.toBe(pg1.id);
			expect(pg.id).toBe(pg2.id);
			expect(pg.summary).toBe('Test title')
			expect(pg.description).toBe('Test description');
			
		});

		test('Describe process graph without metadata', async () => {
			let pg = await con.getUserProcess(pg1.id);
			expect(pg instanceof UserProcess).toBeTruthy();
			expect(typeof pg.id).toBe('string');
			expect(pg.id).toBe(pg1.id);
			expect(pg.process_graph).toBe(pg1.process_graph);
		});

		test('Describe process graph with metadata', async () => {
			let pg = await con.getUserProcess(pg2.id);
			expect(pg instanceof UserProcess).toBeTruthy();
			expect(typeof pg.id).toBe('string');
			expect(pg.id).toBe(pg2.id);
			expect(pg.summary).toBe(summary);
			expect(pg.description).toBe(description);
		});

		test('Update process graph', async () => {
			let summary = 'Test title 2';
			await pg1.replaceUserProcess(Object.assign({}, VALID_PROCESS, {summary}));
			let pg = await pg1.describeUserProcess();
			expect(pg instanceof UserProcess).toBeTruthy();
			expect(typeof pg.id).toBe('string');
			expect(pg.id).toBe(pg1.id);
			expect(pg.summary).toBe(summary);
			expect(pg.processGraph).toEqual(PROCESSGRAPH);
		});

		test('Delete the second process graph', async () => {
			await pg2.deleteUserProcess();
			
			let pgs = await con.listUserProcesses();
			expect(pgs).toHaveLength(1);
			expect(pgs[0].id).toBe(pg1.id);
		});
	});
	
	describe('Sync. computation of results', () => {
		let con;
		beforeAll(async () => {
			con = await connectWithBasicAuth();
		});

		test('Sync. compute a process graph result / Success', async () => {
			let resource = await con.computeResult(VALID_PROCESS, 'jpeg');
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
				let r = await con.computeResult(INVALID_PROCESS, 'jpeg');
				expect(r).toBeUndefined();
			} catch (error) {
				console.log(error)
				expect(error.code).toBe("ResultNodeMissing");
				expect(error.message).toBe("No result node found for the process.")
			}
		});
	});

	describe('Job management', () => {
		let con;
		beforeAll(async () => {
			con = await connectWithBasicAuth();
			// clean up
			let list = await con.listJobs();
			await Promise.all(list.map(j => j.deleteJob()));
		});

		test('List jobs in general', async () => {
			let jobs = await con.listJobs();
			expect(jobs).not.toBeNull();
			expect(jobs).toHaveLength(0);
			expect(jobs instanceof Array).toBeTruthy();
			expect(jobs.links).toHaveLength(1);
			expect(jobs['federation:missing']).toEqual([]);
		});

		let job;
		let job2;
		test('Add two minimal job', async () => {
			job = await con.createJob(VALID_PROCESS);
			expect(job instanceof Job).toBeTruthy();
			expect(job.id).not.toBeNull();
			expect(job.id).not.toBeUndefined();

			let jobs = await con.listJobs();
			expect(jobs).toHaveLength(1);
			expect(jobs[0] instanceof Job).toBeTruthy();
			expect(jobs[0].id).toBe(job.id);

			job2 = await con.createJob(VALID_PROCESS);
			expect(job2 instanceof Job).toBeTruthy();

			jobs = await con.listJobs();
			expect(jobs).toHaveLength(2);
		});

		test('Describe job', async () => {
			let jobdetails = await con.getJob(job.id);
			expect(jobdetails).not.toBeNull();
			expect(jobdetails).not.toBeUndefined();
			expect(jobdetails.id).toBe(job.id);
			expect(jobdetails.title).toBeNull();
			expect(jobdetails.status).toBe('created');
			expect(typeof jobdetails.created).toBe('string');
		});

		test('Update job', async () => {
			let success = await job.updateJob({title: 'Test job'});
			expect(success).toBeTruthy();
			let jobdetails = await job.describeJob();
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
			let jobdetails = await job.describeJob();
			expect(['queued', 'running', 'finished']).toContain(jobdetails.status);
		});
		
		test('Debug Job', async () => {
			let logsIterator = job.debugJob();
			expect(logsIterator instanceof Logs).toBeTruthy();
			expect(logsIterator.getMissingBackends()).toEqual([]);
			let logs1 = await logsIterator.next();
			expect(Array.isArray(logs1.logs)).toBeTruthy();
			expect(Array.isArray(logs1.links)).toBeTruthy();
			expect(logsIterator.getMissingBackends()).toEqual([]);
			let logs2 = await logsIterator.nextLogs();
			expect(Array.isArray(logs2)).toBeTruthy();
			expect(logsIterator.getMissingBackends()).toEqual([]);
			// ToDo: Add more tests
		});

		let targetFolder = Math.random().toString(36);
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
			let res = await job.getResultsAsStac();
			expect(res).not.toBeNull();
			expect(res.stac_version).toBe(STAC_MIGRATE_VERSION);
			expect(res).toHaveProperty("assets");
			expect(Utils.size(res)).toBeGreaterThan(0);
			expect(res).toHaveProperty("links");

			// Get links
			let assets = await job.listResults();
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
				let files = await job.downloadResults(targetFolder);
				expect(files.length).toBe(assets.length);
				for(let i in files) {
					expect(fs.existsSync(files[i])).toBeTruthy();
				}
			}
		});

		test('Stop job', async () => {
			const updatedJob = await job2.stopJob();
			expect(updatedJob instanceof Job).toBeTruthy();
			expect(["canceled", "created"]).toContain(updatedJob.status);
		});

		test('Delete job', async () => {
			expect(job2 instanceof Job).toBeTruthy();

			await job2.deleteJob();

			let jobs = await con.listJobs();
			expect(jobs).toHaveLength(1);
		});

		afterAll(async () => {
			if (!isBrowserEnv) {
				// clean up
				const fs = require('fs');
				const path = require('path');
				let files = fs.readdirSync(targetFolder);
				files.map(file => {
					fs.unlinkSync(path.join(targetFolder, file));
				});
				fs.rmdirSync(targetFolder);
			}
		});
	});
	
	describe('Secondary Services management', () => {
		let con;
		beforeAll(async () => {
			con = await connectWithBasicAuth();
			// clean up
			let list = await con.listServices();
			await Promise.all(list.map(s => s.deleteService()));
		});

		test('List services in general', async () => {
			let svcs = await con.listServices();
			expect(svcs).not.toBeNull();
			expect(svcs).toHaveLength(0);
			expect(svcs instanceof Array).toBeTruthy();
			expect(svcs.links).toHaveLength(1);
			expect(svcs['federation:missing']).toEqual([]);
		});

		let svc;
		test('Add minimal service', async () => {
			svc = await con.createService(VALID_PROCESS, 'xyz');
			expect(svc instanceof Service).toBeTruthy();
			expect(svc.id).not.toBeNull();
			expect(svc.id).not.toBeUndefined();
			let svcs = await con.listServices();
			expect(svcs).toHaveLength(1);
			expect(svcs[0] instanceof Service).toBeTruthy();
			expect(svcs[0].id).toBe(svc.id);
		});

		test('Describe service', async () => {
			let svcdetails = await con.getService(svc.id);
			expect(svcdetails).not.toBeNull();
			expect(svcdetails).not.toBeUndefined();
			expect(svcdetails.id).toBe(svc.id);
			expect(svcdetails.title).toBeNull();
			expect(typeof svcdetails.url).toBe('string');
		});

		test('Update service', async () => {
			let success = await svc.updateService({title: 'Test service'});
			expect(success).toBeTruthy();
			let svcdetails = await svc.describeService();
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

			let svcs = await con.listServices();
			expect(svcs).toHaveLength(0);
		});
	});

	describe('File management', () => {
		let con, f;
		let fileContent = "Lorem ipsum";
		let fileName = "lorem.txt";
		beforeAll(async () => {
			con = await connectWithBasicAuth();
			// clean up
			let list = await con.listFiles();
			await Promise.all(list.map(file => file.deleteFile()));
			if (!isBrowserEnv) {
				const fs = require('fs');
				fs.writeFileSync(fileName, fileContent);
			}
		});

		test('List files in general', async () => {
			let files = await con.listFiles();
			expect(files).not.toBeNull();
			expect(files).toHaveLength(0);
			expect(files instanceof Array).toBeTruthy();
			expect(files.links).toHaveLength(1);
			expect(files['federation:missing']).toEqual([]);
		});

		test('Upload file', async () => {
			f = await con.getFile(fileName);
			expect(f instanceof UserFile).toBeTruthy();
			expect(f.path).toBe(fileName);
			let files = await con.listFiles();
			expect(files).toHaveLength(0); // Zero => getFile doesn't create a file yet
			await f.uploadFile(isBrowserEnv ? fileContent : fileName);
			files = await con.listFiles();
			expect(files).toHaveLength(1); // now it should be there
			expect(files[0] instanceof UserFile).toBeTruthy();
			expect(files[0].path).toBe(f.path);
		});

		test('Get file contents', (done) => {
			f.retrieveFile().then(resource => {
				expect(resource).not.toBeNull();
				if (isBrowserEnv) { // Browser environment
					expect(resource).toBeInstanceOf(Blob);
					let reader = new FileReader();
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
			}).catch(error => {
				expect(error).toBeUndefined();
				done.fail();
			});
		});

		let target = "downloaded_file.txt";
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

			let files = await con.listFiles();
			expect(files).toHaveLength(0);
		});

		afterAll(() => {
			if (!isBrowserEnv) {
				const fs = require('fs');

				if (fs.existsSync(fileName)) {
					fs.unlinkSync(fileName);
				}
				
				if (fs.existsSync(target)) {
					fs.unlinkSync(target);
				}
			}
		});

	});
	
});
