import BaseEntity from './baseentity';

/**
 * A Stored Process Graph.
 * 
 * @class
 * @extends BaseEntity
 */
export default class ProcessGraph extends BaseEntity {

	/**
	 * Creates an object representing a process graph stored at the back-end.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {string} processGraphId - ID of a stored process graph.
	 * @constructor
	 */
	constructor(connection, processGraphId) {
		super(connection, ["id", "title", "description", ["process_graph", "processGraph"]]);
		this.connection = connection;
		this.processGraphId = processGraphId;
	}

	/**
	 * Updates the data stored in this object by requesting the process graph metadata from the back-end.
	 * 
	 * @async
	 * @returns {ProcessGraph} The updated process graph object (this).
	 * @throws {Error}
	 */
	async describeProcessGraph() {
		let response = await this.connection._get('/process_graphs/' + this.processGraphId);
		return this.setAll(response.data);
	}

	/**
	 * Modifies the stored process graph at the back-end and afterwards updates this object, too.
	 * 
	 * @async
	 * @param {object} parameters - An object with properties to update, each of them is optional, but at least one of them must be specified. Additional properties can be set if the server supports them.
	 * @param {object} parameters.processGraph - A new process graph.
	 * @param {string} parameters.title - A new title.
	 * @param {string} parameters.description - A new description.
	 * @returns {ProcessGraph} The updated process graph object (this).
	 * @throws {Error}
	 */
	async updateProcessGraph(parameters) {
		await this.connection._patch('/process_graphs/' + this.processGraphId, this._convertToRequest(parameters));
		if (this._supports('describeProcessGraph')) {
			return this.describeProcessGraph();
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
	async deleteProcessGraph() {
		await this.connection._delete('/process_graphs/' + this.processGraphId);
	}
}
