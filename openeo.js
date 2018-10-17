class openEO {
	constructor() {
	}

	connect(url, authType = null, authOptions = null) {
		return new Connection(url, authType, authOptions);
	}

	version() {
	}
}


class Connection {
	constructor(baseUrl, authType = null, authOptions = null) {
		this._baseUrl = baseUrl;
		this._userId = null;
		this._token = null;

		if(authType !== null) {
			switch(authType) {
				case 'basic':
					this.authenticateBasic(authOptions.username, authOptions.password);
					break;
				case 'oidc':
					this.authenticateOIDC(authOptions);
					break;
				default:
					throw "Unknown authentication type";
			}
		}
	}

	capabilities() {
		this._get('/')
			.then(response => new Capabilities(response.data))
			.catch(error => { throw error; });
	}

	listFileTypes() {
		this._get('/output_formats')
			.then(response => response.data)
			.catch(error => { throw error; });
	}

	listServiceTypes() {
		this._get('/service_types')
			.then(response => response.data)
			.catch(error => { throw error; });
	}

	listCollections() {
		this._get('/collections')
			.then(response => response.data)
			.catch(error => { throw error; });
	}

	describeCollection(name) {
		this._get('/collections' + name)
			.then(response => response.data)
			.catch(error => { throw error; });
	}

	listProcesses() {
		this._get('/processes')
			.then(response => response.data)
			.catch(error => { throw error; });
	}

	authenticateOIDC(options = null) {
		throw "Not implemented (yet)";
	}

	authenticateBasic(username, password) {
		return this._send({
			method: 'get',
			responseType: 'json',
			url: '/credentials/basic',
			headers: {'Authorization': 'Basic ' + btoa(username + ':' + password)}  // btoa is JS's ugly name for encodeBase64
		}).then(response => {
			if (!response.data.user_id) {
				throw "No user_id returned.";
			}
			if (!response.data.access_token) {
				throw "No access_token returned.";
			}
			this._userId = response.data.user_id;
			this._token = response.data.access_token;
			return response.data;
		}).catch(error => {
			this._resetAuth();
			throw error;
		});
	}

	describeAccount() {
		this._get('/me')
			.then(response => response.data)
			.catch(error => { throw error; });
	}

	listFiles(userId = null) {  // userId defaults to authenticated user
		if(userId === null) {
			if(this._userId === null) {
				throw "userId not specified and no default value available because user is not logged in"
			} else {
				userId = this._userId;
			}
		}
		return this._get('/files/' + userId)
			.then(response => response.data.files.map((f) => new File(this, userId, f.name)))
			.catch(error => { throw error; });
	}

	createFile(path, userId = null) {  // userId defaults to authenticated user
		if(userId === null) {
			if(this._userId === null) {
				throw "userId not specified and no default value available because user is not logged in"
			} else {
				userId = this._userId;
			}
		}
		return new File(this, userId, path);
	}

	validateProcessGraph(processGraph) {
		return this._post('/validate', processGraph)
			.then(response => response.status == 204)
			.catch(error => { throw error; });
	}

	createProcessGraph(processGraph, title = null, description = null) {
		return this._post('/process_graphs', {title: title, description: description, process_graph: processGraph})
			.then(response => new ProcessGraph(this, response.headers['OpenEO-Identifier']))
			.catch(error => { throw error; });
	}

	listProcessGraphs() {
		return this._get('/process_graphs')
			.then(response => response.data.process_graphs.map((pg) => new ProcessGraph(this, pg.process_graph_id)))
			.catch(error => { throw error; });
	}

	execute(processGraph, outputFormat, outputParameters = null, budget = null) {
		return this._post('/preview', {
			process_graph: processGraph,
			output: {
				format: outputFormat,
				parameters: outputParameters
			},
			budget: budget
		})
			.then(response => response.data)
			.catch(error => { throw error; });
	}

	listJobs() {
		return this._get('/jobs')
			.then(response => response.data.jobs.map((j) => new Job(this, j.job_id)))
			.catch(error => { throw error; });
	}

	createJob(processGraph, outputFormat, outputParameters = null, title = null, description = null, plan = null, budget = null, additional = null) {
		const jobObject = Object.assign(additional, {
			title: title,
			description: description,
			process_graph: processGraph,
			output: {
				format: outputFormat,
				parameters: outputParameters
			},
			plan: plan,
			budget: budget
		});
		return this._post('/jobs', jobObject)
			.then(response => new Job(this, response.headers['OpenEO-Identifier']))
			.catch(error => { throw error; });
	}

	listServices() {
		return this._get('/services')
			.then(response => response.data.services.map((s) => new Service(this, s.service_id)))
			.catch(error => { throw error; });
	}

	createService(processGraph, type, title = null, description = null, enabled = null, parameters = null, plan = null, budget = null) {
		const serviceObject = {
			title: title,
			description: description,
			process_graph: processGraph,
			type: type,
			enabled: enabled,
			parameters: parameters,
			plan: plan,
			budget: budget
		};
		return this._post('/services', serviceObject)
			.then(response => new Service(this, response.headers['OpenEO-Identifier']))
			.catch(error => { throw error; });
	}

	_get(path, query, responseType) {
		return this._send({
			method: 'get',
			responseType: responseType,
			url: path,
			params: query
		});
	}

	_post(path, body, responseType) {
		return this._send({
			method: 'post',
			responseType: responseType,
			url: path,
			data: body
		});
	}

	_patch(path, body) {
		return this._send({
			method: 'patch',
			url: path,
			data: body
		});
	}

	_put(path, body) {
		return this._send({
			method: 'put',
			url: path,
			data: body
		});
	}

	_delete(path) {
		return this._send({
			method: 'delete',
			url: path
		});
	}

	// authorize = true: Always authorize
	// authorize = false: Never authorize
	// authorize = null: Auto detect auhorization (authorize when url is beginning with baseUrl)
	_download(url, authorize = null) {
		if (authorize === null) {
			authorize = (url.toLowerCase().indexOf(this._baseUrl.toLowerCase()) === 0);
		}
		return this._send({
			method: 'get',
			responseType: 'blob',
			url: url,
			withCredentials: (authorize === true)
		});
	}

	_send(options) {
		options.baseURL = this._baseUrl;
		if (this._isLoggedIn() && (typeof options.withCredentials === 'undefined' || options.withCredentials === true)) {
			options.withCredentials = true;
			if (!options.headers) {
				options.headers = {};
			}
			options.headers['Authorization'] = 'Bearer ' + this._token;
		}
		if (!options.responseType) {
			options.responseType = 'json';
		}

		/*
		// ToDo: Remove this, it's just for the R backend for now, might need to be extended
		if (OpenEO.API.driver === 'openeo-r-backend' && options.url.match(/^\/(processes|data|jobs|services|udf_runtimes|users|execute)$/)) {
			options.url += '/';
		}
		*/

		return axios(options)
			.then(reponse => response)
			.catch(error => {
				if (error.response) {
					throw error.response.status;
				}
				else {
					throw 0;
				}
			});
	}

	_resetAuth() {
		this._userId = null;
		this._token = null;
	}

	_isLoggedIn() {
		return (this._token !== null);
	}
}


class Capabilities {
	constructor(data) {
		if(!data || !data.version || !data.endpoints) {
			throw "Data is not a valid Capabilities response"
		}
		this.data = data;
	}

	version() {
		return this.data.version;
	}

	listFeatures() {
		return this.data.endpoints;
	}

	hasFeature(methodName) {
		const clientMethodNameToAPIRequestMap = {
			capabilities: 'GET /',
			listFileTypes: 'GET /output_formats',
			listServiceTypes: 'GET /service_types',
			listCollections: 'GET /collections',
			describeCollection: 'GET /collections/{name}',
			listProcesses: 'GET /processes',
			authenticateOIDC: 'GET /credentials/oidc',
			authenticateBasic: 'GET /credentials/basic',
			describeAccount: 'GET /me',
			listFiles: 'GET /files/{user_id}',
			validateProcessGraph: 'POST /validate',
			createProcessGraph: 'POST /process_graphs',
			listProcessGraphs: 'GET /process_graphs',
			execute: 'POST /preview',
			listJobs: 'GET /jobs',
			createJob: 'POST /jobs',
			listServices: 'GET /services',
			createService: 'POST /services',
			downloadFile: 'GET /files/{user_id}/{path}',
			uploadFile: 'PUT /files/{user_id}/{path}',
			deleteFile: 'DELETE /files/{user_id}/{path}',
			describeJob: 'GET /jobs/{job_id}',
			updateJob: 'PATCH /jobs/{job_id}',
			deleteJob: 'DELETE /jobs/{job_id}',
			estimateJob: 'GET /jobs/{job_id}/estimate',
			startJob: 'POST /jobs/{job_id}/results',
			stopJob: 'DELETE /jobs/{job_id}/results',
			listResults: 'GET /jobs/{job_id}/results',
			downloadResults: 'GET /jobs/{job_id}/results',
			describeProcessGraph: 'GET /process_graphs/{process_graph_id}',
			updateProcessGraph: 'PATCH /process_graphs/{process_graph_id}',
			deleteProcessGraph: 'DELETE /process_graphs/{process_graph_id}',
			describeService: 'GET /services/{service_id}',
			updateService: 'PATCH /services/{service_id}',
			deleteService: 'DELETE /services/{service_id}'
		};

		if (methodName === 'createFile') {
			return true;   // Of course it's always possible to create "a (virtual) file".
			// But maybe it would be smarter to return the value of hasFeature('uploadFile') instead, because that's what the user most likely wants to do
		} else {
			return this.data.endpoints
				.map((e) => e.methods.map((method) => method + ' ' + e.path))
				// .flat(1)   // does exactly what we want, but (as of Sept. 2018) not yet part of the standard...
				.reduce((a, b) => a.concat(b), [])  // ES6-proof version of flat(1)
				.some((e) => e === clientMethodNameToAPIRequestMap[methodName]);
		}
	}

	currency() {
		return (this.data.billing ? this.data.billing.currency : undefined);
	}

	listPlans() {
		return (this.data.billing ? this.data.billing.plans : undefined);
	}
}


class File {
	constructor(connection, userId, path) {
		this.connection = connection;
		this.userId = userId;
		this.path = path;
	}

	downloadFile(target) {
		this.connection._download(this.userId + this.path, target)
			.then(response => this._saveToFile(response.data, target))
			.catch(error => { throw error; });
	}

	_saveToFile(data, filename) {
		// based on: https://github.com/kennethjiang/js-file-download/blob/master/file-download.js
		var blob = new Blob([data], {type: 'application/octet-stream'});
		var blobURL = window.URL.createObjectURL(blob);
		var tempLink = document.createElement('a');
		tempLink.style.display = 'none';
		tempLink.href = blobURL;
		tempLink.setAttribute('download', filename); 
		
		if (typeof tempLink.download === 'undefined') {
			tempLink.setAttribute('target', '_blank');
		}
		
		document.body.appendChild(tempLink);
		tempLink.click();
		document.body.removeChild(tempLink);
		window.URL.revokeObjectURL(blobURL);
	}

	uploadFile(source) {
		this.connection._put(this.userId + this.path, source);
	}

	deleteFile() {
		this.connection._delete(this.userId + this.path);
	}
}


class Job {
	constructor(connection, jobId) {
		this.connection = connection;
		this.jobId = jobId;
	}

	describeJob() {
		return this.connection._get('/jobs/' + this.jobId)
		.then(response => response.data)
		.catch(error => { throw error; });
	}

	updateJob(processGraph = null, outputFormat = null, outputParameters = null, title = null, description = null, plan = null, budget = null, additional = null) {
		const jobObject = Object.assign(additional, {
			title: title,
			description: description,
			process_graph: processGraph,
			output: {
				format: outputFormat,
				parameters: outputParameters
			},
			plan: plan,
			budget: budget
		});

		return this.connection._patch('/jobs/' + this.jobId, jobObject)
		.then(response => response.status == 204)
		.catch(error => { throw error; });
	}

	deleteJob() {
		return this.connection._delete('/jobs/' + this.jobId)
		.then(response => response.status == 204)
		.catch(error => { throw error; });
	}

	estimateJob() {
		return this.connection._get('/jobs/' + this.jobId + '/estimate')
		.then(response => response.data)
		.catch(error => { throw error; });
	}

	startJob() {
		return this.connection._post('/jobs/' + this.jobId + '/results', {})
		.then(response => response.status == 202)
		.catch(error => { throw error; });
	}

	stopJob() {
		return this.connection._delete('/jobs/' + this.jobId + '/results')
		.then(response => response.status == 204)
		.catch(error => { throw error; });
	}

	listResults(type = 'json') {
		if(type == 'metalink') {
			throw "Metalink is not supported in the JS client, please use JSON.";
		}
		return this.connection._get('/jobs/' + this.jobId + '/results')
		.then(response => Object.assign({costs: response.headers['OpenEO-Costs']}, response.data))
		.catch(error => { throw error; });
	}

	downloadResults(target) {
		throw "downloadResults is not supported in the JS client.";
	}
}


class ProcessGraph {
	constructor(connection, processGraphId) {
		this.connection = connection;
		this.processGraphId = processGraphId;
	}

	describeProcessGraph() {
		return this.connection._get('/process_graphs/' + this.processGraphId)
		.then(response => response.data)
		.catch(error => { throw error; });
	}

	updateProcessGraph(processGraph = null, title = null, description = null) {
		return this.connection._patch('/process_graphs/' + this.processGraphId, {
			title: title,
			description: description,
			process_graph: processGraph
		})
		.then(response => response.status == 204)
		.catch(error => { throw error; });
	}

	deleteProcessGraph() {
		return this.connection._delete('/process_graphs/' + this.processGraphId)
		.then(response => response.status == 204)
		.catch(error => { throw error; });
	}
}


class Service {
	constructor(connection, serviceId) {
		this.connection = connection;
		this.serviceId = serviceId;
	}

	describeService() {
		return this.connection._get('/services/' + this.serviceId)
		.then(response => response.data)
		.catch(error => { throw error; });
	}

	updateService(processGraph = null, title = null, description = null, enabled = null, parameters = null, plan = null, budget = null) {
		const serviceObject = {
			title: title,
			description: description,
			process_graph: processGraph,
			enabled: enabled,
			parameters: parameters,
			plan: plan,
			budget: budget
		};
		return this.connection._patch('/services/' + this.serviceId, serviceObject)
		.then(response => response.status == 204)
		.catch(error => { throw error; });
	}

	deleteService() {
		return this.connection._delete('/services/' + this.serviceId)
		.then(response => response.status == 204)
		.catch(error => { throw error; });
	}
}



// ########################################################################################################
// ########################################################################################################
// ########################################################################################################
// ########################################################################################################
// ########################################################################################################



/*

//// PROCESS GRAPH CREATION ////
class ProcessGraphNode {
	constructor() { }

	filter_daterange(startT, endT, imagery = null) {
		return new ProcessNode('filter_daterange', {
			imagery: (imagery ? imagery : this),
			from: startT,
			to: endT
		});
	}

	filter_bbox(left, top, right, bottom, crs = 'EPSG:4326', imagery = null) {
		imagery = imagery ? imagery : this;
		return new ProcessNode('filter_bbox', {
			imagery: (imagery ? imagery : this),
			srs: crs,
			left: left,
			right: right,
			top: top,
			bottom: bottom
		});
	}

	filter_bands(bands, imagery = null) {
		return new ProcessNode('filter_bands', {
			imagery: (imagery ? imagery : this),
			bands: bands
		});
		// ToDo: add band names and wavelength filters
	}

	NDVI(red, nir, imagery = null) {
		return new ProcessNode('NDVI', {
			imagery: (imagery ? imagery : this),
			red: red,
			nir: nir
		});
	}

	min_time(imagery = null) {
		return new ProcessNode('min_time', {
			imagery: (imagery ? imagery : this)
		});
	}

	max_time(imagery = null) {
		return new ProcessNode('max_time', {
			imagery: (imagery ? imagery : this)
		});
	}
	
	udf(language, process_id, script, imagery = null) {
		return new UdfProcessNode(language, process_id, script, imagery);
	}
	
	zonal_statistics(regionsPath, func, imagery = null) {
		return new ProcessNode('zonal_statistics', {
			imagery: (imagery ? imagery : this),
			regions: regionsPath,
			func: func
		});
	}
	
	processImg(process_id, args = {}) {
		// ToDo: Improve? Doesn't seem very tidy (changing an object from outer scope).
		// Should be solved with the new API version though
		args['imagery'] = this;
		return new ProcessNode(process_id, args);
	}
	
	process(process_id, args, processParameterName, imagery = null) {
		// ToDo: Improve? Doesn't seem very tidy (changing an object from outer scope).
		// Should be solved with the new API version though
		if (processParameterName) {
			args[processParameterName] = (imagery ? imagery : this);
		}
		return new ProcessNode(process_id, args);
	}
	
	execute(output_format, output_args = {}) {
		return OpenEO.Jobs.executeSync(this, output_format, output_args);
	}
	
}

class ProcessNode extends ProcessGraphNode {
	constructor(process_id, args) {
		super();
		this.process_id = process_id;
		this.args = args;
	}
}

class UdfProcessNode extends ProcessNode {
	constructor(language, process_id, script, imagery = null) {
		super('udf/' + language + '/' + process_id, {
			imagery: (imagery ? imagery : this),
			script: script
		});
	}
	
}

class ImageCollectionNode extends ProcessGraphNode {
	constructor(srcId) {
		super();
		this.product_id = srcId;
	}
}

//// API SUB-COMPONENTS ////
class UserAPI {
	
	constructor(user_id) {
		this.user_id = user_id;
	}
	
	getProcessGraphs() {
		return OpenEO.HTTP.get('/users/' + encodeURIComponent(this.user_id) + '/process_graphs');
	}
	
	createProcessGraph(process_graph) {
		return OpenEO.HTTP.post('/users/' + encodeURIComponent(this.user_id) + '/process_graphs', process_graph);
	}
	
	getProcessGraphObject(process_graph_id) {
		return new UserProcessGraphAPI(this.user_id, process_graph_id);
	}
	
	getFiles() {
		return OpenEO.HTTP.get('/users/' + encodeURIComponent(this.user_id) + '/files');
	}
	
	getFileObject(path) {
		return new UserFileAPI(this.user_id, path);
	}
	
	getJobs() {
		return OpenEO.HTTP.get('/users/' + encodeURIComponent(this.user_id) + '/jobs');
	}
	
	getServices() {
		return OpenEO.HTTP.get('/users/' + encodeURIComponent(this.user_id) + '/services');
	}
	
	getCredits() {
		return OpenEO.HTTP.get('/users/' + encodeURIComponent(this.user_id) + '/credits');
	}
	
}

class UserProcessGraphAPI {
	
	constructor(user_id, process_graph_id) {
		this.user_id = user_id;
		this.process_graph_id = process_graph_id;
	}
	
	get() {
		return OpenEO.HTTP.get('/users/' + encodeURIComponent(this.user_id) + '/process_graphs/' + encodeURIComponent(this.process_graph_id));
	}
	
	replace(process_graph) {
		return OpenEO.HTTP.put('/users/' + encodeURIComponent(this.user_id) + '/process_graphs/' + encodeURIComponent(this.process_graph_id), process_graph);
	}
	
	delete() {
		return OpenEO.HTTP.delete('/users/' + encodeURIComponent(this.user_id) + '/process_graphs/' + encodeURIComponent(this.process_graph_id));
	}
	
}

class UserFileAPI {
	
	constructor(user_id, path) {
		this.user_id = user_id;
		this.path = path;
	}
	
	get() {
		return OpenEO.HTTP.get('/users/' + encodeURIComponent(this.user_id) + '/files/' + this._encodePath(this.path), null, 'blob');
	}
	
	replace(fileData, statusCallback = null) {
		var options = {
			method: 'put',
			url: '/users/' + encodeURIComponent(this.user_id) + '/files/' + this._encodePath(this.path),
			data: fileData,
			headers: {
				'Content-Type': 'application/octet-stream'
			}
		};
		if (typeof statusCallback === 'function') {
			options.onUploadProgress = function(progressEvent) {
				var percentCompleted = Math.round( (progressEvent.loaded * 100) / progressEvent.total );
				statusCallback(percentCompleted);
			};
		}
		return OpenEO.HTTP.send(options);
	}
	
	delete() {
		return OpenEO.HTTP.delete('/users/' + encodeURIComponent(this.user_id) + '/files/' + this._encodePath(this.path));
	}

	_encodePath(path) {
		// ToDo: Remove later
		if (OpenEO.API.driver === 'openeo-r-backend') {
			path = path.replace(/\./g, '_');
		}
		return encodeURIComponent(path);
	}
	
}

class JobAPI {
	
	constructor(job_id) {
		this.job_id = job_id;
	}
	
	modify(processGraph, output) {
		throw new Error('Not implemented');
	}
	
	get() {
		return OpenEO.HTTP.get('/jobs/' + encodeURIComponent(this.job_id));
	}
	
	queue() {
		return OpenEO.HTTP.patch('/jobs/' + encodeURIComponent(this.job_id) + '/queue');
	}
	
	pause() {
		return OpenEO.HTTP.patch('/jobs/' + encodeURIComponent(this.job_id) + '/pause');
	}
	
	cancel() {
		return OpenEO.HTTP.patch('/jobs/' + encodeURIComponent(this.job_id) + '/cancel');
	}
	
	download(output_format = null) {
		var query = {};
		if (typeof output_format === 'string' && output_format.length > 0) {
			query.format = output_format;
		}
		return OpenEO.HTTP.get('/jobs/' + encodeURIComponent(this.job_id) + '/download', query, 'blob');
	}
	
}

class ServiceAPI {
	
	constructor(service_id) {
		this.service_id = service_id;
	}
	
	modify(service_args) {
		return OpenEO.HTTP.patch('/services/' + encodeURIComponent(this.service_id), {
			service_args: service_args
		});
	}
	
	get() {
		return OpenEO.HTTP.get('/services/' + encodeURIComponent(this.service_id));
	}
	
	delete() {
		return OpenEO.HTTP.delete('/services/' + encodeURIComponent(this.service_id));
	}
	
}

class Capabilities {
	
	constructor(response) {
		if (Array.isArray(response) && response.length > 0) {
			this.rawData = response.map(elem => elem.toLowerCase());
		}
		else {
			this.rawData = [];
		}
	}
	
	outputFormatCapabilities() {
		return this.capable('/capabilities/output_formats');
	}
	
	serviceCapabilities() {
		return this.capable('/capabilities/services');
	}

	subscription() {
		return this.capable('/subscription');
	}
	
	data() {
		return this.capable('/data');
	}
	
	dataByOpenSearch() {
		return this.capable('/data/opensearch');
	}
	
	dataInfo() {
		return this.capable('/data/{product_id}');
	}
	
	processes() {
		return this.capable('/processes');
	}
	
	processesByOpenSearch() {
		return this.capable('/processes/opensearch');
	}
	
	processInfo() {
		return this.capable('/processes/{process_id}');
	}
	
	udfRuntimes() {
		return this.capable('/udf_runtimes');
	}
	
	udfRuntimeDescriptions() {
		return this.capable('/udf_runtimes/{lang}/{udf_type}');
	}
	
	userProcessGraphs() {
		return this.capable('/users/{user_id}/process_graphs');
	}
	
	createUserProcessGraph() {
		return this.capable('/users/{user_id}/process_graphs', 'post');
	}
	
	userProcessGraphInfo() {
		return this.capable('/users/{user_id}/process_graphs/{process_graph_id}');
	}
	
	updateUserProcessGraph() {
		return this.capable('/users/{user_id}/process_graphs/{process_graph_id}', 'put');
	}
	
	deleteUserProcessGraph() {
		return this.capable('/users/{user_id}/process_graphs/{process_graph_id}', 'delete');
	}
	
	userFiles() {
		return this.capable('/users/{user_id}/files');
	}
	
	downloadUserFile() {
		return this.capable('/users/{user_id}/files/{path}');
	}
	
	uploadUserFile() {
		return this.capable('/users/{user_id}/files/{path}', 'put');
	}
	
	deleteUserFile() {
		return this.capable('/users/{user_id}/files/{path}', 'delete');
	}
	
	userJobs() {
		return this.capable('/users/{user_id}/jobs');
	}
	
	userServices() {
		return this.capable('/users/{user_id}/services');
	}
	
	userCredits() {
		return this.capable('/users/{user_id}/credits');
	}
	
	userLogin() {
		return this.capable('/auth/login');
	}
	
	userRegister() {
		return this.capable('/auth/register', 'post');
	}
	
	executeJob() {
		return this.capable('/execute');
	}
	
	createJob() {
		return this.capable('/jobs', 'post');
	}
	
	jobInfo() {
		return this.capable('/jobs/{job_id}');
	}
	
	updateJob() {
		return this.capable('/jobs/{job_id}', 'patch');
	}
	
	queueJob() {
		return this.capable('/jobs/{job_id}/queue', 'patch');
	}
	
	pauseJob() {
		return this.capable('/jobs/{job_id}/pause', 'patch');
	}
	
	cancelJob() {
		return this.capable('/jobs/{job_id}/cancel', 'patch');
	}
	
	downloadJob() {
		return this.capable('/jobs/{job_id}/download');
	}
	
	createService() {
		return this.capable('/services', 'post');
	}

	serviceInfo() {
		return this.capable('/services/{service_id}');
	}

	updateService() {
		return this.capable('/services/{service_id}', 'patch');
	}

	deleteService() {
		return this.capable('/services/{service_id}', 'delete');
	}

	capable(path, method = 'get') {
		var path = path.replace('/', '\\/').replace(/\{\w+\}/ig, '\\{[^\\/\\{\\}]+\\}');
		var regexp = new RegExp('^' + path + '\\/?$', 'i');
		for(var i in this.rawData) {
			if (this.rawData[i].match(regexp) !== null) {
				return true;
			}
		}
		return false;
	}
	
}

//// API ////
var OpenEO = {

	API: {

		// The URL of the server to query for information.
		baseUrl: 'http://localhost/api/v0',
		// The driver expected to respond on the server, e.g. 'openeo-sentinelhub-driver'.
		// Currently this is only to work around specific behaviour of backends
		// during development phase.
		driver: null,
		// Subscriptions
		subscriptionSocket: null,
		subscriptionListeners: new Map(),
	
		getCapabilities() {
			return OpenEO.HTTP.get('/capabilities').then(data => new Capabilities(data));
		},
		
		getOutputFormats() {
			return OpenEO.HTTP.get('/capabilities/output_formats');
		},

		subscribe(topic, parameters, callback) {
			console.warn('Subscriptions are not fully implemented yet.');

			if(!parameters) {
				parameters = {};
			}

			if (callback) {
				if(!this.subscriptionListeners.has(topic)) {
					this.subscriptionListeners.set(topic, new Map());
				}
				this.subscriptionListeners.get(topic).set(JSON.stringify(parameters), callback);
			}

			this._sendSubscription('subscribe', topic, parameters);
		},

		unsubscribe(topic, parameters) {
			// get all listeners for the topic
			const topicListeners = this.subscriptionListeners.get(topic);
			
			if(!parameters) {
				parameters = {};
			}

			// remove the applicable sub-callback
			if(topicListeners instanceof Map) {
				topicListeners.delete(JSON.stringify(parameters));
			} else {
				throw Error("this.subscriptionListeners must be a Map of Maps");
			}

			// Remove entire topic from subscriptionListeners if no topic-specific listener is left
			if(topicListeners.size === 0) {
				this.subscriptionListeners.delete(topic);
			}

			// now send the command to the server (NOT earlier, because the command manipulates `parameters`)
			this._sendSubscription('unsubscribe', topic, parameters);

			// Close subscription socket if there is no subscription left (use .size, NOT .length!)
			if (this.subscriptionSocket !== null && this.subscriptionListeners.size === 0) {
				console.log('Closing connection because there is no subscription left');
				this.subscriptionSocket.close();
			}
		},

		_createWebSocket() {
			if (this.subscriptionSocket === null || this.subscriptionSocket.readyState === this.subscriptionSocket.CLOSING || this.subscriptionSocket.readyState === this.subscriptionSocket.CLOSED) {
				var url = OpenEO.API.baseUrl + '/subscription?authorization=' + OpenEO.Auth.token;
				this.subscriptionSocket = new WebSocket(url.replace('http', 'ws'), "openeo-v0.3");
				this.subscriptionSocket.addEventListener('error', () => {
					this.subscriptionSocket = null;
				});
				this.subscriptionSocket.addEventListener('close', () => {
					this.subscriptionSocket = null;
				});
				this.subscriptionSocket.addEventListener('message', event => {
					// ToDo: Add error handling
					var json = JSON.parse(event.data);
					if (json.message.topic == 'openeo.welcome') {
						console.log("Supported topics: " + json.payload.topics);
					}
					else {
						// get listeners for topic
						var topicListeners = this.subscriptionListeners.get(json.message.topic);
						// we should now have a Map in which to look for the correct listener
						if (topicListeners && topicListeners instanceof Map) {
							callback = topicListeners.get('{}')   // default: without parameters
									|| topicListeners.get('{"job_id":"' + json.payload.job_id + '"}');
									// more parameter checks possible
						}
						// if we now have a function, we can call it with the information
						if (typeof callback === 'function') {
							callback(json.payload, json.message);
						} else {
							throw Error("No listener found to handle incoming message");
						}
					}
				});
				
			}
			return this.subscriptionSocket;
		},

		_sendSubscription(action, topic, parameters) {
			this._createWebSocket();

			if (!parameters || typeof parameters != 'object') {  // caution: typeof null == 'object', but null==false
				parameters = {};
			}

			var callback = () => {
				parameters.topic = topic;
				this.subscriptionSocket.send(JSON.stringify({
					message: {
						topic: 'openeo.' + action,
						issued: (new Date()).toISOString()
					},
					payload: {
						topics: [parameters]
					}
				}));
			};

			if(this.subscriptionSocket.readyState === this.subscriptionSocket.CONNECTING){
				this.subscriptionSocket.addEventListener('open', event => {
					callback();
				});
			}
			else if(this.subscriptionSocket.readyState === this.subscriptionSocket.OPEN){
				callback();
			}
		}

	},

	ImageCollection: {

		create(collId) {
			return new ImageCollectionNode(collId);
		}

	},

	Data: {

		DefaultQueryOptions: {
			qname: null,
			qgeom: null,
			qstartdate: null,
			qenddate: null
		},

		get(options) {
			var opts = options || this.DefaultQueryOptions;
			return OpenEO.HTTP.get('/data', opts);
		},

		getById(id) {
			return OpenEO.HTTP.get('/data/' + encodeURIComponent(id));
		}

	},

	Processes: {

		get(name) {
			var query = {};
			if (name) {
				query.qname = name;
			}
			return OpenEO.HTTP.get('/processes', query);
		},

		getById(id) {
			return OpenEO.HTTP.get('/processes/' + encodeURIComponent(id));
		}

	},
	
	UDFRuntimes: {
		
		get() {
			return OpenEO.HTTP.get('/udf_runtimes');
		},
		
		getProcess(lang, udf_type) {
			return OpenEO.HTTP.get('/udf_runtimes/' + encodeURIComponent(lang) + '/' + encodeURIComponent(udf_type));
		}
		
	},

	Jobs: {

		create(processGraph, output_format = null, output_args = {}) {
			var body = {
				process_graph: processGraph
			};
			if (typeof output_format === 'string' && output_format.length > 0) {
				body.output = {
					format: output_format,
					args: output_args
				};
			}
			return OpenEO.HTTP.post('/jobs', body);
		},
		
		getObject(job_id) {
			return new JobAPI(job_id);
		},
	
		executeSync (process_graph, output_format, output_args = {}) {
			return OpenEO.HTTP.send({
				method: 'post',
				responseType: 'blob',
				url: '/execute',
				data: {
					process_graph: process_graph,
					output: {
						format: output_format,
						args: output_args
					}
				}
			});
		}

	},
	
	Services: {
		
		create(job_id, service_type, service_args = {}) {
			return OpenEO.HTTP.post('/services', {
				job_id: job_id,
				service_type: service_type,
				service_args: service_args
			});
		},
		
		getCapabilities() {
			return OpenEO.HTTP.get('/capabilities/services').then((data) => {
				if (Array.isArray(data)) {
					return data.map(elem => elem.toLowerCase());
				}
				else {
					return [];
				}
			});
		},
		
		getObject(service_id) {
			return new ServiceAPI(service_id);
		}
		
	},
	
	Users: {
		
		getObject(user_id) {
			return new UserAPI(user_id);
		}
		
	}

};

// ToDo: Export classes etc
let toExport = {
	OpenEO: OpenEO,
	Capabilities: Capabilities
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = toExport;
}
else {
	if (typeof define === 'function' && define.amd) {
		define([], function () {
			return toExport;
		});
	}
	else {
		for (let exportObjName in toExport) {
			window[exportObjName] = toExport[exportObjName];
		}
	}
}

*/