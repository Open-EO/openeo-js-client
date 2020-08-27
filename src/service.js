const BaseEntity = require('./baseentity');
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
		this.serviceId = serviceId;
	}

	/**
	 * Updates the data stored in this object by requesting the secondary web service metadata from the back-end.
	 * 
	 * @async
	 * @returns {Service} The updates service object (this).
	 * @throws {Error}
	 */
	async describeService() {
		let response = await this.connection._get('/services/' + this.serviceId);
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
	 * @returns {Service} The updated service object (this).
	 * @throws {Error}
	 */
	async updateService(parameters) {
		await this.connection._patch('/services/' + this.serviceId, this._convertToRequest(parameters));
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
		await this.connection._delete('/services/' + this.serviceId);
	}

	/**
	 * Get logs for the secondary web service from the back-end.
	 * 
	 * @returns {Logs}
	 */
	debugService() {
		return new Logs(this.connection, '/services/' + this.serviceId + '/logs');
	}
}

module.exports = Service;
