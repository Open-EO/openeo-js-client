if (typeof axios === 'undefined') {
	var axios = require("axios");
}

/**
 * Flag that indicated whether we are nunning in a NodeJS environment (`true`) or not (`false`).
 * 
 * @var {boolean}
 */
var isNode = false;
try {
	isNode = (typeof window === 'undefined' && Object.prototype.toString.call(global.process) === '[object process]');
} catch(e) {}

/**
 * Main class to start with openEO. Allows to connect to a server.
 * 
 * @class
 * @hideconstructor
 */
class OpenEO {

	/**
	 * Connect to a back-end with version discovery (recommended).
	 * 
	 * Includes version discovery (request to `GET /well-known/openeo`) and connects to the most suitable version compatible to this JS client version.
	 * Requests the capabilities and authenticates where required.
	 * 
	 * @async
	 * @param {string} url - The server URL to connect to.
	 * @param {string} [authType=null] - 
	 * @param {object} [authOptions={}] - 
	 * @param {string} [authOptions.username] - HTTP Basic only: Username
	 * @param {string} [authOptions.password] - HTTP Basic only: Password
	 * @returns {Connection}
	 * @throws {Error}
	 * @static
	 */
	static async connect(url, authType = null, authOptions = {}) {
		let wellKnownUrl = url.replace(/\/$/, "") + '/.well-known/openeo';
		let response = await axios.get(wellKnownUrl);
		if (response.data === null || typeof response.data !== 'object' || !Array.isArray(response.data.versions)) {
			throw new Error("Well-Known Document doesn't list any version.");
		}

		let compatibility = Util.mostCompatible(response.data.versions);
		if (compatibility.length > 0) {
			url = compatibility[0].url;
		}
		else {
			throw new Error("Server doesn't support API version 0.4.x.");
		}

		return OpenEO.connectDirect(url, authType, authOptions);
	}

	/**
	 * Connects directly to a back-end instance, without version discovery (NOT recommended).
	 * 
	 * Doesn't do version discovery, therefore a URL of a versioned API must be specified. Requests the capabilities and authenticates where required.
	 * 
	 * @async
	 * @param {string} url - The server URL to connect to.
	 * @param {string} [authType=null] - Authentication type, either `basic` for HTTP Basic, `oidc` for OpenID Connect or `null` to disable authentication.
	 * @param {object} [authOptions={}] - Object with authentication options.
	 * @param {string} [authOptions.username] - HTTP Basic only: Username
	 * @param {string} [authOptions.password] - HTTP Basic only: Password
	 * @returns {Connection}
	 * @throws {Error}
	 * @static
	 */
	static async connectDirect(versionedUrl, authType = null, authOptions = {}) {
		let connection = new Connection(versionedUrl);

		// Check whether back-end is accessible and supports a compatible version.
		let capabilities = await connection.init();
		if (!capabilities.apiVersion().startsWith("0.4.")) {
			throw new Error("Server instance doesn't support API version 0.4.x.");
		}

		if(authType !== null) {
			switch(authType) {
				case 'basic':
					return await connection.authenticateBasic(authOptions.username, authOptions.password);
				case 'oidc':
					return await connection.authenticateOIDC(authOptions);
				default:
					throw new Error("Unknown authentication type.");
			}
		}

		return connection;
	}

	/**
	 * Returns the version number of the client.
	 * 
	 * Not to confuse with the API version(s) supported by the client.
	 * 
	 * @returns {string} Version number (according to SemVer).
	 */
	static clientVersion() {
		return "0.4.0";
	}

}

/**
 * A connection to a back-end.
 * 
 * @class
 */
class Connection {

	/**
	 * Creates a new Connection.
	 * 
	 * @param {string} baseUrl - URL to the back-end
	 */
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
		this.userId = null;
		this.accessToken = null;
		this.capabilitiesObject = null;
		this.subscriptionsObject = new Subscriptions(this);
	}

	/**
	 * Initializes the connection by requesting the capabilities.
	 * 
	 * @async
	 * @returns {Capabilities} Capabilities
	 */
	async init() {
		let response = await this._get('/');
		this.capabilitiesObject = new Capabilities(response.data);
		return this.capabilitiesObject;
	}

	/**
	 * Returns the URL of the back-end currently connected to.
	 * 
	 * @returns {string} The URL or the back-end.
	 */
	getBaseUrl() {
		return this.baseUrl;
	}

	/**
	 * Returns the identifier of the user that is currently authenticated at the back-end.
	 * 
	 * @returns {string} ID of the authenticated user.
	 */
	getUserId() {
		return this.userId;
	}

	/**
	 * Returns the capabilities of the back-end.
	 * 
	 * @returns {Capabilities} Capabilities
	 */
	capabilities() {
		return this.capabilitiesObject;
	}

	/**
	 * List the supported output file formats.
	 * 
	 * @async
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listFileTypes() {
		let response = await this._get('/output_formats');
		return response.data;
	}

	/**
	 * List the supported secondary service types.
	 * 
	 * @async
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listServiceTypes() {
		let response = await this._get('/service_types');
		return response.data;
	}

	/**
	 * List the supported UDF runtimes.
	 * 
	 * @async
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listUdfRuntimes() {
		let response = await this._get('/udf_runtimes');
		return response.data;
	}

	/**
	 * List all collections available on the back-end.
	 * 
	 * @async
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listCollections() {
		let response = await this._get('/collections');
		return response.data;
	}

	/**
	 * Get further information about a single collection.
	 * 
	 * @async
	 * @param {string} collection_id - Collection ID to request further metadata for.
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async describeCollection(collection_id) {
		let response = await this._get('/collections/' + collection_id);
		return response.data;
	}

	/**
	 * List all processes available on the back-end.
	 * 
	 * @async
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listProcesses() {
		let response = await this._get('/processes');
		return response.data;
	}

	/**
	 * Authenticate with OpenID Connect (OIDC).
	 * 
	 * Not required to be called explicitly if specified in `OpenEO.connect`.
	 * 
	 * @param {object} options - Options for OIDC authentication.
	 * @returns {object}
	 * @throws {Error}
	 * @todo Implement OpenID Connect authentication {@link https://github.com/Open-EO/openeo-js-client/issues/11}
	 */
	async authenticateOIDC(options = null) {
		throw new Error("Not implemented yet.");
	}

	/**
	 * Authenticate with HTTP Basic.
	 * 
	 * Not required to be called explicitly if specified in `OpenEO.connect`.
	 * 
	 * @async
	 * @param {object} options - Options for Basic authentication.
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async authenticateBasic(username, password) {
		let response = await this._send({
			method: 'get',
			responseType: 'json',
			url: '/credentials/basic',
			headers: {'Authorization': 'Basic ' + Util.base64encode(username + ':' + password)}
		});
		if (!response.data.user_id) {
			throw new Error("No user_id returned.");
		}
		if (!response.data.access_token) {
			throw new Error("No access_token returned.");
		}
		this.userId = response.data.user_id;
		this.accessToken = response.data.access_token;
		return response.data;
	}

	/**
	 * Get information about the authenticated user.
	 * 
	 * @async
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async describeAccount() {
		let response = await this._get('/me');
		return response.data;
	}

	/**
	 * Lists all files from the user workspace. 
	 * 
	 * @async
	 * @param {string} [userId=null] - User ID, defaults to authenticated user.
	 * @returns {File[]} A list of files.
	 * @throws {Error}
	 */
	async listFiles(userId = null) {
		userId = this._resolveUserId(userId);
		let response = await this._get('/files/' + userId);
		return response.data.files.map(
			f => new File(this, userId, f.path).setAll(f)
		);
	}

	/**
	 * Opens a (existing or non-existing) file without reading any information or creating a new file at the back-end. 
	 * 
	 * @param {string} path - Path to the file, relative to the user workspace.
	 * @param {string} [userId=null] - User ID, defaults to authenticated user.
	 * @returns {File} A file.
	 * @throws {Error}
	 */
	openFile(path, userId = null) {
		return new File(this, this._resolveUserId(userId), path);
	}

	/**
	 * Validates a process graph at the back-end.
	 * 
	 * @async
	 * @param {object} processGraph - Process graph to validate.
	 * @retrurns {Object[]} errors - A list of API compatible error objects. A valid process graph returns an empty list.
	 * @throws {Error}
	 */
	async validateProcessGraph(processGraph) {
		let response = await this._post('/validation', {process_graph: processGraph});
		if (Array.isArray(response.data.errors)) {
			return response.data.errors;
		}
		else {
			throw new Error("Invalid validation response received.");
		}
	}

	/**
	 * Lists all process graphs of the authenticated user.
	 * 
	 * @async
	 * @returns {ProcessGraph[]} A list of stored process graphs.
	 * @throws {Error}
	 */
	async listProcessGraphs() {
		let response = await this._get('/process_graphs');
		return response.data.process_graphs.map(
			pg => new ProcessGraph(this, pg.id).setAll(pg)
		);
	}

	/**
	 * Creates a new stored process graph at the back-end.
	 * 
	 * @async
	 * @param {object} processGraph - A process graph (JSON).
	 * @param {string} [title=null] - A title for the stored process graph.
	 * @param {string} [description=null] - A description for the stored process graph.
	 * @returns {ProcessGraph} The new stored process graph.
	 * @throws {Error}
	 */
	async createProcessGraph(processGraph, title = null, description = null) {
		let requestBody = {title: title, description: description, process_graph: processGraph};
		var response = await this._post('/process_graphs', requestBody);
		var obj = new ProcessGraph(this, response.headers['openeo-identifier']).setAll(requestBody);
		if (await this.capabilitiesObject.hasFeature('describeProcessGraph')) {
			return obj.describeProcessGraph();
		}
		else {
			return obj;
		}
	}

	/**
	 * Get all information about a stored process graph.
	 * 
	 * @async
	 * @param {string} id - Process graph ID. 
	 * @returns {ProcessGraph} The stored process graph.
	 * @throws {Error}
	 */
	async getProcessGraphById(id) {
		let pg = new ProcessGraph(this, id);
		return await pg.describeJob();
	}

	/**
	 * Executes a process graph synchronously and returns the result as the response.
	 * 
	 * Please note that requests can take a very long time of several minutes or even hours.
	 * 
	 * @async
	 * @param {object} processGraph - A process graph (JSON).
	 * @param {string} [plan=null] - The billing plan to use for this computation.
	 * @param {number} [budget=null] - The maximum budget allowed to spend for this computation.
	 * @returns {Stream|Blob} - Returns the data as `Stream` in NodeJS environments or as `Blob` in browsers (see `isNode`).
	 */
	async computeResult(processGraph, plan = null, budget = null) {
		let requestBody = {
			process_graph: processGraph,
			plan: plan,
			budget: budget
		};
		let response = await this._post('/result', requestBody, 'stream');
		return response.data;
	}

	/**
	 * Lists all batch jobs of the authenticated user.
	 * 
	 * @async
	 * @returns {Job[]} A list of jobs.
	 * @throws {Error}
	 */
	async listJobs() {
		var response = await this._get('/jobs');
		return response.data.jobs.map(
			j => new Job(this, j.id).setAll(j)
		);
	}

	/**
	 * Creates a new batch job at the back-end.
	 * 
	 * @async
	 * @param {object} processGraph - A process graph (JSON).
	 * @param {string} [title=null] - A title for the batch job.
	 * @param {string} [description=null] - A description for the batch job.
	 * @param {string} [plan=null] - The billing plan to use for this batch job.
	 * @param {number} [budget=null] - The maximum budget allowed to spend for this batch job.
	 * @param {object} [additional={}] - Proprietary parameters to pass for the batch job.
	 * @returns {Job} The stored batch job.
	 * @throws {Error}
	 */
	async createJob(processGraph, title = null, description = null, plan = null, budget = null, additional = {}) {
		let requestBody = Object.assign({}, additional, {
			title: title,
			description: description,
			process_graph: processGraph,
			plan: plan,
			budget: budget
		});
		let response = await this._post('/jobs', requestBody);
		var job = new Job(this, response.headers['openeo-identifier']).setAll(requestBody);
		if (this.capabilitiesObject.hasFeature('describeJob')) {
			return await job.describeJob();
		}
		else {
			return job;
		}
	}

	/**
	 * Get all information about a batch job.
	 * 
	 * @async
	 * @param {string} id - Batch Job ID. 
	 * @returns {Job} The batch job.
	 * @throws {Error}
	 */
	async getJobById(id) {
		let job = new Job(this, id);
		return await job.describeJob();
	}

	/**
	 * Lists all secondary web services of the authenticated user.
	 * 
	 * @async
	 * @returns {Job[]} A list of services.
	 * @throws {Error}
	 */
	async listServices() {
		var response = await this._get('/services');
		return response.data.services.map(
			s => new Service(this, s.id).setAll(s)
		);
	}

	/**
	 * Creates a new secondary web service at the back-end. 
	 * 
	 * @async
	 * @param {object} processGraph - A process graph (JSON).
	 * @param {string} type - The type of service to be created (see `Connection.listServiceTypes()`).
	 * @param {string} [title=null] - A title for the service.
	 * @param {string} [description=null] - A description for the service.
	 * @param {boolean} [enabled=true] - Enable the service (`true`, default) or not (`false`).
	 * @param {object} [parameters={}] - Parameters to pass to the service.
	 * @param {string} [plan=null] - The billing plan to use for this service.
	 * @param {number} [budget=null] - The maximum budget allowed to spend for this service.
	 * @returns {Service} The stored service.
	 * @throws {Error}
	 */
	async createService(processGraph, type, title = null, description = null, enabled = true, parameters = {}, plan = null, budget = null) {
		let requestBody = {
			title: title,
			description: description,
			process_graph: processGraph,
			type: type,
			enabled: enabled,
			parameters: parameters,
			plan: plan,
			budget: budget
		};
		let response = await this._post('/services', requestBody);
		let service = new Service(this, response.headers['openeo-identifier']).setAll(requestBody);
		if (this.capabilitiesObject.hasFeature('describeService')) {
			return service.describeService();
		}
		else {
			return service;
		}
	}

	/**
	 * Get all information about a secondary web service.
	 * 
	 * @async
	 * @param {string} id - Service ID. 
	 * @returns {Job} The service.
	 * @throws {Error}
	 */
	async getServiceById(id) {
		let service = new Service(this, id);
		return await service.describeJob();
	}

	async _get(path, query, responseType) {
		return await this._send({
			method: 'get',
			responseType: responseType,
			url: path,
			// Timeout for capabilities requests as they are used for a quick first discovery to check whether the server is a openEO back-end.
			// Without timeout connecting with a wrong server url may take forever.
			timeout: path === '/' ? 3000 : 0,
			params: query
		});
	}

	async _post(path, body, responseType) {
		return await this._send({
			method: 'post',
			responseType: responseType,
			url: path,
			data: body
		});
	}

	async _patch(path, body) {
		return await this._send({
			method: 'patch',
			url: path,
			data: body
		});
	}

	async _delete(path) {
		return await this._send({
			method: 'delete',
			url: path
		});
	}

	// 
	/**
	 * Downloads data from a URL.
	 * 
	 * May include authorization details where required.
	 * 
	 * @param {string} url - An absolute or relative URL to download data from.
	 * @param {boolean} authorize - Send authorization details (`true`) or not (`false`).
	 * @returns {Stream|Blob} - Returns the data as `Stream` in NodeJS environments or as `Blob` in browsers (see `isNode`).
	 */
	async download(url, authorize) {
		return await this._send({
			method: 'get',
			responseType: 'stream',
			url: url,
			withCredentials: authorize
		});
	}

	async _send(options) {
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

		try {
			return await axios(options);
		} catch(error) {
			if (error.response !== null && typeof error.response === 'object' && error.response.data !== null && typeof error.response.data === 'object' && typeof error.response.data.type === 'string' && error.response.data.type.indexOf('/json') !== -1) {
				// JSON error responses are Blobs and streams if responseType is set as such, so convert to JSON if required.
				// See: https://github.com/axios/axios/issues/815
				switch(options.responseType) {
					case 'blob':
						return new Promise((_, reject) => {
							var fileReader = new FileReader();
							fileReader.onerror = () => {
								fileReader.abort();
								reject(error);
							};
							fileReader.onload = () => reject(JSON.parse(fileReader.result));
							fileReader.readAsText(error.response.data);
						});
					case 'stream':
						return new Promise((_, reject) => {
							var chunks = "";
							error.response.data.on("data", chunk => chunks.push(chunk));
							readStream.on("error", () => reject(error));
							readStream.on("end", () => reject(JSON.parse(Buffer.concat(chunks).toString())));
						});
				}
				// Re-throw error if it was not handled yet.
				throw error;
			}
		}
	}

	_resolveUserId(userId = null) {
		if(userId === null) {
			if(this.userId === null) {
				return Promise.reject(new Error("Parameter 'userId' not specified and no default value available because user is not logged in."));
			}
			else {
				userId = this.userId;
			}
		}
		return userId;
	}

	/**
	 * Returns whether the user is authenticated (logged in) at the back-end or not.
	 * 
	 * @returns {boolean} `true` if authenticated, `false` if not.
	 */
	isLoggedIn() {
		return (this.accessToken !== null);
	}

	/**
	 * Subscribes to a topic.
	 * 
	 * @param {string} topic - The topic to subscribe to.
	 * @param {incomingMessageCallback} callback - A callback that is executed when a message for the topic is received.
	 * @param {object} [parameters={}] - Parameters for the subscription request, for example a job id.
	 * @throws {Error}
	 * @see Subscriptions.subscribe()
	 * @see https://open-eo.github.io/openeo-api/v/0.4.1/apireference-subscriptions/
	 * 
	 */
	subscribe(topic, callback, parameters = {}) {
		this.subscriptionsObject.subscribe(topic, parameters, callback);
	}

	/**
	 * Unsubscribes from a topic.
	 * 
	 * @param {string} topic - The topic to unsubscribe from.
	 * @param {object} [parameters={}] - Parameters that have been used to subsribe to the topic.
	 * @throws {Error}
	 * @see Subscriptions.unsubscribe()
	 * @see https://open-eo.github.io/openeo-api/v/0.4.1/apireference-subscriptions/
	 * 
	 */
	unsubscribe(topic, parameters = {}) {
		this.subscriptionsObject.unsubscribe(topic, parameters);
	}
}

/**
 * Web-Socket-based Subscriptions.
 * 
 * @class
 */
class Subscriptions {

	/**
	 * Creates a new object that handles the subscriptions.
	 * 
	 * @param {Connection} httpConnection 
	 */
	constructor(httpConnection) {
		this.httpConnection = httpConnection;
		this.socket = null;
		this.listeners = new Map();
		this.supportedTopics = [];
		this.messageQueue = [];
		this.websocketProtocol = "openeo-v0.4";
	}

	/**
	 * A callback that is executed when a message for the corresponding topic is received by the client.
	 * 
	 * @callback incomingMessageCallback
	 * @param {object} payload
	 * @param {string} payload.issued - Date and time when the message was sent, formatted as a RFC 3339 date-time. 
	 * @param {string} payload.topic - The type of the topic, e.g. `openeo.jobs.debug`
	 * @param {object} message - A message, usually an object with some properties. Depends on the topic.
	 * @see https://open-eo.github.io/openeo-api/v/0.4.1/apireference-subscriptions/
	 */

	/**
	 * Subscribes to a topic.
	 * 
	 * @param {string} topic - The topic to subscribe to.
	 * @param {incomingMessageCallback} callback - A callback that is executed when a message for the topic is received.
	 * @param {object} [parameters={}] - Parameters for the subscription request, for example a job id.
	 * @throws {Error}
	 * @see https://open-eo.github.io/openeo-api/v/0.4.1/apireference-subscriptions/
	 */
	subscribe(topic, callback, parameters = {}) {
		if (typeof callback !== 'function') {
			throw new Error("No valid callback specified.");
		}

		if(!this.listeners.has(topic)) {
			this.listeners.set(topic, new Map());
		}
		this.listeners.get(topic).set(Util.hash(parameters), callback);

		this._sendSubscription('subscribe', topic, parameters);
	}

	/**
	 * Unsubscribes from a topic.
	 * 
	 * @param {string} topic - The topic to unsubscribe from.
	 * @param {object} [parameters={}] - Parameters that have been used to subsribe to the topic.
	 * @throws {Error}
	 * @see https://open-eo.github.io/openeo-api/v/0.4.1/apireference-subscriptions/
	 */
	unsubscribe(topic, parameters = {}) {
		// get all listeners for the topic
		let topicListeners = this.listeners.get(topic);

		// remove the applicable sub-callback
		if(!(topicListeners instanceof Map)) {
			throw new Error("this.listeners must be a Map of Maps");
		}

		topicListeners.delete(Util.hash(parameters));
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
		// @todo Add error handling
		let json = JSON.parse(event.data);
		if (json.message.topic == 'openeo.welcome') {
			this.supportedTopics = json.payload.topics;
		}
		else {
			// get listeners for topic
			let topicListeners = this.listeners.get(json.message.topic);
			let callback;
			// we should now have a Map in which to look for the correct listener
			// @todo It is not very elegant to check for hard-coded parameters.
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

/**
 * Capabilities of a back-end.
 * 
 * @class
 */
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
		const featureMap = {
			capabilities: 'GET /',
			listFileTypes: 'GET /output_formats',
			listServiceTypes: 'GET /service_types',
			listUdfRuntimes: `Get /udf_runtimes`,
			listCollections: 'GET /collections',
			describeCollection: 'GET /collections/{collection_id}',
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
			openFile: 'PUT /files/{user_id}/{path}',
			uploadFile: 'PUT /files/{user_id}/{path}',
			deleteFile: 'DELETE /files/{user_id}/{path}',
			getJobById: 'GET /jobs/{job_id}',
			describeJob: 'GET /jobs/{job_id}',
			updateJob: 'PATCH /jobs/{job_id}',
			deleteJob: 'DELETE /jobs/{job_id}',
			estimateJob: 'GET /jobs/{job_id}/estimate',
			startJob: 'POST /jobs/{job_id}/results',
			stopJob: 'DELETE /jobs/{job_id}/results',
			listResults: 'GET /jobs/{job_id}/results',
			downloadResults: 'GET /jobs/{job_id}/results',
			describeProcessGraph: 'GET /process_graphs/{process_graph_id}',
			getProcessGraphById: 'GET /process_graphs/{process_graph_id}',
			updateProcessGraph: 'PATCH /process_graphs/{process_graph_id}',
			deleteProcessGraph: 'DELETE /process_graphs/{process_graph_id}',
			describeService: 'GET /services/{service_id}',
			getServiceById: 'GET /services/{service_id}',
			updateService: 'PATCH /services/{service_id}',
			deleteService: 'DELETE /services/{service_id}',
			subscribe: 'GET /subscription',
			unsubscribe: 'GET /subscription'
		};
		
		// regex-ify to allow custom parameter names
		for(let key in featureMap) {
			featureMap[key] = featureMap[key].replace(/{[^}]+}/, '{[^}]+}');
		}

		return this.data.endpoints
			.map((e) => e.methods.map((method) => method + ' ' + e.path))
			// .flat(1)   // does exactly what we want, but (as of Sept. 2018) not yet part of the standard...
			.reduce((a, b) => a.concat(b), [])  // ES6-proof version of flat(1)
			.some((e) => (e.toUpperCase() === featureMap[methodName].toUpperCase()));
	}

	currency() {
		return (this.data.billing ? this.data.billing.currency : null);
	}

	listPlans() {
		return (this.data.billing ? this.data.billing.plans : null);
	}
}


/**
 * The base class for entities such as Job, Process Graph, Service etc.
 * 
 * @class
 * @abstract
 */
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

	_supports(feature) {
		return this.connection.capabilities().hasFeature(feature);
	}

}

/**
 * A File on the user workspace.
 * 
 * @class
 * @extends BaseEntity
 */
class File extends BaseEntity {

	constructor(connection, userId, path) {
		super(connection, ["path", "size", "modified"]);
		this.userId = userId;
		this.path = path;
	}

	// If target is null, returns promise with data as stream in node environment, blob in browser.
	// Otherwise writes downloaded file to target.
	async downloadFile(target = null) {
		let response = await this.connection.download('/files/' + this.userId + '/' + this.path, true);
		if (target === null) {
			return response.data;
		}
		else {
			return await this._saveToFile(response.data, target);
		}
	}

	async _saveToFile(data, filename) {
		if (isNode) {
			return await Util.saveToFileNode(data, filename);
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
	async uploadFile(source, statusCallback = null) {
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

		let response = await this.connection._send(options);
		return this.setAll(response.data);
	}

	async deleteFile() {
		return await this.connection._delete('/files/' + this.userId + '/' + this.path);
	}
}

/**
 * A Batch Job.
 * 
 * @class
 * @extends BaseEntity
 */
class Job extends BaseEntity {
	constructor(connection, jobId) {
		super(connection, ["id", "title", "description", ["process_graph", "processGraph"], "status", "progress", "error", "submitted", "updated", "plan", "costs", "budget"]);
		this.jobId = jobId;
	}

	async describeJob() {
		let response = await this.connection._get('/jobs/' + this.jobId);
		return this.setAll(response.data);
	}

	async updateJob(parameters) {
		await this.connection._patch('/jobs/' + this.jobId, parameters);
		if (this._supports('describeJob')) {
			return await this.describeJob();
		}
		else {
			return this.setAll(parameters);
		}
	}

	async deleteJob() {
		return await this.connection._delete('/jobs/' + this.jobId);
	}

	async estimateJob() {
		let response = await this.connection._get('/jobs/' + this.jobId + '/estimate');
		return response.data;
	}

	async startJob() {
		await this.connection._post('/jobs/' + this.jobId + '/results', {});
		if (this._supports('describeJob')) {
			return await this.describeJob();
		}
		return this;
	}

	async stopJob() {
		await this.connection._delete('/jobs/' + this.jobId + '/results');
		if (this._supports('describeJob')) {
			return await this.describeJob();
		}
		return this;
	}

	async listResults(type = 'json') {
		if (type.toLowerCase() != 'json') {
			throw new Error("'"+type+"' is not supported by the client, please use JSON.");
		}

		let response = await this.connection._get('/jobs/' + this.jobId + '/results');
		// Returning null for missing headers is not strictly following the spec
		let headerData = {
			costs: response.headers['openeo-costs'] || null,
			expires: response.headers['expires'] || null
		};
		return Object.assign(headerData, response.data);
	}

	// Note: targetFolder must exist!
	async downloadResults(targetFolder) {
		if (isNode) {
			let list = await this.listResults();
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

			await Promise.all(promises);
			return files;
		}
		else {
			/* istanbul ignore next */
			throw new Error("downloadResults is not supported in a browser environment.");
		}
	}
}

/**
 * A Stored Process Graph.
 * 
 * @class
 * @extends BaseEntity
 */
class ProcessGraph extends BaseEntity {
	constructor(connection, processGraphId) {
		super(connection, ["id", "title", "description", ["process_graph", "processGraph"]]);
		this.connection = connection;
		this.processGraphId = processGraphId;
	}

	async describeProcessGraph() {
		let response = await this.connection._get('/process_graphs/' + this.processGraphId);
		return this.setAll(response.data);
	}

	async updateProcessGraph(parameters) {
		await this.connection._patch('/process_graphs/' + this.processGraphId, parameters);
		if (this._supports('describeProcessGraph')) {
			return this.describeProcessGraph();
		}
		else {
			return this.setAll(parameters);
		}
	}

	async deleteProcessGraph() {
		return await this.connection._delete('/process_graphs/' + this.processGraphId);
	}
}

/**
 * A Secondary Web Service.
 * 
 * @class
 * @extends BaseEntity
 */
class Service extends BaseEntity {

	constructor(connection, serviceId) {
		super(connection, ["id", "title", "description", ["process_graph", "processGraph"], "url", "type", "enabled", "parameters", "attributes", "submitted", "plan", "costs", "budget"]);
		this.serviceId = serviceId;
	}

	async describeService() {
		let response = await this.connection._get('/services/' + this.serviceId);
		return this.setAll(response.data);
	}

	async updateService(parameters) {
		await this.connection._patch('/services/' + this.serviceId, parameters);
		if (this._supports('describeService')) {
			return await this.describeService();
		}
		else {
			return this.setAll(parameters);
		}
	}

	async deleteService() {
		return await this.connection._delete('/services/' + this.serviceId);
	}
}

/**
 * Utilities for the openEO JS Client.
 * 
 * @class
 * @hideconstructor
 */
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

	/**
	 * 
	 * @param {*} b
	 * @see https://en.wikipedia.org/wiki/Jenkins_hash_function
	 */
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

	static async saveToFileNode(data, filename) {
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
	/**
	 * 
	 * @param {*} data 
	 * @param {*} filename 
	 * @see https://github.com/kennethjiang/js-file-download/blob/master/file-download.js
	 */
	static saveToFileBrowser(data, filename) {
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
		// @todo This is a quite dumb sorting algorithm for version numbers, improve!
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

/** @module OpenEO */
let toExport = {
	OpenEO: OpenEO,
	Util: Util
};

/*
 * @see https://www.matteoagosti.com/blog/2013/02/24/writing-javascript-modules-for-both-browser-and-node/
 */
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
