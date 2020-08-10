const Utils = require('@openeo/js-commons/src/utils');

/**
 * Interface to loop through the logs
 * 
 * @class
 */
class Logs {

	constructor(connection, endpoint) {
		this.connection = connection;
		this.endpoint = endpoint;
		this.lastId = "";
	}

	/**
	 * Retrieves the next log entries since the last request.
	 * 
	 * Retrieves log entries only.
	 * 
	 * @async
	 * @param {integer} limit - The number of log entries to retrieve per request.
	 * @returns {object[]}
	 */
	async nextLogs(limit = null) {
		let response = await this.next(limit);
		return Array.isArray(response.logs) ? response.logs : [];
	}

	/**
	 * Retrieves the next log entries since the last request.
	 * 
	 * Retrieves the full response compliant to the API, including log entries and links.
	 * 
	 * @async
	 * @param {integer} limit - The number of log entries to retrieve per request.
	 * @returns {object}
	 */
	async next(limit = null) {
		let query = {
			offset: this.lastId
		};
		if (limit > 0) {
			query.limit = limit;
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
		return response.data;
	}

}

module.exports = Logs;
