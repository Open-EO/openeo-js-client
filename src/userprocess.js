const BaseEntity = require('./baseentity');

/**
 * A Stored Process Graph.
 * 
 * @class
 * @extends BaseEntity
 */
class UserProcess extends BaseEntity {

	/**
	 * Creates an object representing a process graph stored at the back-end.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {string} id - ID of a stored process graph.
	 * @constructor
	 */
	constructor(connection, id) {
		super(connection, [
			"id",
			"summary",
			"description",
			"categories",
			"parameters",
			"returns",
			"deprecated",
			"experimental",
			"exceptions",
			"examples",
			"links",
			["process_graph", "processGraph"]
		]);
		this.id = id;
		this.connection = connection;
	}

	/**
	 * Updates the data stored in this object by requesting the process graph metadata from the back-end.
	 * 
	 * @async
	 * @returns {UserProcess} The updated process graph object (this).
	 * @throws {Error}
	 */
	async describeUserProcess() {
		let response = await this.connection._get('/process_graphs/' + this.id);
		return this.setAll(response.data);
	}

	/**
	 * Modifies the stored process graph at the back-end and afterwards updates this object, too.
	 * 
	 * @async
	 * @param {object} parameters - An object with properties to update, each of them is optional, but at least one of them must be specified. Additional properties can be set if the server supports them.
	 * @param {object} parameters.process - A new process.
	 * @param {string} parameters.title - A new title.
	 * @param {string} parameters.description - A new description.
	 * @returns {UserProcess} The updated process graph object (this).
	 * @throws {Error}
	 */
	async replaceUserProcess(parameters) {
		await this.connection._put('/process_graphs/' + this.id, this._convertToRequest(parameters));
		if (this._supports('describeUserProcess')) {
			return this.describeUserProcess();
		}
		else {
			return this.setAll(parameters);
		}
	}

	/**
	 * Deletes the stored process graph from the back-end.
	 * 
	 * @async
	 * @throws {Error}
	 */
	async deleteUserProcess() {
		await this.connection._delete('/process_graphs/' + this.id);
	}
}

module.exports = UserProcess;
