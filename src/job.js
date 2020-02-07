import Environment from '@openeo/js-environment';
import BaseEntity from './baseentity';

/**
 * A Batch Job.
 * 
 * @class
 * @extends BaseEntity
 */
export default class Job extends BaseEntity {

	/**
	 * Creates an object representing a batch job stored at the back-end.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {string} jobId - The batch job ID.
	 * @constructor
	 */
	constructor(connection, jobId) {
		super(connection, ["id", "title", "description", ["process_graph", "processGraph"], "status", "progress", "error", "submitted", "updated", "plan", "costs", "budget"]);
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
	 * Retrieves download links and additional information about the batch job.
	 * 
	 * NOTE: Requesting metalink XML files is currently not supported by the JS client.
	 * 
	 * @async
	 * @returns {object} The JSON-based response compatible to the API specification, but also including `costs` and `expires` properties as received in the headers (or `null` if not present).
	 * @throws {Error}
	 */
	async listResults() {
		let response = await this.connection._get('/jobs/' + this.jobId + '/results');
		// Returning null for missing headers is not strictly following the spec
		let headerData = {
			costs: response.headers['openeo-costs'] || null,
			expires: response.headers.expires || null
		};
		return Object.assign(headerData, response.data);
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
		return await Environment.downloadResults(list, targetFolder);
	}
}