const axios = require('axios').default;
const { AbortController } = require("node-abort-controller");
const Utils = require('@openeo/js-commons/src/utils');
const Versions = require('@openeo/js-commons/src/versions');

// API wrapper
const Connection = require('./connection');
const Job = require('./job');
const Logs = require('./logs');
const UserFile = require('./userfile');
const UserProcess = require('./userprocess');
const Service = require('./service');

// Auth Providers
const AuthProvider = require('./authprovider');
const BasicProvider = require('./basicprovider');
const OidcProvider = require('./oidcprovider');

// Response wrapper
const Capabilities = require('./capabilities');
const FileTypes = require('./filetypes');

// Builder
const Builder = require('./builder/builder');
const BuilderNode = require('./builder/node');
const Parameter = require('./builder/parameter');
const Formula = require('./builder/formula');

const MIN_API_VERSION = '1.0.0-rc.2';
const MAX_API_VERSION = '1.x.x';

/**
 * Main class to start with openEO. Allows to connect to a server.
 * 
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
	 * @param {Options} [options={}] - Additional options for the connection.
	 * @returns {Promise<Connection>}
	 * @throws {Error}
	 * @static
	 */
	static async connect(url, options = {}) {
		let wellKnownUrl = Utils.normalizeUrl(url, '/.well-known/openeo');
		let versionedUrl = url;
		let response = null;
		try {
			response = await axios.get(wellKnownUrl, {timeout: 5000});

			if (!Utils.isObject(response.data) || !Array.isArray(response.data.versions)) {
				throw new Error("Well-Known Document doesn't list any versions.");
			}
		} catch(error) {
			console.warn("Can't read well-known document, connecting directly to the specified URL as fallback mechanism. Reason: " + error.message);
		}
	
		if (Utils.isObject(response)) {
			let version = Versions.findLatest(response.data.versions, true, MIN_API_VERSION, MAX_API_VERSION);
			if (version !== null) {
				versionedUrl = version.url;
			}
			else {
				throw new Error("Server not supported. Client only supports the API versions between " + MIN_API_VERSION + " and " + MAX_API_VERSION);
			}
		}

		let connection = await OpenEO.connectDirect(versionedUrl, options);
		connection.url = url;
		return connection;
	}

	/**
	 * Connects directly to a back-end instance, without version discovery (NOT recommended).
	 * 
	 * Doesn't do version discovery, therefore a URL of a versioned API must be specified. Requests the capabilities and authenticates where required.
	 * 
	 * @async
	 * @param {string} versionedUrl - The server URL to connect to.
	 * @param {Options} [options={}] - Additional options for the connection.
	 * @returns {Promise<Connection>}
	 * @throws {Error}
	 * @static
	 */
	static async connectDirect(versionedUrl, options = {}) {
		let connection = new Connection(versionedUrl, options);

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
		return "2.4.0";
	}

}

OpenEO.Environment = require('./env');

module.exports = {
	AbortController,
	AuthProvider,
	BasicProvider,
	Capabilities,
	Connection,
	FileTypes,
	Job,
	Logs,
	OidcProvider,
	OpenEO,
	Service,
	UserFile,
	UserProcess,
	Builder,
	BuilderNode,
	Parameter,
	Formula
};
