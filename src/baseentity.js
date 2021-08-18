/**
 * The base class for entities such as Job, Process Graph, Service etc.
 * 
 * @abstract
 */
class BaseEntity {

	/**
	 * Creates an instance of this object.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {Array} properties - A mapping from the API property names to the JS client property names (usually to convert between snake_case and camelCase), e.g. `["id", "title", ["process_graph", "processGraph"]]`
	 */
	constructor(connection, properties = []) {
		/**
		 * @protected
		 * @type {Connection}
		 */
		this.connection = connection;
		/**
		 * @protected
		 * @type {object.<string, string>}
		 */
		this.apiToClientNames = {};
		/**
		 * @protected
		 * @type {object.<string, string>}
		 */
		this.clientToApiNames = {};
		/**
		 * @protected
		 * @type {number}
		 */
		this.lastRefreshTime = 0;
		/**
		 * Additional (non-standardized) properties received from the API.
		 * 
		 * @protected
		 * @type {object.<string, *>}
		 */
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

	/**
	 * Returns a JSON serializable representation of the data that is API compliant.
	 * 
	 * @returns {object.<string, *>}
	 */
	toJSON() {
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
	 * @param {object.<string, *>} metadata - JSON object originating from an API response.
	 * @returns {BaseEntity} Returns the object itself.
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
		this.lastRefreshTime = Date.now();
		return this;
	}

	/**
	 * Returns the age of the data in seconds.
	 * 
	 * @returns {number} Age of the data in seconds as integer.
	 */
	getDataAge() {
		return (Date.now() - this.lastRefreshTime) / 1000;
	}

	/**
	 * Returns all data in the model.
	 * 
	 * @returns {object.<string, *>}
	 */
	getAll() {
		let obj = {};
		for(let backend in this.apiToClientNames) {
			let client = this.apiToClientNames[backend];
			if (typeof this[client] !== 'undefined') {
				obj[client] = this[client];
			}
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

	/**
	 * Converts the object to a valid objects for API requests.
	 * 
	 * @param {object.<string, *>} parameters
	 * @returns {object.<string, *>}
	 * @protected
	 */
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

	/**
	 * Checks whether a features is supported by the API.
	 * 
	 * @param {string} feature
	 * @returns {boolean}
	 * @protected
	 * @see Capabilities#hasFeature
	 */
	_supports(feature) {
		return this.connection.capabilities().hasFeature(feature);
	}

}

module.exports = BaseEntity;
