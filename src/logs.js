const Utils = require('@openeo/js-commons/src/utils');

/**
 * Interface to loop through the logs.
 */
class Logs {

	/**
	 * Creates a new Logs instance to retrieve logs from a back-end.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {string} endpoint - The relative endpoint to request the logs from, usually `/jobs/.../logs` or `/services/.../logs` with `...` being the actual job or service id.
	 * @param {?string} [level=null] - Minimum level of logs to return.
	 */
	constructor(connection, endpoint, level = null) {
		/**
		 * @protected
		 * @type {Connection}
		 */
		this.connection = connection;
		/**
		 * @protected
		 * @type {string}
		 */
		this.endpoint = endpoint;
		/**
		 * @protected
		 * @type {string}
		 */
		this.lastId = "";
		/**
		 * @protected
		 * @type {?string}
		 */
		this.level = level;
		/**
		 * @protected
		 * @type {Set<String>}
		 */
		this.missing = new Set();
	}

	/**
	 * Retrieves the next log entries since the last request.
	 * 
	 * Retrieves log entries only.
	 * 
	 * @async
	 * @param {number} limit - The number of log entries to retrieve per request, as integer.
	 * @returns {Promise<Array.<Log>>}
	 */
	async nextLogs(limit = null) {
		let response = await this.next(limit);
		return Array.isArray(response.logs) ? response.logs : [];
	}

	/**
	 * Retrieves the backend identifiers that are (partially) missing in the logs.
	 * 
	 * This is only filled after the first request using `nextLogs` or `next`.
	 * 
	 * @returns {Array.<string>}
	 * @see {Logs#nextLogs}
	 * @see {Logs#next}
	 */
	getMissingBackends() {
		return Array.from(this.missing);
	}

	/**
	 * Retrieves the next log entries since the last request.
	 * 
	 * Retrieves the full response compliant to the API, including log entries and links.
	 * 
	 * @async
	 * @param {number} limit - The number of log entries to retrieve per request, as integer.
	 * @returns {Promise<LogsAPI>}
	 */
	async next(limit = null) {
		let query = {
			offset: this.lastId
		};
		if (limit > 0) {
			query.limit = limit;
		}
		if (this.level) {
			query.level = this.level;
		}
		let response = await this.connection._get(this.endpoint, query);
		if (Array.isArray(response.data.logs) && response.data.logs.length > 0) {
			response.data.logs = response.data.logs.filter(log => Utils.isObject(log) && typeof log.id === 'string');
			this.lastId = response.data.logs[response.data.logs.length - 1].id;
		}
		else {
			response.data.logs = [];
		}

		response.data.links = Array.isArray(response.data.links) ? response.data.links : [];

		if (Array.isArray(response.data["federation:missing"])) {
			response.data["federation:missing"].forEach(backend => this.missing.add(backend));
		}

		return response.data;
	}

}

module.exports = Logs;
