const axios = require('axios');
const Utils = require('./utils');
const Versions = require('@openeo/js-commons/src/versions');

// API wrapper
const Connection = require('./openeo/connection');
const OgcConnection = require('./ogc/connection');
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
const { CLIENT_VERSION, MIN_OPENEO_API_VERSION, MAX_OPENEO_API_VERSION, CONFORMANCE_RELS } = require('./const');

/**
 * Main class to start with openEO or OGC APIs. Allows to connect to a server.
 * 
 * @hideconstructor
 */
class Client {

	/**
	 * Connect to a back-end with version discovery (recommended for openEO).
	 * 
	 * For openEO: Handles version discovery (request to `GET /well-known/openeo`).
	 * Connects to the most suitable version compatible to this JS client version.
	 * 
	 * @async
	 * @param {string} url - The server URL to connect to.
	 * @param {Options} [options={}] - Additional options for the connection.
	 * @returns {Promise<Connection>}
	 * @throws {Error}
	 * @static
	 */
	static async connect(url, options = {}) {
		const wellKnownUrl = Utils.normalizeUrl(url, '/.well-known/openeo');
		let versionedUrl = url;
		let response = null;
		try {
			response = await axios.get(wellKnownUrl, {timeout: 5000});
			if (!Utils.isObject(response.data) || !Array.isArray(response.data.versions)) {
				throw new Error("Well-Known Document doesn't list any versions.");
			}
		} catch(error) {
			console.warn("Can't read well-known document, connecting directly to the specified URL. Reason: " + error.message);
		}
	
		if (Utils.isObject(response)) {
			const version = Versions.findLatest(response.data.versions, true, MIN_OPENEO_API_VERSION, MAX_OPENEO_API_VERSION);
			if (version !== null) {
				versionedUrl = version.url;
			}
			else {
				throw new Error("Server not supported. Client only supports the API versions between " + MIN_OPENEO_API_VERSION + " and " + MAX_OPENEO_API_VERSION);
			}
		}

		const connection = await Client.connectDirect(versionedUrl, options);
		connection.url = url;
		return connection;
	}

	/**
	 * Connects directly to a back-end instance, without version discovery.
	 * 
	 * Doesn't do version discovery, therefore a URL of a versioned API must be specified.
	 * 
	 * @async
	 * @param {string} versionedUrl - The server URL to connect to.
	 * @param {Options} [options={}] - Additional options for the connection.
	 * @returns {Promise<Connection>}
	 * @throws {Error}
	 * @static
	 */
	static async connectDirect(versionedUrl, options = {}) {
		const capabiltiesResponse = await axios.get(versionedUrl, {timeout: 5000});
		if (!Utils.isObject(capabiltiesResponse.data)) {
			throw new Error("Capabilities are invalid (not an object)");
		}

		const data = Object.assign({}, capabiltiesResponse.data);
		data.links = Utils.makeLinksAbsolute(data.links, capabiltiesResponse);

		// For OGC APIs: Request conformance classes from separate endpoint
		if (!Array.isArray(data.conformsTo) && Array.isArray(data.links)) {
			const conformanceLink = Utils.getLinkHref(data.links, CONFORMANCE_RELS);
			if (conformanceLink) {
				const conformanceResponse = await axios.get(conformanceLink, {timeout: 5000});
				if (Utils.isObject(conformanceResponse.data) && Array.isArray(conformanceResponse.data.conformsTo)) {
					data.conformsTo = conformanceResponse.data.conformsTo;
				}
			}
		}

		let connection;
		if (data.api_version && data.endpoints) {
			// openEO API
			connection = new Connection(data, versionedUrl, options);
		}
		else {
			// OGC API
			connection = new OgcConnection(data, versionedUrl, options);
		}

		const capabilities = connection.capabilities();
		capabilities.checkVersion();

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
		return CLIENT_VERSION;
	}

}

Client.Environment = require('./env');

module.exports = {
	AbortController,
	AuthProvider,
	BasicProvider,
	Capabilities,
	Client,
	Connection,
	FileTypes,
	Job,
	Logs,
	OidcProvider,
	Service,
	UserFile,
	UserProcess,
	Builder,
	BuilderNode,
	Parameter,
	Formula
};
