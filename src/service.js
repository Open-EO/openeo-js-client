const BaseEntity = require('./baseentity');
const Connection = require('./connection'); // jshint ignore:line
const Logs = require('./logs');

/**
 * A Secondary Web Service.
 * 
 * @class
 * @extends BaseEntity
 */
class Service extends BaseEntity {

	/**
	 * Creates an object representing a secondary web service stored at the back-end.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {string} serviceId - The service ID.
	 * @constructor
	 */
	constructor(connection, serviceId) {
		super(connection, ["id", "title", "description", "process", "url", "type", "enabled", "configuration", "attributes", "created", "plan", "costs", "budget"]);
		/**
		 * The identifier of the service.
		 * @public
		 * @readonly
		 * @type {string}
		 */
		this.id = serviceId;
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
		 * @type {object}
		 */
		this.process = undefined;
		/**
		 * URL at which the secondary web service is accessible
		 * @public
		 * @readonly
		 * @type {string}
		 */
		this.url = undefined;
		/**
		 * Web service type (protocol / standard) that is exposed.
		 * @public
		 * @readonly
		 * @type {string}
		 */
		this.type = undefined;
		/**
		 * @public
		 * @readonly
		 * @type {boolean}
		 */
		this.enabled = undefined;
		/**
		 * Map of configuration settings, i.e. the setting names supported by the secondary web service combined with actual values. 
		 * @public
		 * @readonly
		 * @type {object}
		 */
		this.configuration = undefined;
		/**
		 * Additional attributes of the secondary web service, e.g. available layers for a WMS based on the bands in the underlying GeoTiff.
		 * @public
		 * @readonly
		 * @type {object}
		 */
		this.attributes = undefined;
		/**
		 * Date and time of creation, formatted as a RFC 3339 date-time.
		 * @public
		 * @readonly
		 * @type {string}
		 */
		this.created = undefined;
		/**
		 * The billing plan to process and charge the service with.
		 * @public
		 * @readonly
		 * @type {string}
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
	 * Updates the data stored in this object by requesting the secondary web service metadata from the back-end.
	 * 
	 * @async
	 * @returns {Promise<Service>} The updates service object (this).
	 * @throws {Error}
	 */
	async describeService() {
		let response = await this.connection._get('/services/' + this.id);
		return this.setAll(response.data);
	}

	/**
	 * Modifies the secondary web service at the back-end and afterwards updates this object, too.
	 * 
	 * @async
	 * @param {object} parameters - An object with properties to update, each of them is optional, but at least one of them must be specified. Additional properties can be set if the server supports them.
	 * @param {object} parameters.process - A new process.
	 * @param {string} parameters.title - A new title.
	 * @param {string} parameters.description - A new description.
	 * @param {boolean} parameters.enabled - Enables (`true`) or disables (`false`) the service.
	 * @param {object} parameters.configuration - A new set of configuration parameters to set for the service.
	 * @param {string} parameters.plan - A new plan.
	 * @param {number} parameters.budget - A new budget.
	 * @returns {Promise<Service>} The updated service object (this).
	 * @throws {Error}
	 */
	async updateService(parameters) {
		await this.connection._patch('/services/' + this.id, this._convertToRequest(parameters));
		if (this._supports('describeService')) {
			return await this.describeService();
		}
		else {
			return this.setAll(parameters);
		}
	}

	/**
	 * Deletes the secondary web service from the back-end.
	 * 
	 * @async
	 * @throws {Error}
	 */
	async deleteService() {
		await this.connection._delete('/services/' + this.id);
	}

	/**
	 * Get logs for the secondary web service from the back-end.
	 * 
	 * @returns {Logs}
	 */
	debugService() {
		return new Logs(this.connection, '/services/' + this.id + '/logs');
	}

	/**
	 * Checks for new log entries every x seconds.
	 * 
	 * On every status change (enabled/disabled) observed or on new log entries
	 * (if supported by the back-end and not disabled via `requestLogs`), the
	 * callback is executed. It may also be executed once at the beginning.
	 * The callback receives the updated service (this object) and the logs (array) passed.
	 * 
	 * Returns a function that can be called to stop monitoring the service manually.
	 * The monitoring must be stopped manually, otherwise it runs forever.
	 * 
	 * This is only supported if describeService is supported by the back-end.
	 * 
	 * @param {function} callback 
	 * @param {number} [interval=60] - Interval between update requests, in seconds as integer.
	 * @param {boolean} [requestLogs=true] - Enables/Disables requesting logs
	 * @returns {function}
	 * @throws {Error}
	 */
	monitorService(callback, interval = 60, requestLogs = true) {
		if (typeof callback !== 'function' || interval < 1) {
			return;
		}
		let capabilities = this.connection.capabilities();
		if (!capabilities.hasFeature('describeService')) {
			throw new Error('Monitoring Services not supported by the back-end.');
		}

		let wasEnabled = this.enabled;
		let intervalId = null;
		let logIterator = null;
		if (capabilities.hasFeature('debugService') && requestLogs) {
			logIterator = this.debugService();
		}
		let monitorFn = async () => {
			if (this.getDataAge() > 1) {
				await this.describeService();
			}
			let logs = logIterator ? await logIterator.nextLogs() : [];
			if (wasEnabled !== this.enabled || logs.length > 0) {
				callback(this, logs);
			}
			wasEnabled = this.enabled;
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
}

module.exports = Service;
