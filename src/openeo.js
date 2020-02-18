import axios from 'axios';
import { Utils, Versions } from '@openeo/js-commons';

// API wrapper
import Connection from './connection';
import File from './file';
import Job from './job';
import UserProcess from './userprocess';
import Service from './service';
import { AuthProvider, BasicProvider, OidcProvider } from './authprovider';

// Response wrapper
import Capabilities from './capabilities';
import FileTypes from './filetypes';

export {
	AuthProvider,
	BasicProvider,
	Capabilities,
	Connection,
	File,
	FileTypes,
	OidcProvider,
	Job,
	UserProcess,
	Service
};

const MIN_API_VERSION = '1.0.0-rc.1';
const MAX_API_VERSION = '1.0.0-rc.1';

/**
 * Main class to start with openEO. Allows to connect to a server.
 * 
 * @class
 * @hideconstructor
 */
export class OpenEO {

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
		let response;
		try {
			response = await axios.get(wellKnownUrl);

			if (!Utils.isObject(response.data) || !Array.isArray(response.data.versions)) {
				throw new Error("Well-Known Document doesn't list any version.");
			}
	
			let version = Versions.findLatest(response.data.versions, true, MIN_API_VERSION, MAX_API_VERSION);
			if (version !== null) {
				url = version.url;
			}
			else {
				throw new Error("Server not supported. Client only supports the API versions between " + MIN_API_VERSION + " and " + MAX_API_VERSION);
			}
		} catch(error) {
			/** @todo We should replace the fallback in a 1.0 or so. */
			console.warn("DEPRECATED: Can't read well-known document, connecting directly to the specified URL as fallback mechanism.", error.message);
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
		return "1.0.0-beta.1";
	}

}