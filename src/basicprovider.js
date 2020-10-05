const Environment = require('./env');
const Utils = require('@openeo/js-commons/src/utils');
const AuthProvider = require('./authprovider');

/**
 * @module openeo
 */
/**
 * The Authentication Provider for HTTP Basic.
 * 
 * @augments module:openeo~AuthProvider
 */
class BasicProvider extends AuthProvider {

	/**
	 * Creates a new BasicProvider instance to authenticate using HTTP Basic.
	 * 
	 * @param {module:openeo~Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 */
	constructor(connection) {
		super("basic", connection, {
			id: null,
			title: "HTTP Basic",
			description: "Login with username and password using the method HTTP Basic."
		});
	}

	/**
	 * Authenticate with HTTP Basic.
	 * 
	 * @async
	 * @param {string} username 
	 * @param {string} password 
	 * @returns {Promise<void>}
	 * @throws {Error}
	 */
	async login(username, password) {
		let response = await this.connection._send({
			method: 'get',
			responseType: 'json',
			url: '/credentials/basic',
			headers: {'Authorization': 'Basic ' + Environment.base64encode(username + ':' + password)}
		});
		if (!Utils.isObject(response.data) || typeof response.data.access_token !== 'string') {
			throw new Error("No access_token returned.");
		}
		this.setToken(response.data.access_token);
	}

}

module.exports = BasicProvider;