if (typeof axios === 'undefined') {
	var axios = require("axios");
}

var isNode = false;
try {
	isNode = (typeof window === 'undefined' && Object.prototype.toString.call(global.process) === '[object process]');
} catch(e) {}

class OpenEO {

	static connect(url, authType = null, authOptions = null) {
		let wellKnownUrl = url.replace(/\/$/i, "") + '/.well-known/openeo';
		return axios.get(wellKnownUrl)
			.then(response => {
				if (response.data === null || typeof response.data !== 'object' || !Array.isArray(response.data.versions)) {
					throw new Error("Well-Known Document doesn't list any version.");
				}
				let compatibility = Util.mostCompatible(response.data.versions);
				if (compatibility.length > 0) {
					return compatibility[0].url;
				}
				throw new Error("Server doesn't support API version 0.4.x.");
			})
			.catch(() => url)
			.then(versionedUrl => OpenEO.connectDirect(versionedUrl, authType, authOptions));
	}

	static connectDirect(versionedUrl, authType = null, authOptions = null) {
		var connection = new Connection(versionedUrl);
		return connection.capabilities()
			.then(capabilities => {
				// Check whether back-end is accessible and supports a correct version.
				if (capabilities.apiVersion().startsWith("0.4.")) {
					if(authType !== null) {
						switch(authType) {
							case 'basic':
								return connection.authenticateBasic(authOptions.username, authOptions.password);
							case 'oidc':
								return connection.authenticateOIDC(authOptions);
							default:
								throw new Error("Unknown authentication type.");
						}
					}
					return Promise.resolve();
				}
				else {
					throw new Error("Server instance doesn't support API version 0.4.x.");
				}
			})
			.then(_ => connection);
	}

	static clientVersion() {
		return "0.4.0";
	}

}


class Connection {
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
		this.userId = null;
		this.accessToken = null;
		this.capabilitiesObject = null;
		this.subscriptionsObject = new Subscriptions(this);
	}

	getBaseUrl() {
		return this.baseUrl;
	}

	getUserId() {
		return this.userId;
	}

	capabilities() {
		if (this.capabilitiesObject === null) {
			return this._get('/').then(response => {
				this.capabilitiesObject = new Capabilities(response.data);
				return this.capabilitiesObject;
			});
		}
		else {
			return Promise.resolve(this.capabilitiesObject);
		}
	}

	listFileTypes() {
		return this._get('/output_formats')
			.then(response => response.data);
	}

	listServiceTypes() {
		return this._get('/service_types')
			.then(response => response.data);
	}

	listCollections() {
		return this._get('/collections')
			.then(response => response.data);
	}

	describeCollection(name) {
		return this._get('/collections/' + name)
			.then(response => response.data);
	}

	listProcesses() {
		return this._get('/processes')
			.then(response => response.data);
	}

	buildProcessGraph() {
		return this.listProcesses()
			.then(data => {
				let builder = {};
				for(let i in data.processes) {
					let process = data.processes[i];
					builder[process.name] = (options) => {
						options.process_id = process.name;
						return options;
					}
				}
				return builder;
			});
	}

	authenticateOIDC(options = null) {
		return Promise.reject(new Error("Not implemented yet."));
	}

	authenticateBasic(username, password) {
		return this._send({
			method: 'get',
			responseType: 'json',
			url: '/credentials/basic',
			headers: {'Authorization': 'Basic ' + Util.base64encode(username + ':' + password)}
		}).then(response => {
			if (!response.data.user_id) {
				throw new Error("No user_id returned.");
			}
			if (!response.data.access_token) {
				throw new Error("No access_token returned.");
			}
			this.userId = response.data.user_id;
			this.accessToken = response.data.access_token;
			return response.data;
		}).catch(error => {
			this._resetAuth();
			throw error;
		});
	}

	describeAccount() {
		return this._get('/me')
			.then(response => response.data);
	}

	listFiles(userId = null) {  // userId defaults to authenticated user
		if(userId === null) {
			if(this.userId === null) {
				return Promise.reject(new Error("Parameter 'userId' not specified and no default value available because user is not logged in."));
			} else {
				userId = this.userId;
			}
		}
		return this._get('/files/' + userId)
			.then(response => response.data.files.map((f) => new File(this, userId, f.name).setAll(f)));
	}

	createFile(name, userId = null) {  // userId defaults to authenticated user
		if(userId === null) {
			if(this.userId === null) {
				return Promise.reject(new Error("Parameter 'userId' not specified and no default value available because user is not logged in."));
			} else {
				userId = this.userId;
			}
		}
		return Promise.resolve(new File(this, userId, name));
	}

	validateProcessGraph(processGraph) {
		return this._post('/validation', {process_graph: processGraph})
			.then(response => {
				if (Array.isArray(response.data.errors)) {
					return response.data.errors;
				}
				else {
					throw new Error("Invalid validation response received.");
				}
			});
	}

	listProcessGraphs() {
		return this._get('/process_graphs')
			.then(response => response.data.process_graphs.map((pg) => new ProcessGraph(this, pg.id).setAll(pg)));
	}

	createProcessGraph(processGraph, title = null, description = null) {
		let pgObject = {title: title, description: description, process_graph: processGraph};
		return this._post('/process_graphs', pgObject)
			.then(response => new ProcessGraph(this, response.headers['openeo-identifier']).setAll(pgObject))
			.then(pg => {
				if (this.capabilitiesObject.hasFeature('describeProcessGraph')) {
					return pg.describeProcessGraph();
				}
				else {
					return Promise.resolve(pg);
				}
			});
	}

	computeResult(processGraph, outputFormat = null, outputParameters = {}, budget = null) {
		let requestBody = {
			process_graph: processGraph,
			budget: budget
		};
		if (outputFormat !== null) {
			requestBody.output = {
				format: outputFormat,
				parameters: outputParameters
			};
		}

		return this._post('/result', requestBody, 'stream').then(response => response.data);
	}

	listJobs() {
		return this._get('/jobs')
			.then(response => response.data.jobs.map(j => new Job(this, j.id).setAll(j)));
	}

	createJob(processGraph, outputFormat = null, outputParameters = {}, title = null, description = null, plan = null, budget = null, additional = {}) {
		let jobObject = Object.assign({}, additional, {
			title: title,
			description: description,
			process_graph: processGraph,
			plan: plan,
			budget: budget
		});
		if (outputFormat !== null) {
			jobObject.output = {
				format: outputFormat,
				parameters: outputParameters
			};
		}
		return this._post('/jobs', jobObject)
			.then(response => new Job(this, response.headers['openeo-identifier']).setAll(jobObject))
			.then(job => {
				if (this.capabilitiesObject.hasFeature('describeJob')) {
					return job.describeJob();
				}
				else {
					return Promise.resolve(job);
				}
			});
	}

	listServices() {
		return this._get('/services')
			.then(response => response.data.services.map((s) => new Service(this, s.id).setAll(s)));
	}

	createService(processGraph, type, title = null, description = null, enabled = true, parameters = {}, plan = null, budget = null) {
		let serviceObject = {
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
			.then(response => new Service(this, response.headers['openeo-identifier']).setAll(serviceObject))
			.then(service => {
				if (this.capabilitiesObject.hasFeature('describeService')) {
					return service.describeService();
				}
				else {
					return Promise.resolve(service);
				}
			});
	}

	_get(path, query, responseType) {
		return this._send({
			method: 'get',
			responseType: responseType,
			url: path,
			// Timeout for capabilities requests as they are used for a quick first discovery to check whether the server is a openEO back-end.
			// Without timeout connecting with a wrong server url may take forever.
			timeout: path === '/' ? 3000 : 0,
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

	_delete(path) {
		return this._send({
			method: 'delete',
			url: path
		});
	}

	// authorize = true: Always authorize
	// authorize = false: Never authorize
	// Returns promise with data as stream in node environment, blob in browser.
	download(url, authorize) {
		return this._send({
			method: 'get',
			responseType: 'stream',
			url: url,
			withCredentials: authorize
		});
	}

	_send(options) {
		options.baseURL = this.baseUrl;
		if (this.isLoggedIn() && (typeof options.withCredentials === 'undefined' || options.withCredentials === true)) {
			options.withCredentials = true;
			if (!options.headers) {
				options.headers = {};
			}
			options.headers['Authorization'] = 'Bearer ' + this.accessToken;
		}
		if (options.responseType == 'stream' && !isNode) {
			options.responseType = 'blob';
		}
		if (!options.responseType) {
			options.responseType = 'json';
		}

		return axios(options).catch(error => {
			return new Promise((resolve, reject) => {
				if (error.response !== null && typeof error.response === 'object' && error.response.data !== null && typeof error.response.data === 'object' && typeof error.response.data.type === 'string' && error.response.data.type.indexOf('/json') !== -1) {
					// JSON error responses are Blobs and streams if responseType is set as such, so convert to JSON if required.
					// See: https://github.com/axios/axios/issues/815
					try {
						switch(options.responseType) {
							case 'blob':
								var fileReader = new FileReader();
								fileReader.onerror = () => {
									fileReader.abort();
									reject(error);
								};
								fileReader.onload = () => {
									reject(JSON.parse(fileReader.result));
								};
								fileReader.readAsText(error.response.data);
								break;
							case 'stream':
								var chunks = "";
								error.response.data.on("data", chunk => {
									chunks.push(chunk);
								});
								readStream.on("error", () =>  {
									reject(error);
								});
								readStream.on("end", () => {
									reject(JSON.parse(Buffer.concat(chunks).toString()));
								});
								break;
							default:
								reject(error);
						}
					} catch (exception) {
						reject(error);
					}
				}
				else {
					reject(error);
				}
			});
		});
	}

	_resetAuth() {
		this.userId = null;
		this.accessToken = null;
	}

	isLoggedIn() {
		return (this.accessToken !== null);
	}

	subscribe(topic, parameters, callback) {
		return this.subscriptionsObject.subscribe(topic, parameters, callback);
	}

	unsubscribe(topic, parameters, callback) {
		return this.subscriptionsObject.unsubscribe(topic, parameters, callback);
	}
}


class Subscriptions {

	constructor(httpConnection) {
		this.httpConnection = httpConnection;
		this.socket = null;
		this.listeners = new Map();
		this.supportedTopics = [];
		this.messageQueue = [];
		this.websocketProtocol = "openeo-v0.4";
	}

	subscribe(topic, parameters, callback) {
		if(!parameters) {
			parameters = {};
		}

		if (callback) {
			if(!this.listeners.has(topic)) {
				this.listeners.set(topic, new Map());
			}
			this.listeners.get(topic).set(Util.hash(parameters), callback);
		}

		this._sendSubscription('subscribe', topic, parameters);
	}

	unsubscribe(topic, parameters) {
		// get all listeners for the topic
		let topicListeners = this.listeners.get(topic);
		
		if(!parameters) {
			parameters = {};
		}

		// remove the applicable sub-callback
		if(topicListeners instanceof Map) {
			topicListeners.delete(Util.hash(parameters));
		} else {
			return Promise.reject(new Error("this.listeners must be a Map of Maps"));
		}

		// Remove entire topic from subscriptionListeners if no topic-specific listener is left
		if(topicListeners.size === 0) {
			this.listeners.delete(topic);
		}

		// now send the command to the server
		this._sendSubscription('unsubscribe', topic, parameters);

		// Close subscription socket if there is no subscription left (use .size, NOT .length!)
		if (this.socket !== null && this.listeners.size === 0) {
			console.log('Closing connection because there is no subscription left');
			this.socket.close();
		}
	}

	_createWebSocket() {
		if (this.socket === null || this.socket.readyState === this.socket.CLOSING || this.socket.readyState === this.socket.CLOSED) {
			this.messageQueue = [];
			let url = this.httpConnection.getBaseUrl().replace('http', 'ws') + '/subscription';

			if (isNode) {
				var WebSocket = require('ws');
				this.socket = new WebSocket(url, this.websocketProtocol);
			}
			else {
				this.socket = new WebSocket(url, this.websocketProtocol);
			}

			this._sendAuthorize();

			this.socket.addEventListener('open', () => this._flushQueue());

			this.socket.addEventListener('message', event => this._receiveMessage(event));

			this.socket.addEventListener('error', () => {
				this.socket = null;
			});

			this.socket.addEventListener('close', () => {
				this.socket = null;
			});
		}
		return this.socket;
	}

	_receiveMessage(event) {
		// ToDo: Add error handling
		let json = JSON.parse(event.data);
		if (json.message.topic == 'openeo.welcome') {
			this.supportedTopics = json.payload.topics;
		}
		else {
			// get listeners for topic
			let topicListeners = this.listeners.get(json.message.topic);
			let callback;
			// we should now have a Map in which to look for the correct listener
			if (topicListeners && topicListeners instanceof Map) {
				callback = topicListeners.get(Util.hash({}))   // default: without parameters
						|| topicListeners.get(Util.hash({job_id: json.payload.job_id}));
						// more parameter checks possible
			}
			// if we now have a function, we can call it with the information
			if (typeof callback === 'function') {
				callback(json.payload, json.message);
			} else {
				console.log("No listener found to handle incoming message of type: " + json.message.topic);
			}
		}
	}

	_flushQueue() {
		if(this.socket.readyState === this.socket.OPEN) {
			for(let i in this.messageQueue) {
				this.socket.send(JSON.stringify(this.messageQueue[i]));
			}

			this.messageQueue = [];
		}
	}

	_sendMessage(topic, payload = null, priority = false) {
		let obj = {
			authorization: "Bearer " + this.httpConnection.accessToken,
			message: {
				topic: "openeo." + topic,
				issued: (new Date()).toISOString()
			}

		};
		if (payload !== null) {
			obj.payload = payload;
		}
		if (priority) {
			this.messageQueue.splice(0, 0, obj);
		}
		else {
			this.messageQueue.push(obj);
		}
		this._flushQueue();
	}

	_sendAuthorize() {
		this._sendMessage('authorize', null, true);
	}

	_sendSubscription(action, topic, parameters) {
		this._createWebSocket();

		if (!parameters || typeof parameters != 'object') {  // caution: typeof null == 'object', but null==false
			parameters = {};
		}

		let payloadParameters = Object.assign({}, parameters, { topic: topic });

		this._sendMessage(action, {
			topics: [payloadParameters]
		});
	}

}


class Capabilities {
	constructor(data) {
		if(!data || typeof data !== 'object') {
			throw new Error("No capabilities retrieved.");
		}
		if(!data.api_version) {
			throw new Error("Invalid capabilities: No API version retrieved");
		}
		if(!Array.isArray(data.endpoints)) {
			throw new Error("Invalid capabilities: No endpoints retrieved");
		}

		this.data = data;
	}

	toPlainObject() {
		return this.data;
	}

	apiVersion() {
		return this.data.api_version;
	}

	backendVersion() {
		return this.data.backend_version;
	}

	title() {
		return this.data.title;
	}

	description() {
		return this.data.description;
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
			validateProcessGraph: 'POST /validation',
			createProcessGraph: 'POST /process_graphs',
			listProcessGraphs: 'GET /process_graphs',
			computeResult: 'POST /result',
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
			deleteService: 'DELETE /services/{service_id}',
			subscribe: 'GET /subscription',
			unsubscribe: 'GET /subscription'
		};
		
		// regex-ify to allow custom parameter names
		for(let key in clientMethodNameToAPIRequestMap) {
			clientMethodNameToAPIRequestMap[key] = clientMethodNameToAPIRequestMap[key].replace(/{[^}]+}/, '{[^}]+}');
		}

		if (methodName === 'createFile') {
			return this.hasFeature('uploadFile'); // createFile is always available, map it to uploadFile as it is more meaningful.
		} else {
			return this.data.endpoints
				.map((e) => e.methods.map((method) => method + ' ' + e.path))
				// .flat(1)   // does exactly what we want, but (as of Sept. 2018) not yet part of the standard...
				.reduce((a, b) => a.concat(b), [])  // ES6-proof version of flat(1)
				.some((e) => e.match(new RegExp('^'+clientMethodNameToAPIRequestMap[methodName]+'$')) != null);
		}
	}

	currency() {
		return (this.data.billing ? this.data.billing.currency : null);
	}

	listPlans() {
		return (this.data.billing ? this.data.billing.plans : null);
	}
}


class BaseEntity {

	constructor(connection, properties = []) {
		this.connection = connection;
		this.clientNames = {};
		this.extra = {};
		for(let i in properties) {
			let backend, client;
			if (Array.isArray(properties[i])) {
				backend = properties[i][0];
				client = properties[i][1];
			}
			else {
				backend = properties[i];
				client = properties[i];
			}
			this.clientNames[backend] = client;
			if (typeof this[client] === 'undefined') {
				this[client] = null;
			}
		}
	}

	setAll(metadata) {
		for(let name in metadata) {
			if (typeof this.clientNames[name] === 'undefined') {
				this.extra[name] = metadata[name];
			}
			else {
				this[this.clientNames[name]] = metadata[name];
			}
		}
		return this;
	}

	getAll() {
		let obj = {};
		for(let backend in this.clientNames) {
			let client = this.clientNames[backend];
			obj[client] = this[client];
		}
		return Object.assign(obj, this.extra);
	}

	get(name) {
		return typeof this.extra[name] !== 'undefined' ? this.extra[name] : null;
	}

}


class File extends BaseEntity {
	constructor(connection, userId, path) {
		super(connection, ["path", "size", "modified"]);
		this.userId = userId;
		this.path = path;
	}

	// If target is null, returns promise with data as stream in node environment, blob in browser.
	// Otherwise writes downloaded file to target.
	downloadFile(target = null) {
		return this.connection.download('/files/' + this.userId + '/' + this.path, true)
			.then(response => {
				if (target === null) {
					return Promise.resolve(response.data);
				}
				else {
					return this._saveToFile(response.data, target);
				}
			});
	}

	_saveToFile(data, filename) {
		if (isNode) {
			return Util.saveToFileNode(data, filename);
		}
		else {
			/* istanbul ignore next */
			return Util.saveToFileBrowser(data, filename);
		}
	}

	_readFromFileNode(path) {
		var fs = require('fs');
		return fs.createReadStream(path);
	}

	// source for node must be a path to a file as string
	// source for browsers must be an object from a file upload form
	uploadFile(source, statusCallback = null) {
		if (isNode) {
			// Use a file stream for node
			source = this._readFromFileNode(source);
		}
		// else: Just use the file object from the browser

		let options = {
			method: 'put',
			url: '/files/' + this.userId + '/' + this.path,
			data: source,
			headers: {
				'Content-Type': 'application/octet-stream'
			}
		};
		if (typeof statusCallback === 'function') {
			options.onUploadProgress = (progressEvent) => {
				let percentCompleted = Math.round( (progressEvent.loaded * 100) / progressEvent.total );
				statusCallback(percentCompleted);
			};
		}

		// ToDo: We should set metadata here for convenience as in createJob etc., but the API gives no information.
		return this.connection._send(options).then(() => {
			return this;
		});
	}

	deleteFile() {
		return this.connection._delete('/files/' + this.userId + '/' + this.path);
	}
}


class Job extends BaseEntity {
	constructor(connection, jobId) {
		super(connection, ["id", "title", "description", ["process_graph", "processGraph"], "status", "progress", "error", "submitted", "updated", "plan", "costs", "budget"]);
		this.jobId = jobId;
	}

	describeJob() {
		return this.connection._get('/jobs/' + this.jobId)
			.then(response => this.setAll(response.data));
	}

	updateJob(parameters) {
		return this.connection._patch('/jobs/' + this.jobId, parameters)
			.then(() => {
				if (this.connection.capabilitiesObject.hasFeature('describeJob')) {
					return this.describeJob();
				}
				else {
					this.setAll(parameters);
					return Promise.resolve(this);
				}
			});
	}

	deleteJob() {
		return this.connection._delete('/jobs/' + this.jobId);
	}

	estimateJob() {
		return this.connection._get('/jobs/' + this.jobId + '/estimate')
			.then(response => response.data);
	}

	startJob() {
		return this.connection._post('/jobs/' + this.jobId + '/results', {})
			.then(() => {
				if (this.connection.capabilitiesObject.hasFeature('describeJob')) {
					return this.describeJob();
				}
				else {
					return Promise.resolve(this);
				}
			});
	}

	stopJob() {
		return this.connection._delete('/jobs/' + this.jobId + '/results')
			.then(() => {
				if (this.connection.capabilitiesObject.hasFeature('describeJob')) {
					return this.describeJob();
				}
				else {
					return Promise.resolve(this);
				}
			});
	}

	listResults(type = 'json') {
		type = type.toLowerCase();
		if (type != 'json') {
			return Promise.reject(new Error("'"+type+"' is not supported by the client, please use JSON."));
		} else {
			return this.connection._get('/jobs/' + this.jobId + '/results').then(response => {
				// Returning null for missing headers is not strictly following the spec
				let headerData = {
					costs: response.headers['openeo-costs'] || null,
					expires: response.headers['expires'] || null
				};
				return Object.assign(headerData, response.data);
			});
		}
	}

	// Note: targetFolder must exist!
	downloadResults(targetFolder) {
		if (isNode) {
			return this.listResults().then(list => {
				var url = require("url");
				var path = require("path");

				let promises = [];
				let files = [];
				for(let i in list.links) {
					let link = list.links[i].href;
					let parsedUrl = url.parse(link);
					let targetPath = path.join(targetFolder, path.basename(parsedUrl.pathname));
					let p = this.connection.download(link, false)
						.then(response => Util.saveToFileNode(response.data, targetPath))
						.then(() => files.push(targetPath));
					promises.push(p);
				}

				return Promise.all(promises).then(() => files);
			});
		}
		else {
			/* istanbul ignore next */
			return Promise.reject(new Error("downloadResults is not supported in a browser environment."));
		}
	}
}


class ProcessGraph extends BaseEntity {
	constructor(connection, processGraphId) {
		super(connection, ["id", "title", "description", ["process_graph", "processGraph"]]);
		this.connection = connection;
		this.processGraphId = processGraphId;
	}

	describeProcessGraph() {
		return this.connection._get('/process_graphs/' + this.processGraphId)
			.then(response => this.setAll(response.data));
	}

	updateProcessGraph(parameters) {
		return this.connection._patch('/process_graphs/' + this.processGraphId, parameters)
			.then(() => {
				if (this.connection.capabilitiesObject.hasFeature('describeProcessGraph')) {
					return this.describeProcessGraph();
				}
				else {
					this.setAll(parameters);
					return Promise.resolve(this);
				}
			});
	}

	deleteProcessGraph() {
		return this.connection._delete('/process_graphs/' + this.processGraphId);
	}
}


class Service extends BaseEntity {
	constructor(connection, serviceId) {
		super(connection, ["id", "title", "description", ["process_graph", "processGraph"], "url", "type", "enabled", "parameters", "attributes", "submitted", "plan", "costs", "budget"]);
		this.serviceId = serviceId;
	}

	describeService() {
		return this.connection._get('/services/' + this.serviceId)
			.then(response => this.setAll(response.data));
	}

	updateService(parameters) {
		return this.connection._patch('/services/' + this.serviceId, parameters)
			.then(() => {
				if (this.connection.capabilitiesObject.hasFeature('describeService')) {
					return this.describeService();
				}
				else {
					return Promise.resolve(this.setAll(parameters));
				}
			});
	}

	deleteService() {
		return this.connection._delete('/services/' + this.serviceId);
	}
}

class Util {

	static base64encode(str) {
		if (typeof btoa === 'function') {
			// btoa is JS's ugly name for encodeBase64
			return btoa(str);
		}
		else {
			let buffer;
			if (str instanceof Buffer) {
				buffer = str;
			} else {
				buffer = Buffer.from(str.toString(), 'binary');
			}
			return buffer.toString('base64');
		}
	}

	// Non-crypthographic / unsafe hashing for objects
	static hash(o) {
		switch(typeof o) {
			case 'boolean':
				return Util.hashString("b:" + o.toString());
			case 'number':
				return Util.hashString("n:" + o.toString());
			case 'string':
				return Util.hashString("s:" + o);
			case 'object':
				if (o === null) {
					return Util.hashString("n:");
				}
				else {
					return Util.hashString(Object.keys(o).sort().map(k => "o:" + k + ":" + Util.hash(o[k])).join("::"));
				}
			default:
				return Util.hashString(typeof o);
		}
	}

	// See: https://en.wikipedia.org/wiki/Jenkins_hash_function
	static hashString(b) {
		for(var a = 0, c = b.length; c--; ) {
			a += b.charCodeAt(c);
			a += a<<10;
			a ^= a>>6;
		}
		a += a<<3;
		a ^= a>>11;
		a += a<<15;
		return ((a&4294967295)>>>0).toString(16);
	}

	static saveToFileNode(data, filename) {
		var fs = require('fs');
		return new Promise((resolve, reject) => {
			let writeStream = fs.createWriteStream(filename);
			writeStream.on('close', (err) => {
				if (err) {
					return reject(err);
				}
				resolve();
			});
			data.pipe(writeStream);
		});
	}

	/* istanbul ignore next */
	static saveToFileBrowser(data, filename) {
		// based on: https://github.com/kennethjiang/js-file-download/blob/master/file-download.js
		let blob = new Blob([data], {type: 'application/octet-stream'});
		let blobURL = window.URL.createObjectURL(blob);
		let tempLink = document.createElement('a');
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
		return Promise.resolve();
	}

	static mostCompatible(versions) {
		if (!Array.isArray(versions)) {
			return [];
		}

		let compatible = versions.filter(c => typeof c.url === 'string' && typeof c.api_version === 'string' && c.api_version.startsWith("0.4."));
		if (compatible.length === 0) {
			return compatible;
		}

		return compatible.sort(Util.compatibility);
	}

	static compatibility(c1, c2) {
		// This is a quite dumb sorting algorithm for version numbers
		let v1 = Number.parseInt(c1.api_version.substr(4));
		let v2 = Number.parseInt(c2.api_version.substr(4));
		let p1 = c1.production !== false;
		let p2 = c2.production !== false;
		if (p1 === p2) {
			if (v1 > v2) {
				return -1;
			}
			else if (v1 < v2) {
				return 1;
			}
			else {
				return 0;
			}
		}
		else if (p1) {
			return -1;
		}
		else if (p2) {
			return 1;
		}
		else {
			return 0;
		}
	}
}

let toExport = {
	OpenEO: OpenEO,
	Util: Util
};

// explanation: https://www.matteoagosti.com/blog/2013/02/24/writing-javascript-modules-for-both-browser-and-node/
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = toExport;
}
else {
	/* istanbul ignore next */
	if (typeof define === 'function' && define.amd) {
		define([], function () {
			return toExport;
		});
	}
	else {
		for(let exportObjName in toExport) {
			window[exportObjName] = toExport[exportObjName];
		}
	}
}
