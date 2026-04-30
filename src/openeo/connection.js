const BaseConnection = require('../connection');
const Capabilities = require('./capabilities');

/**
 * A connection to an openEO back-end.
 */
class Connection extends BaseConnection {

	/**
	 * Creates a new Connection.
	 * 
	 * @param {string} data - The contents of the landing page.
	 * @param {string} url - The base URL of the back-end.
	 * @param {object} options - Additional options.
	 */
	constructor(data, url, options = {}) {
		super(url, options);
		this.capabilitiesObject = new Capabilities(data);
	}
}

module.exports = Connection;