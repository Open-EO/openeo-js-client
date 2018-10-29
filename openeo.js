class OpenEO {
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
		this._subscriptionSocket = null;
		this._subscriptionListeners = new Map();

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

	getBaseUrl() {
		return this._baseUrl;
	}

	getUserId() {
		return this._userId;
	}

	capabilities() {
		return this._get('/')
			.then(response => new Capabilities(response.data))
			.catch(error => { throw error; });
	}

	listFileTypes() {
		return this._get('/output_formats')
			.then(response => response.data)
			.catch(error => { throw error; });
	}

	listServiceTypes() {
		return this._get('/service_types')
			.then(response => response.data)
			.catch(error => { throw error; });
	}

	listCollections() {
		return this._get('/collections')
			.then(response => response.data)
			.catch(error => { throw error; });
	}

	describeCollection(name) {
		return this._get('/collections/' + name)
			.then(response => response.data)
			.catch(error => { throw error; });
	}

	listProcesses() {
		return this._get('/processes')
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
		return this._get('/me')
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
			.then(response => response.data.files.map((f) => new File(this, userId, f.name)._addMetadata(f)))
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

	listProcessGraphs() {
		return this._get('/process_graphs')
			.then(response => response.data.process_graphs.map((pg) => new ProcessGraph(this, pg.process_graph_id)._addMetadata(pg)))
			.catch(error => { throw error; });
	}

	createProcessGraph(processGraph, title = null, description = null) {
		return this._post('/process_graphs', {title: title, description: description, process_graph: processGraph})
			.then(response => new ProcessGraph(this, response.headers['OpenEO-Identifier'])._addMetadata({title: title, description: description}))
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
			.then(response => response.data.jobs.map((j) => new Job(this, j.job_id)._addMetadata(j)))
			.catch(error => { throw error; });
	}

	createJob(processGraph, outputFormat, outputParameters = null, title = null, description = null, plan = null, budget = null, additional = {}) {
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
			.then(response => new Job(this, response.headers['OpenEO-Identifier'])._addMetadata({title: title, description: description}))
			.catch(error => { throw error; });
	}

	listServices() {
		return this._get('/services')
			.then(response => response.data.services.map((s) => new Service(this, s.service_id)._addMetadata(s)))
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
			.then(response => new Service(this, response.headers['OpenEO-Identifier'])._addMetadata({title: title, description: description}))
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
	download(url, authorize = null) {
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
			.then(response => response)
			.catch(error => {
				throw error;
			});
	}

	_resetAuth() {
		this._userId = null;
		this._token = null;
	}

	_isLoggedIn() {
		return (this._token !== null);
	}

	subscribe(topic, parameters, callback) {
		console.warn('Subscriptions are not fully implemented yet.');

		if(!parameters) {
			parameters = {};
		}

		if (callback) {
			if(!this._subscriptionListeners.has(topic)) {
				this._subscriptionListeners.set(topic, new Map());
			}
			this._subscriptionListeners.get(topic).set(JSON.stringify(parameters), callback);
		}

		this._sendSubscription('subscribe', topic, parameters);
	}

	unsubscribe(topic, parameters) {
		// get all listeners for the topic
		const topicListeners = this._subscriptionListeners.get(topic);
		
		if(!parameters) {
			parameters = {};
		}

		// remove the applicable sub-callback
		if(topicListeners instanceof Map) {
			topicListeners.delete(JSON.stringify(parameters));
		} else {
			throw Error("this._subscriptionListeners must be a Map of Maps");
		}

		// Remove entire topic from subscriptionListeners if no topic-specific listener is left
		if(topicListeners.size === 0) {
			this._subscriptionListeners.delete(topic);
		}

		// now send the command to the server (NOT earlier, because the command manipulates `parameters`)
		this._sendSubscription('unsubscribe', topic, parameters);

		// Close subscription socket if there is no subscription left (use .size, NOT .length!)
		if (this._subscriptionSocket !== null && this._subscriptionListeners.size === 0) {
			console.log('Closing connection because there is no subscription left');
			this._subscriptionSocket.close();
		}
	}

	_createWebSocket() {
		if (this._subscriptionSocket === null || this._subscriptionSocket.readyState === this._subscriptionSocket.CLOSING || this._subscriptionSocket.readyState === this._subscriptionSocket.CLOSED) {
			var url = OpenEO.API.baseUrl + '/subscription?authorization=' + OpenEO.Auth.token;
			this._subscriptionSocket = new WebSocket(url.replace('http', 'ws'), "openeo-v0.3");
			this._subscriptionSocket.addEventListener('error', () => {
				this._subscriptionSocket = null;
			});
			this._subscriptionSocket.addEventListener('close', () => {
				this._subscriptionSocket = null;
			});
			this._subscriptionSocket.addEventListener('message', event => {
				// ToDo: Add error handling
				var json = JSON.parse(event.data);
				if (json.message.topic == 'openeo.welcome') {
					console.log("Supported topics: " + json.payload.topics);
				}
				else {
					// get listeners for topic
					var topicListeners = this._subscriptionListeners.get(json.message.topic);
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
		return this._subscriptionSocket;
	}

	_sendSubscription(action, topic, parameters) {
		this._createWebSocket();

		if (!parameters || typeof parameters != 'object') {  // caution: typeof null == 'object', but null==false
			parameters = {};
		}

		var callback = () => {
			parameters.topic = topic;
			this._subscriptionSocket.send(JSON.stringify({
				message: {
					topic: 'openeo.' + action,
					issued: (new Date()).toISOString()
				},
				payload: {
					topics: [parameters]
				}
			}));
		};

		if(this._subscriptionSocket.readyState === this._subscriptionSocket.CONNECTING){
			this._subscriptionSocket.addEventListener('open', event => {
				callback();
			});
		}
		else if(this._subscriptionSocket.readyState === this._subscriptionSocket.OPEN){
			callback();
		}
	}
}


class Capabilities {
	constructor(data) {
		if(!data || !data.version || !data.endpoints) {
			throw "Data is not a valid Capabilities response"
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
		
		// regex-ify to allow custom parameter names
		for (var key in clientMethodNameToAPIRequestMap) {
			clientMethodNameToAPIRequestMap[key] = clientMethodNameToAPIRequestMap[key].replace(/{[^}]+}/, '{[^}]+}');
		}

		if (methodName === 'createFile') {
			return true;   // Of course it's always possible to create "a (virtual) file".
			// But maybe it would be smarter to return the value of hasFeature('uploadFile') instead, because that's what the user most likely wants to do
		} else {
			return this._data.endpoints
				.map((e) => e.methods.map((method) => method + ' ' + e.path))
				// .flat(1)   // does exactly what we want, but (as of Sept. 2018) not yet part of the standard...
				.reduce((a, b) => a.concat(b), [])  // ES6-proof version of flat(1)
				.some((e) => e.match(new RegExp('^'+clientMethodNameToAPIRequestMap[methodName]+'$')) != null);
		}
	}

	currency() {
		return (this._data.billing ? this._data.billing.currency : undefined);
	}

	listPlans() {
		return (this._data.billing ? this._data.billing.plans : undefined);
	}
}


class File {
	constructor(connection, userId, path) {
		this.connection = connection;
		this.userId = userId;
		this.path = path;
	}

	_addMetadata(metadata) {
		// Metadata for files can be "size", "modified", or ANY (!) custom field name.
		// To prevent overwriting of already existing data we therefore have to delete keys that already
		// exist in "this" scope from the metadata object (if they exist)
		delete metadata.connection;
		delete metadata.userId;
		delete metadata.path;

		for(md in metadata) {
			this[md] = metadata[md];
		}

		return this;  // for chaining
	}

	downloadFile(target) {
		return this.connection._download(this.userId + this.path, target)
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
		return this.connection._put(this.userId + this.path, source);
	}

	deleteFile() {
		return this.connection._delete(this.userId + this.path);
	}
}


class Job {
	constructor(connection, jobId) {
		this.connection = connection;
		this.jobId = jobId;
	}

	_addMetadata(metadata) {		
		this.title       = metadata.title;
		this.description = metadata.description;
		this.status      = metadata.status;
		this.submitted   = metadata.submitted;
		this.updated     = metadata.updated;
		this.plan        = metadata.plan;
		this.costs       = metadata.costs;
		this.budget      = metadata.budget;
		return this;  // for chaining
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
		} else if(type != 'json') {
			throw "Only JSON is supported by the JS client";
		} else {
			return this.connection._get('/jobs/' + this.jobId + '/results')
				.then(response => Object.assign({costs: response.headers['OpenEO-Costs']}, response.data))
				.catch(error => { throw error; });
		}
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

	_addMetadata(metadata) {
		this.title = metadata.title;
		this.description = metadata.description;
		return this;  // for chaining
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

	_addMetadata(metadata) {
		this.title       = metadata.title;
		this.description = metadata.description;
		this.url         = metadata.url;
		this.type        = metadata.type;
		this.enabled     = metadata.enabled;
		this.submitted   = metadata.submitted;
		this.plan        = metadata.plan;
		this.costs       = metadata.costs;
		this.budget      = metadata.budget;
		return this;  // for chaining
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
