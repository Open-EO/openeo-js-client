const axios = require('axios');
const Utils = require('@openeo/js-commons/src/utils');
const Versions = require('@openeo/js-commons/src/versions');

// API wrapper
const Connection = require('./connection');
const UserFile = require('./file');
const Job = require('./job');
const Logs = require('./logs');
const UserProcess = require('./userprocess');
const Service = require('./service');
const { AuthProvider, BasicProvider, OidcProvider } = require('./authprovider');

// Response wrapper
const Capabilities = require('./capabilities');
const FileTypes = require('./filetypes');

const MIN_API_VERSION = '1.0.0-rc.2';
const MAX_API_VERSION = '1';

/**
 * Main class to start with openEO. Allows to connect to a server.
 * 
 * @class
 * @hideconstructor
 */
class OpenEO {

	/**
	 * Connect to a back-end with version discovery (recommended).
	 * 
	 * Includes version discovery (request to `GET /well-known/openeo`) and connects to the most suitable version compatible to this JS client version.
	 * Requests the capabilities and authenticates where required.
	 * 
	 * @async
	 * @param {string} url - The server URL to connect to.
	 * @returns {Connection}
	 * @throws {Error}
	 * @static
	 */
	static async connect(url) {
		let wellKnownUrl = Utils.normalizeUrl(url, '/.well-known/openeo');
		let response = null;
		try {
			response = await axios.get(wellKnownUrl);

			if (!Utils.isObject(response.data) || !Array.isArray(response.data.versions)) {
				throw new Error("Well-Known Document doesn't list any versions.");
			}
		} catch(error) {
			console.warn("Can't read well-known document, connecting directly to the specified URL as fallback mechanism. Reason: " + error.message);
		}
	
		if (Utils.isObject(response)) {
			let version = Versions.findLatest(response.data.versions, true, MIN_API_VERSION, MAX_API_VERSION);
			if (version !== null) {
				url = version.url;
			}
			else {
				throw new Error("Server not supported. Client only supports the API versions between " + MIN_API_VERSION + " and " + MAX_API_VERSION);
			}
		}

		return await OpenEO.connectDirect(url);
	}

	/**
	 * Connects directly to a back-end instance, without version discovery (NOT recommended).
	 * 
	 * Doesn't do version discovery, therefore a URL of a versioned API must be specified. Requests the capabilities and authenticates where required.
	 * 
	 * @async
	 * @param {string} url - The server URL to connect to.
	 * @returns {Connection}
	 * @throws {Error}
	 * @static
	 */
	static async connectDirect(versionedUrl) {
		let connection = new Connection(versionedUrl);

		// Check whether back-end is accessible and supports a compatible version.
		let capabilities = await connection.init();
		if (Versions.compare(capabilities.apiVersion(), MIN_API_VERSION, "<") || Versions.compare(capabilities.apiVersion(), MAX_API_VERSION, ">")) {
			throw new Error("Client only supports the API versions between " + MIN_API_VERSION + " and " + MAX_API_VERSION);
		}

		return connection;
	}

	/**
	 * Returns the version number of the client.
	 * 
	 * Not to confuse with the API version(s) supported by the client.
	 * 
	 * @returns {string} Version number (according to SemVer).
	 */
	static clientVersion() {
		return "1.0.0-rc.1";
	}

}

module.exports = {
	AuthProvider,
	BasicProvider,
	Capabilities,
	Connection,
	File: UserFile,
	FileTypes,
	Job,
	Logs,
	OidcProvider,
	OpenEO,
	Service,
	UserProcess
};
