const Environment = require('./env');
const Utils = require('@openeo/js-commons/src/utils');
const axios = require('axios');

const { BasicProvider, OidcProvider } = require('./authprovider');
const Capabilities = require('./capabilities');
const FileTypes = require('./filetypes');
const UserFile = require('./file');
const Job = require('./job');
const UserProcess = require('./userprocess');
const Service = require('./service');

const Builder = require('./builder/builder');
const BuilderNode = require('./builder/node');

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
	 * @constructor
	 */
	constructor(baseUrl) {
		this.baseUrl = Utils.normalizeUrl(baseUrl);
		this.authProviderList = null;
		this.authProvider = null;
		this.capabilitiesObject = null;
		this.processes = null;
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
		let response = await this._get('/file_formats');
		return new FileTypes(response.data);
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
	 * @param {string} collectionId - Collection ID to request further metadata for.
	 * @returns {object} - A response compatible to the API specification.
	 * @throws {Error}
	 */
	async describeCollection(collectionId) {
		let response = await this._get('/collections/' + collectionId);
		return response.data;
	}

	/**
	 * List all processes available on the back-end.
	 * 
	 * Data is cached in memory.
	 * 
	 * @async
	 * @returns {object} - A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listProcesses() {
		if (this.processes === null) {
			let response = await this._get('/processes');
			this.processes = response.data;
		}
		return this.processes;
	}

	/**
	 * Get information about a single process.
	 * 
	 * @async
	 * @param {string} processId - Collection ID to request further metadata for.
	 * @returns {object|null} - A single process as object, or `null` if none is found.
	 * @throws {Error}
	 * @see listProcesses()
	 */
	async describeProcess(processId) {
		let response = await this.listProcesses();
		if (Array.isArray(response.processes)) {
			let process = response.processes.filter(process => process.id === processId);
			if (process.length > 0) {
				return process[0];
			}
		}
		return null;
	}

	/**
	 * Returns an object to simply build user-defined processes.
	 * 
	 * @async
	 * @param {string} id - A name for the process.
	 * @returns {Builder}
	 * @throws {Error}
	 * @see listProcesses()
	 */
	async buildProcess(id) {
		let response = await this.listProcesses();
		return new Builder(response.processes, null, id);
	}

	/**
	 * List all authentication methods supported by the back-end.
	 * 
	 * @async
	 * @returns {array} An array containing all supported AuthProviders (including all OIDC providers and HTTP Basic).
	 * @throws {Error}
	 */
	async listAuthProviders() {
		if (this.authProviderList !== null) {
			return this.authProviderList;
		}

		this.authProviderList = [];
		let cap = this.capabilities();

		// Add OIDC providers
		if (cap.hasFeature('authenticateOIDC') && OidcProvider.isSupported()) {
			let res = await this._get('/credentials/oidc');
			if (Utils.isObject(res.data) && Array.isArray(res.data.providers)) {
				for(let i in res.data.providers) {
					this.authProviderList.push(new OidcProvider(this, res.data.providers[i]));
				}
			}
		}
		
		// Add Basic provider
		if (cap.hasFeature('authenticateBasic')) {
			this.authProviderList.push(new BasicProvider(this));
		}

		return this.authProviderList;
	}

	// Deprecated
	async authenticateBasic(username, password) {
		let basic = new BasicProvider(this);
		await basic.login(username, password);
	}

	/**
	 * Returns whether the user is authenticated (logged in) at the back-end or not.
	 * 
	 * @returns {boolean} `true` if authenticated, `false` if not.
	 */
	isAuthenticated() {
		return (this.authProvider !== null);
	}

	getAuthProvider() {
		return this.authProvider;
	}

	/**
	 * Get information about the authenticated user.
	 * 
	 * Updates the User ID if available.
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
	 * @returns {File[]} A list of files.
	 * @throws {Error}
	 */
	async listFiles() {
		let response = await this._get('/files');
		return response.data.files.map(
			f => new UserFile(this, f.path).setAll(f)
		);
	}


	/**
	 * A callback that is executed on upload progress updates.
	 * 
	 * @callback uploadStatusCallback
	 * @param {number} percentCompleted - The percent (0-100) completed.
	 */

	/**
	 * Uploads a file to the user workspace.
	 * If a file with the name exists, overwrites it.
	 * 
	 * This method has different behaviour depending on the environment.
	 * In a nodeJS environment the source must be a path to a file as string.
	 * In a browser environment the source must be an object from a file upload form.
	 * 
	 * @async
	 * @param {string|object} source - The source, see method description for details.
	 * @param {string|null} [targetPath=null] - The target path on the server, relative to the user workspace. Defaults to the file name of the source file.
	 * @param {uploadStatusCallback|null} [statusCallback=null] - Optionally, a callback that is executed on upload progress updates.
	 * @returns {File}
	 * @throws {Error}
	 */
	async uploadFile(source, targetPath = null, statusCallback = null) {
		if (targetPath === null) {
			targetPath = Environment.fileNameForUpload(source);
		}
		let file = await this.getFile(targetPath);
		return await file.uploadFile(source, statusCallback);
	}

	/**
	 * Opens a (existing or non-existing) file without reading any information or creating a new file at the back-end. 
	 * 
	 * @async
	 * @param {string} path - Path to the file, relative to the user workspace.
	 * @returns {File} A file.
	 * @throws {Error}
	 */
	async getFile(path) {
		return new UserFile(this, path);
	}

	_normalizeUserProcess(process, additional = {}) {
		if (process instanceof UserProcess) {
			process = process.toJSON();
		}
		else if (process instanceof BuilderNode) {
			process.result = true;
			process = process.parent.toJSON();
		}
		else if (Utils.isObject(process) && !Utils.isObject(process.process_graph)) {
			process = {
				process_graph: process
			};
		}
		return Object.assign({}, additional, {process: process});
	}

	/**
	 * Validates a user-defined process at the back-end.
	 * 
	 * @async
	 * @param {object} process - User-defined process to validate.
	 * @returns {Object[]} errors - A list of API compatible error objects. A valid process returns an empty list.
	 * @throws {Error}
	 */
	async validateProcess(process) {
		let response = await this._post('/validation', this._normalizeUserProcess(process).process);
		if (Array.isArray(response.data.errors)) {
			return response.data.errors;
		}
		else {
			throw new Error("Invalid validation response received.");
		}
	}

	/**
	 * Lists all user-defined processes of the authenticated user.
	 * 
	 * @async
	 * @returns {UserProcess[]} A list of user-defined processes.
	 * @throws {Error}
	 */
	async listUserProcesses() {
		let response = await this._get('/process_graphs');
		return response.data.processes.map(
			pg => new UserProcess(this, pg.id).setAll(pg)
		);
	}

	/**
	 * Creates a new stored user-defined process at the back-end.
	 * 
	 * @async
	 * @param {string} id - Unique identifier for the process.
	 * @param {object} process - A user-defined process.
	 * @returns {UserProcess} The new user-defined process.
	 * @throws {Error}
	 */
	async setUserProcess(id, process) {
		let pg = new UserProcess(this, id);
		return await pg.replaceUserProcess(process);
	}

	/**
	 * Get all information about a user-defined process.
	 * 
	 * @async
	 * @param {string} id - Identifier of the user-defined process. 
	 * @returns {UserProcess} The user-defined process.
	 * @throws {Error}
	 */
	async getUserProcess(id) {
		let pg = new UserProcess(this, id);
		return await pg.describeUserProcess();
	}

	/**
	 * @typedef SyncResult
	 * @type {Object}
	 * @property {Stream|Blob} data - The data as `Stream` in NodeJS environments or as `Blob` in browsers.
	 * @property {number|null} costs - The costs for the request in the currency exposed by the back-end.
	 * @property {array} logs - Array of log entries as specified in the API.
	 */

	/**
	 * Executes a process synchronously and returns the result as the response.
	 * 
	 * Please note that requests can take a very long time of several minutes or even hours.
	 * 
	 * @async
	 * @param {object} process - A user-defined process.
	 * @param {string} [plan=null] - The billing plan to use for this computation.
	 * @param {number} [budget=null] - The maximum budget allowed to spend for this computation.
	 * @returns {SyncResult} - An object with the data and some metadata.
	 */
	async computeResult(process, plan = null, budget = null) {
		let requestBody = this._normalizeUserProcess(
			process,
			{
				plan: plan,
				budget: budget
			}
		);
		let response = await this._post('/result', requestBody, Environment.getResponseType());
		let syncResult = {
			data: response.data,
			costs: null,
			logs: []
		};
		
		if (typeof response.headers['openeo-costs'] === 'number') {
			syncResult.costs = response.headers['openeo-costs'];
		}

		let links = Array.isArray(response.headers.link) ? response.headers.link : [response.headers.link];
		for(let link of links) {
			if (typeof link !== 'string') {
				continue;
			}
			let logs = link.match(/^<([^>]+)>;\s?rel="monitor"/i);
			if (Array.isArray(logs) && logs.length > 1) {
				try {
					let logsResponse = await this._get(logs[1]);
					if (Utils.isObject(logsResponse.data) && Array.isArray(logsResponse.data.logs)) {
						syncResult.logs = logsResponse.data.logs;
					}
				} catch(error) {
					console.warn(error);
				}
			}
		}

		return syncResult;
	}

	/**
	 * Executes a process synchronously and downloads to result the given path.
	 * 
	 * Please note that requests can take a very long time of several minutes or even hours.
	 * 
	 * This method has different behaviour depending on the environment.
	 * If a NodeJs environment, writes the downloaded file to the target location on the file system.
	 * In a browser environment, offers the file for downloading using the specified name (folders are not supported).
	 * 
	 * @async
	 * @param {object} process - A user-defined process.
	 * @param {string} target - The target, see method description for details.
	 * @param {string} [plan=null] - The billing plan to use for this computation.
	 * @param {number} [budget=null] - The maximum budget allowed to spend for this computation.
	 * @throws {Error}
	 */
	async downloadResult(process, targetPath, plan = null, budget = null) {
		let response = await this.computeResult(process, plan, budget);
		await Environment.saveToFile(response.data, targetPath);
	}

	/**
	 * Lists all batch jobs of the authenticated user.
	 * 
	 * @async
	 * @returns {Job[]} A list of jobs.
	 * @throws {Error}
	 */
	async listJobs() {
		let response = await this._get('/jobs');
		return response.data.jobs.map(
			j => new Job(this, j.id).setAll(j)
		);
	}

	/**
	 * Creates a new batch job at the back-end.
	 * 
	 * @async
	 * @param {object} process - A user-define process to execute.
	 * @param {string} [title=null] - A title for the batch job.
	 * @param {string} [description=null] - A description for the batch job.
	 * @param {string} [plan=null] - The billing plan to use for this batch job.
	 * @param {number} [budget=null] - The maximum budget allowed to spend for this batch job.
	 * @param {object} [additional={}] - Proprietary parameters to pass for the batch job.
	 * @returns {Job} The stored batch job.
	 * @throws {Error}
	 */
	async createJob(process, title = null, description = null, plan = null, budget = null, additional = {}) {
		additional = Object.assign({}, additional, {
			title: title,
			description: description,
			plan: plan,
			budget: budget
		});
		let requestBody = this._normalizeUserProcess(process, additional);
		let response = await this._post('/jobs', requestBody);
		let job = new Job(this, response.headers['openeo-identifier']).setAll(requestBody);
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
	async getJob(id) {
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
		let response = await this._get('/services');
		return response.data.services.map(
			s => new Service(this, s.id).setAll(s)
		);
	}

	/**
	 * Creates a new secondary web service at the back-end. 
	 * 
	 * @async
	 * @param {object} process - A user-defined process.
	 * @param {string} type - The type of service to be created (see `Connection.listServiceTypes()`).
	 * @param {string} [title=null] - A title for the service.
	 * @param {string} [description=null] - A description for the service.
	 * @param {boolean} [enabled=true] - Enable the service (`true`, default) or not (`false`).
	 * @param {object} [configuration={}] - Configuration parameters to pass to the service.
	 * @param {string} [plan=null] - The billing plan to use for this service.
	 * @param {number} [budget=null] - The maximum budget allowed to spend for this service.
	 * @param {object} [additional={}] - Proprietary parameters to pass for the batch job.
	 * @returns {Service} The stored service.
	 * @throws {Error}
	 */
	async createService(process, type, title = null, description = null, enabled = true, configuration = {}, plan = null, budget = null, additional = {}) {
		let requestBody = this._normalizeUserProcess(process, {
			title: title,
			description: description,
			type: type,
			enabled: enabled,
			configuration: configuration,
			plan: plan,
			budget: budget
		}, additional);
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
	async getService(id) {
		let service = new Service(this, id);
		return await service.describeService();
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

	async _put(path, body) {
		return await this._send({
			method: 'put',
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

	/**
	 * Downloads data from a URL.
	 * 
	 * May include authorization details where required.
	 * 
	 * @param {string} url - An absolute or relative URL to download data from.
	 * @param {boolean} authorize - Send authorization details (`true`) or not (`false`).
	 * @returns {Stream|Blob} - Returns the data as `Stream` in NodeJS environments or as `Blob` in browsers
	 */
	async download(url, authorize) {
		return await this._send({
			method: 'get',
			responseType: Environment.getResponseType(),
			url: url,
			withCredentials: authorize
		});
	}

	async _send(options) {
		options.baseURL = this.baseUrl;
		if (this.isAuthenticated() && (typeof options.withCredentials === 'undefined' || options.withCredentials === true)) {
			options.withCredentials = true;
			if (!options.headers) {
				options.headers = {};
			}
			options.headers.Authorization = 'Bearer ' + this.authProvider.getToken();
		}
		if (!options.responseType) {
			options.responseType = 'json';
		}

		try {
			return await axios(options);
		} catch(error) {
			if (Utils.isObject(error.response) && Utils.isObject(error.response.data) && ((typeof error.response.data.type === 'string' && error.response.data.type.indexOf('/json') !== -1) || (Utils.isObject(error.response.data.headers) && typeof error.response.data.headers['content-type'] === 'string' && error.response.data.headers['content-type'].indexOf('/json') !== -1))) {
				if (options.responseType === Environment.getResponseType()) {
					// JSON error responses are Blobs and streams if responseType is set as such, so convert to JSON if required.
					// See: https://github.com/axios/axios/issues/815
					return Environment.handleErrorResponse(error);
				}
			}
			// Re-throw error if it was not handled yet.
			throw error;
		}
	}
}

module.exports = Connection;
