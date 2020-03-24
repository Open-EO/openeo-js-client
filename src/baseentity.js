/**
 * The base class for entities such as Job, Process Graph, Service etc.
 * 
 * @class
 * @abstract
 */
module.exports = class BaseEntity {

	/**
	 * Creates an instance of this object.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {object} properties 
	 * @constructor
	 */
	constructor(connection, properties = []) {
		this.connection = connection;
		this.apiToClientNames = {};
		this.clientToApiNames = {};
		this.extra = {};
		for(let i in properties) {
			let backend, client;
			if (Array.isArray(properties[i])) {
				backend = properties[i][0];
				client = properties[i][1];
			}
			else {
				backend = properties[i];
				client = properties[i];
			}
			this.apiToClientNames[backend] = client;
			this.clientToApiNames[client] = backend;
		}
	}

	toPlainObject() {
		let obj = {};
		for(let key in this.clientToApiNames) {
			let apiKey = this.clientToApiNames[key];
			if (typeof this[key] !== 'undefined') {
				obj[apiKey] = this[key];
			}
		}
		return Object.assign(obj, this.extra);
	}

	/**
	 * Converts the data from an API response into data suitable for our JS client models.
	 * 
	 * @param {object} metadata - JSON object originating from an API response.
	 * @returns {this} Returns the object itself.
	 */
	setAll(metadata) {
		for(let name in metadata) {
			if (typeof this.apiToClientNames[name] === 'undefined') {
				this.extra[name] = metadata[name];
			}
			else {
				this[this.apiToClientNames[name]] = metadata[name];
			}
		}
		return this;
	}

	/**
	 * Returns all data in the model.
	 * 
	 * @returns {object}
	 */
	getAll() {
		let obj = {};
		for(let backend in this.apiToClientNames) {
			let client = this.apiToClientNames[backend];
			obj[client] = this[client];
		}
		return Object.assign(obj, this.extra);
	}

	/**
	 * Get a value from the additional data that is not part of the core model, i.e. from proprietary extensions.
	 * 
	 * @param {string} name - Name of the property.
	 * @returns {*} The value, which could be of any type.
	 */
	get(name) {
		return typeof this.extra[name] !== 'undefined' ? this.extra[name] : null;
	}

	_convertToRequest(parameters) {
		let request = {};
		for(let key in parameters) {
			if (typeof this.clientToApiNames[key] === 'undefined') {
				request[key] = parameters[key];
			}
			else {
				request[this.clientToApiNames[key]] = parameters[key];
			}
		}
		return request;
	}

	_supports(feature) {
		return this.connection.capabilities().hasFeature(feature);
	}

};
