const Connection = require("../connection");
const OgcCapabilities = require("./capabilities");
const Environment = require('../env');
const Migrate = require("./migrate");

/**
 * A connection to an OGC API back-end.
 */
class OgcConnection extends Connection {

	/**
	 * Creates a new Connection.
	 * 
	 * @param {string} data - The contents of the landing page.
	 * @param {string} baseUrl - The versioned URL or the back-end instance.
	 * @param {Options} [options={}] - Additional options for the connection.
	 */
	constructor(data, baseUrl, options = {}) {
		super(baseUrl, options);
		this.capabilitiesObject = new OgcCapabilities(data);
	}

	/**
	 * Executes a process synchronously and returns the result as the response.
	 * 
	 * Please note that requests can take a very long time of several minutes or even hours.
	 * 
	 * @async
	 * @param {Process} process - A user-defined process.
	 * @param {?AbortController} [abortController=null] - An AbortController object that can be used to cancel the processing request.
	 * @param {object.<string, *>} [additional={}] - Other parameters to pass for processing, e.g. `plan`, `budget`, and `log_level`.
	 * @returns {Promise<SyncResult>} - An object with the data and some metadata.
	 */
	async computeResult(process, abortController = null, additional = {}) {
		const openEO = this._normalizeUserProcess(
			process,
			Object.assign({}, additional)
		);
		let mode = null;
		const p = Object.values(openEO.process.process_graph).find(v => {
			const spec = this.processes.get(v.process_id);
			if (Array.isArray(spec.jobControlOptions) && spec.jobControlOptions.includes("async-execute")) {
				mode = 'async';
			}
			return Boolean(spec && spec.ogcapi);
		});
		const requestBody = Migrate.executeSync(this, openEO);
		const headers = {};
		if (mode === 'async') {
			headers.Prefer = 'respond-async';
		}
		const response = await this._post(`/processes/${p.process_id}/execution`, requestBody, Environment.getResponseType(), abortController, headers);
		const syncResult = {
			data: response.data,
			costs: null,
			type: null,
			logs: []
		};
		
		if (typeof response.headers['content-type'] === 'string') {
			syncResult.type = response.headers['content-type'];
		}

		return syncResult;
	}

	/**
	 * Checks whether the axios response is for a specific endpoint and method.
	 *
	 * @param {AxiosResponse} response 
	 * @param {string} method - Lower-cased HTTP method, e.g. `get`
	 * @param {string} endpoint - Endpoint path, e.g. `/collections`
	 * @returns {boolean}
	 * @private
	 */
	_isEndpoint(response, method, endpoint) {
		if (response.config.method !== method) {
			return false;
		}
		if (endpoint.includes('{}')) {
			let pattern = '^' + endpoint.replace('{}', '[^/]+') + '$';
			let regex = new RegExp(pattern);
			return regex.test(response.config.url);
		}
		return endpoint === response.config.url;
	}

	/**
	 * Applies some common migrations to the response.
	 * 
	 * For example to update between versions or API flavours.
	 * 
	 * @param {AxiosResponse} response 
	 * @returns {AxiosResponse}
	 */
	_migrate(response) {
		if (this._isEndpoint(response, 'get', '/collections')) {
			response.data.collections = response.data.collections.map(collection => Migrate.collection(collection, response));
		}
		else if (this._isEndpoint(response, 'get', '/collections/{}')) {
			response.data = Migrate.collection(response.data, response);
		}
		else if (this._isEndpoint(response, 'get', '/processes')) {
			response.data.processes = response.data.processes.map(process => Migrate.process(process, response));
		}
		else if (this._isEndpoint(response, 'get', '/jobs')) {
			response.data.jobs = response.data.jobs.map(job => Migrate.job(job, response));
		}
		else if (this._isEndpoint(response, 'get', '/jobs/{}')) {
			response.data = Migrate.job(response.data, response);
		}

		response = Migrate.all(response);
		
		return response;
	}

}

module.exports = OgcConnection;