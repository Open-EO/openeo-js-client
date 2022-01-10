const BaseEntity = require('./baseentity');
const Utils = require('@openeo/js-commons/src/utils');

/**
 * A Stored Process Graph.
 * 
 * @augments BaseEntity
 */
class UserProcess extends BaseEntity {

	/**
	 * Creates an object representing a process graph stored at the back-end.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {string} id - ID of a stored process graph.
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
		/**
		 * The identifier of the process.
		 * @public
		 * @readonly
		 * @type {string}
		 */
		this.id = id;
		/**
		 * @public
		 * @readonly
		 * @type {?string}
		 */
		this.summary = undefined;
		/**
		 * @public
		 * @readonly
		 * @type {?string}
		 */
		this.description = undefined;
		/**
		 * A list of categories.
		 * @public
		 * @readonly
		 * @type {?Array.<string>}
		 */
		this.categories = undefined;
		/**
		 * A list of parameters.
		 * 
		 * @public
		 * @readonly
		 * @type {?Array.<object.<string, *>>}
		 */
		this.parameters = undefined;
		/**
		 * Description of the data that is returned by this process.
		 * @public
		 * @readonly
		 * @type {?object.<string, *>}
		 */
		this.returns = undefined;
		/**
		 * Specifies that the process or parameter is deprecated with the potential to be removed in any of the next versions. 
		 * @public
		 * @readonly
		 * @type {?boolean}
		 */
		this.deprecated = undefined;
		/**
		 * Declares the process or parameter to be experimental, which means that it is likely to change or may produce unpredictable behaviour. 
		 * @public
		 * @readonly
		 * @type {?boolean}
		 */
		this.experimental = undefined;
		/**
		 * Declares any exceptions (errors) that might occur during execution of this process.
		 * @public
		 * @readonly
		 * @type {?object.<string, *>}
		 */
		this.exceptions = undefined;
		/**
		 * @public
		 * @readonly
		 * @type {?Array.<object.<string, *>>}
		 */
		this.examples = undefined;
		/**
		 * Links related to this process.
		 * @public
		 * @readonly
		 * @type {?Array.<Link>}
		 */
		this.links = undefined;
		/**
		 * @public
		 * @readonly
		 * @type {?object.<string, *>}
		 */
		this.processGraph = undefined;
	}

	/**
	 * Updates the data stored in this object by requesting the process graph metadata from the back-end.
	 * 
	 * @async
	 * @returns {Promise<UserProcess>} The updated process graph object (this).
	 * @throws {Error}
	 */
	async describeUserProcess() {
		let response = await this.connection._get('/process_graphs/' + this.id);
		if (!Utils.isObject(response.data) || typeof response.data.id !== 'string') {
			throw new Error('Invalid response received for user process');
		}
		this.connection.processes.add(response.data, 'user');
		return this.setAll(response.data);
	}

	/**
	 * Modifies the stored process graph at the back-end and afterwards updates this object, too.
	 * 
	 * @async
	 * @param {object} parameters - An object with properties to update, each of them is optional, but at least one of them must be specified. Additional properties can be set if the server supports them.
	 * @param {Process} parameters.process - A new process.
	 * @param {string} parameters.title - A new title.
	 * @param {string} parameters.description - A new description.
	 * @returns {Promise<UserProcess>} The updated process graph object (this).
	 * @throws {Error}
	 */
	async replaceUserProcess(parameters) {
		await this.connection._put('/process_graphs/' + this.id, this._convertToRequest(parameters));
		if (this._supports('describeUserProcess')) {
			return this.describeUserProcess();
		}
		else {
			let obj = this.setAll(parameters);
			this.connection.processes.add(obj.toJSON(), 'user');
			return obj;
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
		this.connection.processes.remove(this.id, 'user');
	}
}

module.exports = UserProcess;
