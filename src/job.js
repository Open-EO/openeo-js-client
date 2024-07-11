const Environment = require('./env');
const BaseEntity = require('./baseentity');
const Logs = require('./logs');
const Utils = require('@openeo/js-commons/src/utils');
const StacMigrate = require('@radiantearth/stac-migrate');

const STOP_STATUS = ['finished', 'canceled', 'error'];

/**
 * A Batch Job.
 * 
 * @augments BaseEntity
 */
class Job extends BaseEntity {

	/**
	 * Creates an object representing a batch job stored at the back-end.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {string} jobId - The batch job ID.
	 */
	constructor(connection, jobId) {
		super(connection, ["id", "title", "description", "process", "status", "progress", "created", "updated", "plan", "costs", "budget", "usage", ["log_level", "logLevel"], "links"]);
		/**
		 * The identifier of the batch job.
		 * @public
		 * @readonly
		 * @type {string}
		 */
		this.id = jobId;
		/**
		 * @public
		 * @readonly
		 * @type {?string}
		 */
		this.title = undefined;
		/**
		 * @public
		 * @readonly
		 * @type {?string}
		 */
		this.description = undefined;
		/**
		 * The process chain to be executed.
		 * @public
		 * @readonly
		 * @type {?Process}
		 */
		this.process = undefined;
		/**
		 * The current status of a batch job.
		 * One of "created", "queued", "running", "canceled", "finished" or "error".
		 * @public
		 * @readonly
		 * @type {?string}
		 */
		this.status = undefined;
		/**
		 * Indicates the process of a running batch job in percent. 
		 * @public
		 * @readonly
		 * @type {?number}
		 */
		this.progress = undefined;
		/**
		 * Date and time of creation, formatted as a RFC 3339 date-time.
		 * @public
		 * @readonly
		 * @type {?string}
		 */
		this.created = undefined;
		/**
		 * Date and time of the last status change, formatted as a RFC 3339 date-time.
		 * @public
		 * @readonly
		 * @type {?string}
		 */
		this.updated = undefined;
		/**
		 * The billing plan to process and charge the batch job with.
		 * @public
		 * @readonly
		 * @type {?string}
		 */
		this.plan = undefined;
		/**
		 * An amount of money or credits in the currency specified by the back-end.
		 * @public
		 * @readonly
		 * @type {?number}
		 */
		this.costs = undefined;
		/**
		 * Maximum amount of costs the request is allowed to produce in the currency specified by the back-end.
		 * @public
		 * @readonly
		 * @type {?number}
		 */
		this.budget = undefined;
	}

	/**
	 * Updates the batch job data stored in this object by requesting the metadata from the back-end.
	 * 
	 * @async
	 * @returns {Promise<Job>} The update job object (this).
	 * @throws {Error}
	 */
	async describeJob() {
		let response = await this.connection._get('/jobs/' + this.id);
		return this.setAll(response.data);
	}

	/**
	 * Modifies the batch job at the back-end and afterwards updates this object, too.
	 * 
	 * @async
	 * @param {object} parameters - An object with properties to update, each of them is optional, but at least one of them must be specified. Additional properties can be set if the server supports them.
	 * @param {Process} parameters.process - A new process.
	 * @param {string} parameters.title - A new title.
	 * @param {string} parameters.description - A new description.
	 * @param {string} parameters.plan - A new plan.
	 * @param {number} parameters.budget - A new budget.
	 * @returns {Promise<Job>} The updated job object (this).
	 * @throws {Error}
	 */
	async updateJob(parameters) {
		await this.connection._patch('/jobs/' + this.id, this._convertToRequest(parameters));
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
		await this.connection._delete('/jobs/' + this.id);
	}

	/**
	 * Calculate an estimate (potentially time/costs/volume) for a batch job.
	 * 
	 * @async
	 * @returns {Promise<JobEstimate>} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async estimateJob() {
		let response = await this.connection._get('/jobs/' + this.id + '/estimate');
		return response.data;
	}

	/**
	 * Get logs for the batch job from the back-end.
	 * 
	 * @param {?string} [level=null] - Minimum level of logs to return.
	 * @returns {Logs}
	 */
	debugJob(level = null) {
		return new Logs(this.connection, '/jobs/' + this.id + '/logs', level);
	}

	/**
	 * Checks for status changes and new log entries every x seconds.
	 * 
	 * On every status change observed or on new log entries (if supported by the
	 * back-end and not disabled via `requestLogs`), the callback is executed.
	 * It may also be executed once at the beginning.
	 * The callback receives the updated job (this object) and the logs (array) passed.
	 * 
	 * The monitoring stops once the job has finished, was canceled or errored out.
	 * 
	 * This is only supported if describeJob is supported by the back-end.
	 * 
	 * Returns a function that can be called to stop monitoring the job manually.
	 * 
	 * @param {Function} callback 
	 * @param {number} [interval=60] - Interval between update requests, in seconds as integer.
	 * @param {boolean} [requestLogs=true] - Enables/Disables requesting logs
	 * @returns {Function}
	 * @throws {Error}
	 */
	monitorJob(callback, interval = 60, requestLogs = true) {
		if (typeof callback !== 'function' || interval < 1) {
			return;
		}
		let capabilities = this.connection.capabilities();
		if (!capabilities.hasFeature('describeJob')) {
			throw new Error('Monitoring Jobs not supported by the back-end.');
		}

		let lastStatus = this.status;
		let intervalId = null;
		let logIterator = null;
		if (capabilities.hasFeature('debugJob') && requestLogs) {
			logIterator = this.debugJob();
		}
		let monitorFn = async () => {
			if (this.getDataAge() > 1) {
				await this.describeJob();
			}
			let logs = logIterator ? await logIterator.nextLogs() : [];
			if (lastStatus !== this.status || logs.length > 0) {
				callback(this, logs);
			}
			lastStatus = this.status;
			if (STOP_STATUS.includes(this.status)) {
				stopFn(); // eslint-disable-line no-use-before-define
			}
		};
		setTimeout(monitorFn, 0);
		intervalId = setInterval(monitorFn, interval * 1000);
		let stopFn = () => {
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
		};
		return stopFn;
	}

	/**
	 * Starts / queues the batch job for processing at the back-end.
	 * 
	 * @async
	 * @returns {Promise<Job>} The updated job object (this).
	 * @throws {Error}
	 */
	async startJob() {
		await this.connection._post('/jobs/' + this.id + '/results', {});
		if (this._supports('describeJob')) {
			return await this.describeJob();
		}
		return this;
	}

	/**
	 * Stops / cancels the batch job processing at the back-end.
	 * 
	 * @async
	 * @returns {Promise<Job>} The updated job object (this).
	 * @throws {Error}
	 */
	async stopJob() {
		await this.connection._delete('/jobs/' + this.id + '/results');
		if (this._supports('describeJob')) {
			return await this.describeJob();
		}
		return this;
	}

	/**
	 * Retrieves the STAC Item or Collection produced for the job results.
	 * 
	 * The Item or Collection returned always complies to the latest STAC version (currently 1.0.0). 
	 * 
	 * @async
	 * @returns {Promise<object.<string, *>>} The JSON-based response compatible to the API specification, but also including a `costs` property if present in the headers.
	 * @throws {Error}
	 */
	async getResultsAsStac() {
		let response = await this.connection._get('/jobs/' + this.id + '/results');
		if (!Utils.isObject(response) || !Utils.isObject(response.data)) {
			throw new Error("Results received from the back-end are invalid");
		}
		let data = StacMigrate.stac(response.data);
		if (!Utils.isObject(data.assets)) {
			data.assets = {};
		}
		if (data.type === 'Feature') { // Item
			if (typeof response.headers['openeo-costs'] === 'number') {
				data.properties.costs = response.headers['openeo-costs'];
			}
		}
		else { // Collection
			if (typeof response.headers['openeo-costs'] === 'number') {
				data.costs = response.headers['openeo-costs'];
			}
		}

		return data;
	}

	/**
	 * Retrieves download links.
	 * 
	 * @async
	 * @returns {Promise<Array.<Link>>} A list of links (object with href, rel, title, type and roles).
	 * @throws {Error}
	 */
	async listResults() {
		let item = await this.getResultsAsStac();
		if (Utils.isObject(item.assets)) {
			return Object.values(item.assets);
		}
		else {
			return [];
		}
	}

	/**
	 * Downloads the results to the specified target folder. The specified target folder must already exist!
	 * 
	 * NOTE: This method is only supported in a NodeJS environment. In a browser environment this method throws an exception!
	 * 
	 * @async
	 * @param {string} targetFolder - A target folder to store the file to, which must already exist.
	 * @returns {Promise<Array.<string>|void>} Depending on the environment: A list of file paths of the newly created files (Node), throws in Browsers.
	 * @throws {Error}
	 */
	async downloadResults(targetFolder) {
		let list = await this.listResults();
		return await Environment.downloadResults(this.connection, list, targetFolder);
	}
}

module.exports = Job;
