const Environment = require('./env');
const BaseEntity = require('./baseentity');
const Utils = require('@openeo/js-commons/src/utils');

/**
 * A Batch Job.
 * 
 * @class
 * @extends BaseEntity
 */
module.exports = class Job extends BaseEntity {

	/**
	 * Creates an object representing a batch job stored at the back-end.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {string} jobId - The batch job ID.
	 * @constructor
	 */
	constructor(connection, jobId) {
		super(connection, ["id", "title", "description", "process", "status", "progress", "error", "created", "updated", "plan", "costs", "budget"]);
		this.jobId = jobId;
	}

	/**
	 * Updates the batch job data stored in this object by requesting the metadata from the back-end.
	 * 
	 * @async
	 * @returns {Job} The update job object (this).
	 * @throws {Error}
	 */
	async describeJob() {
		let response = await this.connection._get('/jobs/' + this.jobId);
		return this.setAll(response.data);
	}

	/**
	 * Modifies the batch job at the back-end and afterwards updates this object, too.
	 * 
	 * @async
	 * @param {object} parameters - An object with properties to update, each of them is optional, but at least one of them must be specified. Additional properties can be set if the server supports them.
	 * @param {object} parameters.processGraph - A new process graph.
	 * @param {string} parameters.title - A new title.
	 * @param {string} parameters.description - A new description.
	 * @param {string} parameters.plan - A new plan.
	 * @param {number} parameters.budget - A new budget.
	 * @returns {Job} The updated job object (this).
	 * @throws {Error}
	 */
	async updateJob(parameters) {
		await this.connection._patch('/jobs/' + this.jobId, this._convertToRequest(parameters));
		if (this._supports('describeJob')) {
			return await this.describeJob();
		}
		else {
			return this.setAll(parameters);
		}
	}

	/**
	 * Deletes the batch job from the back-end.
	 * 
	 * @async
	 * @throws {Error}
	 */
	async deleteJob() {
		await this.connection._delete('/jobs/' + this.jobId);
	}

	/**
	 * Calculate an estimate (potentially time/costs/volume) for a batch job.
	 * 
	 * @async
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async estimateJob() {
		let response = await this.connection._get('/jobs/' + this.jobId + '/estimate');
		return response.data;
	}

	/**
	 * Get logs for the batch job from the back-end.
	 * 
	 * @async
	 * @throws {Error}
	 */
	async debugJob() {
		let response = await this.connection._get('/jobs/' + this.jobId + '/logs');
		return Array.isArray(response.data.logs) ? response.data.logs : [];
	}

	/**
	 * Starts / queues the batch job for processing at the back-end.
	 * 
	 * @async
	 * @returns {Job} The updated job object (this).
	 * @throws {Error}
	 */
	async startJob() {
		await this.connection._post('/jobs/' + this.jobId + '/results', {});
		if (this._supports('describeJob')) {
			return await this.describeJob();
		}
		return this;
	}

	/**
	 * Stops / cancels the batch job processing at the back-end.
	 * 
	 * @async
	 * @returns {Job} The updated job object (this).
	 * @throws {Error}
	 */
	async stopJob() {
		await this.connection._delete('/jobs/' + this.jobId + '/results');
		if (this._supports('describeJob')) {
			return await this.describeJob();
		}
		return this;
	}

	/**
	 * Retrieves the STAC Item produced for the job results.
	 * 
	 * @async
	 * @returns {object} The JSON-based response compatible to the API specification, but also including a `costs` property if present in the headers.
	 * @throws {Error}
	 */
	async getResultsAsItem() {
		let response = await this.connection._get('/jobs/' + this.jobId + '/results');
		let data = response.data;
		if (!Utils.isObject(data.properties)) {
			data.properties = {};
		}
		if (!Utils.isObject(data.assets)) {
			data.assets = {};
		}
		if (typeof response.headers['openeo-costs'] === 'number') {
			data.properties.costs = response.headers['openeo-costs'];
		}

		return data;
	}

	/**
	 * Retrieves download links.
	 * 
	 * @async
	 * @returns {object} A list of links (object with href, rel, title and type).
	 * @throws {Error}
	 */
	async listResults() {
		let item = await this.getResultsAsItem();
		if (Utils.isObject(item.assets)) {
			return Object.values(item.assets);
		}
		else {
			return {};
		}
	}

	/**
	 * Downloads the results to the specified target folder. The specified target folder must already exist!
	 * 
	 * NOTE: This method is only supported in a NodeJS environment. In a browser environment this method throws an exception!
	 * 
	 * @async
	 * @param {string} targetFolder - A target folder to store the file to, which must already exist.
	 * @returns {string[]} A list of file paths of the newly created files.
	 * @throws {Error}
	 */
	async downloadResults(targetFolder) {
		let list = await this.listResults();
		return await Environment.downloadResults(this.connection, list, targetFolder);
	}
};