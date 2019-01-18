if (typeof axios === 'undefined') {
	var axios = require("axios");
}

var isNode = false;
try {
	isNode = (typeof window === 'undefined' && Object.prototype.toString.call(global.process) === '[object process]');
} catch(e) {}

class OpenEO {
	constructor() {
	}

	connect(url, authType = null, authOptions = null) {
		var connection = new Connection(url);
		return connection.capabilities().then(capabilities => {
			// Check whether back-end is accessible and supports a correct version.
			if (capabilities.version().startsWith("0.3")) {
				if(authType !== null) {
					switch(authType) {
						case 'basic':
							return connection.authenticateBasic(authOptions.username, authOptions.password).then(_ => connection);
						case 'oidc':
							return connection.authenticateOIDC(authOptions).then(_ => connection);
						default:
							throw new Error("Unknown authentication type.");
					}
				}
				return Promise.resolve(connection);
			}
			else {
				throw new Error("Server doesn't support API version 0.3.x.");
			}
		});
	}

	version() {
		return "0.3.0";
	}
}


class Connection {
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
		this.userId = null;
		this.bearerToken = null;
		this.subscriptionsObject = new Subscriptions(this);
		this.capabilitiesObject = null;
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

	authenticateOIDC(options = null) {
		return Promise.reject(new Error("Not implemented yet."));
	}

	_base64encode(str) {
		var buffer;
		if (str instanceof Buffer) {
			buffer = str;
		} else {
			buffer = Buffer.from(str.toString(), 'binary');
		}
		return buffer.toString('base64');
	}

	authenticateBasic(username, password) {
		return this._send({
			method: 'get',
			responseType: 'json',
			url: '/credentials/basic',
			headers: {'Authorization': 'Basic ' + this._base64encode(username + ':' + password)}  // btoa is JS's ugly name for encodeBase64
		}).then(response => {
			if (!response.data.user_id) {
				throw new Error("No user_id returned.");
			}
			if (!response.data.access_token) {
				throw new Error("No access_token returned.");
			}
			this.userId = response.data.user_id;
			this.bearerToken = response.data.access_token;
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
			.then(() => [true, {}]) // Accepts other status codes than 204, which is not strictly following the spec
			.catch(error => [false, error.response.data]);
	}

	listProcessGraphs() {
		return this._get('/process_graphs')
			.then(response => response.data.process_graphs.map((pg) => new ProcessGraph(this, pg.process_graph_id).setAll(pg)));
	}

	createProcessGraph(processGraph, title = null, description = null) {
		var pgObject = {title: title, description: description, process_graph: processGraph};
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

	execute(processGraph, outputFormat = null, outputParameters = {}, budget = null) {
		var requestBody = {
			process_graph: processGraph,
			budget: budget
		};
		if (outputFormat !== null) {
			requestBody.output = {
				format: outputFormat,
				parameters: outputParameters
			};
		}

		return this._post('/preview', requestBody, 'stream').then(response => response.data);
	}

	listJobs() {
		return this._get('/jobs')
			.then(response => response.data.jobs.map(j => new Job(this, j.job_id).setAll(j)));
	}

	createJob(processGraph, outputFormat = null, outputParameters = {}, title = null, description = null, plan = null, budget = null, additional = {}) {
		var jobObject = Object.assign(additional, {
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
			.then(response => response.data.services.map((s) => new Service(this, s.service_id).setAll(s)));
	}

	createService(processGraph, type, title = null, description = null, enabled = true, parameters = {}, plan = null, budget = null) {
		var serviceObject = {
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
			options.headers['Authorization'] = 'Bearer ' + this.bearerToken;
		}
		if (options.responseType == 'stream' && !isNode) {
			options.responseType = 'blob';
		}
		if (!options.responseType) {
			options.responseType = 'json';
		}
		switch(options.method) {
			case 'put':
			case 'patch':
			case 'delete':
				options.validateStatus = status => status == 204;
				break;
		}

		return axios(options);
	}

	_resetAuth() {
		this.userId = null;
		this.bearerToken = null;
	}

	isLoggedIn() {
		return (this.bearerToken !== null);
	}

	subscribe(topic, parameters, callback) {
		return this.subscriptionsObject.subscribe(topic, parameters, callback);
	}

	unsubscribe(topic, parameters, callback) {
		return this.subscriptionsObject.unsubscribe(topic, parameters, callback);
	}

	_saveToFileNode(data, filename) {
		var fs = require('fs');
		return new Promise((resolve, reject) => {
			var writeStream = fs.createWriteStream(filename);
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
	_saveToFileBrowser(data, filename) {
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
		return Promise.resolve();
	}
}


class Subscriptions {

	constructor(httpConnection) {
		this.httpConnection = httpConnection;
		this.socket = null;
		this.listeners = new Map();
		this.supportedTopics = [];
		this.messageQueue = [];
		this.websocketProtocol = "openeo-v0.3";
	}

	subscribe(topic, parameters, callback) {
		if(!parameters) {
			parameters = {};
		}

		if (callback) {
			if(!this.listeners.has(topic)) {
				this.listeners.set(topic, new Map());
			}
			this.listeners.get(topic).set(JSON.stringify(parameters), callback);
		}

		this._sendSubscription('subscribe', topic, parameters);
	}

	unsubscribe(topic, parameters) {
		// get all listeners for the topic
		var topicListeners = this.listeners.get(topic);
		
		if(!parameters) {
			parameters = {};
		}

		// remove the applicable sub-callback
		if(topicListeners instanceof Map) {
			topicListeners.delete(JSON.stringify(parameters));
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
			var url = this.httpConnection._baseUrl.replace('http', 'ws') + '/subscription';

			if (isNode) {
				const WebSocket = require('ws');
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
		var json = JSON.parse(event.data);
		if (json.message.topic == 'openeo.welcome') {
			this.supportedTopics = json.payload.topics;
		}
		else {
			// get listeners for topic
			var topicListeners = this.listeners.get(json.message.topic);
			var callback;
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
				console.log("No listener found to handle incoming message of type: " + json.message.topic);
			}
		}
	}

	_flushQueue() {
		if(this.socket.readyState === this.socket.OPEN) {
			for(var i in this.messageQueue) {
				this.socket.send(JSON.stringify(this.messageQueue[i]));
			}

			this.messageQueue = [];
		}
	}

	_sendMessage(topic, payload = null, priority = false) {
		var obj = {
			authorization: "Bearer " + this.httpConnection._token,
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

		var payloadParameters = Object.assign(parameters, { topic: topic });

		this._sendMessage(action, {
			topics: [payloadParameters]
		});
	}

}


class Capabilities {
	constructor(data) {
		if(!data || !data.version || !data.endpoints) {
			throw new Error("Data is not a valid Capabilities response");
		}
		this._data = data;
	}

	version() {
		return this._data.version;
	}

	listFeatures() {
		return this._data.endpoints;
	}

	hasFeature(methodName) {
		var clientMethodNameToAPIRequestMap = {
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
			deleteService: 'DELETE /services/{service_id}',
			subscribe: 'GET /subscription',
			unsubscribe: 'GET /subscription'
		};
		
		// regex-ify to allow custom parameter names
		for (var key in clientMethodNameToAPIRequestMap) {
			clientMethodNameToAPIRequestMap[key] = clientMethodNameToAPIRequestMap[key].replace(/{[^}]+}/, '{[^}]+}');
		}

		if (methodName === 'createFile') {
			return this.hasFeature('uploadFile'); // createFile is always available, map it to uploadFile as it is more meaningful.
		} else {
			return this._data.endpoints
				.map((e) => e.methods.map((method) => method + ' ' + e.path))
				// .flat(1)   // does exactly what we want, but (as of Sept. 2018) not yet part of the standard...
				.reduce((a, b) => a.concat(b), [])  // ES6-proof version of flat(1)
				.some((e) => e.match(new RegExp('^'+clientMethodNameToAPIRequestMap[methodName]+'$')) != null);
		}
	}

	currency() {
		return (this._data.billing ? this._data.billing.currency : null);
	}

	listPlans() {
		return (this._data.billing ? this._data.billing.plans : null);
	}
}


class BaseEntity {

	constructor(connection, properties = []) {
		this.connection = connection;
		this.clientNames = {};
		this.extra = {};
		for(var i in properties) {
			var backend, client;
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
		for (var name in metadata) {
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
		var obj = {};
		for (var backend in this.clientNames) {
			var client = this.clientNames[backend];
			obj[client] = this[client];
		}
		return Object.assign(obj, this.extra);
	}

	get(name) {
		return typeof this.extra[name] !== 'undefined' ? this.extra[name] : null;
	}

}


class File extends BaseEntity {
	constructor(connection, userId, name) {
		super(connection, ["name", "size", "modified"]);
		this.userId = userId;
	}

	// If target is null, returns promise with data as stream in node environment, blob in browser.
	// Otherwise writes downloaded file to target.
	downloadFile(target = null) {
		return this.connection.download('/files/' + this.userId + '/' + this.name, true)
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
			return this.connection._saveToFileNode(data, filename);
		}
		else {
			/* istanbul ignore next */
			return this.connection._saveToFileBrowser(data, filename);
		}
	}

	_readFromFileNode(path) {
		var fs = require('fs');
		return fs.createReadStream(path);
	}

	_uploadFile(source, statusCallback) {
	}

	// source for node must be a path to a file as string
	// source for browsers must be an object from a file upload form
	uploadFile(source, statusCallback = null) {
		if (isNode) {
			// Use a file stream for node
			source = this._readFromFileNode(source);
		}
		// else: Just use the file object from the browser

		var options = {
			method: 'put',
			url: '/files/' + this.userId + '/' + this.name,
			data: source,
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

		// ToDo: We should set metadata here for convenience as in createJob etc., but the API gives no information.
		return this.connection._send(options).then(() => {
			return this;
		});
	}

	deleteFile() {
		return this.connection._delete('/files/' + this.userId + '/' + this.name);
	}
}


class Job extends BaseEntity {
	constructor(connection, jobId) {
		super(connection, [["job_id", "jobId"], "title", "description", "status", "submitted", "updated", "plan", "costs", "budget"]);
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
				var headerData = {
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

				var promises = [];
				var files = [];
				for(var i in list.links) {
					var link = list.links[i].href;
					var parsedUrl = url.parse(link);
					var targetPath = path.join(targetFolder, path.basename(parsedUrl.pathname));
					var p = this.connection.download(link, false)
						.then(response => this.connection._saveToFileNode(response.data, targetPath))
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
		super(connection, [["process_graph_id", "processGraphId"], "title", "description", "process_graph"]);
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
		super(connection, [["service_id", "serviceId"], "title", "description", "url", "type", "enabled", "submitted", "plan", "costs", "budget"]);
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


let toExport = {
	OpenEO: OpenEO
};

// explanation: https://www.matteoagosti.com/blog/2013/02/24/writing-javascript-modules-for-both-browser-and-node/
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
