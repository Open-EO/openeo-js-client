// External deps
import axios from 'axios';
import Utils from '@openeo/js-commons/src/utils';
import Versions from '@openeo/js-commons/src/versions';

// API wrapper
import Connection from './connection.js';
import Job from './job.js';
import Logs from './logs.js';
import UserFile from './userfile.js';
import UserProcess from './userprocess.js';
import Service from './service.js';

// Auth Providers
import AuthProvider from './authprovider.js';
import BasicProvider from './basicprovider.js';
import OidcProvider from './oidcprovider.js';

// Response wrapper
import Capabilities from './capabilities.js';
import FileTypes from './filetypes.js';

// Builder
import Builder from './builder/builder.js';
import BuilderNode from './builder/node.js';
import Parameter from './builder/parameter.js';
import Formula from './builder/formula.js';

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
	 * @returns {Promise<import('./connection')>}
	 * @throws {Error}
	 * @static
	 */
	static async connect(url, options = {}) {
		let wellKnownUrl = Utils.normalizeUrl(url, '/.well-known/openeo');
		let versionedUrl = url;
		let response = null;

		try {
			response = await axios.get(wellKnownUrl, { timeout: 5000 });

			if (!Utils.isObject(response.data) || !Array.isArray(response.data.versions)) {
				throw new Error("Well-Known Document doesn't list any versions.");
			}
		}
		catch (error) {
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
	 * @returns {Promise<import('./connection')>}
	 * @throws {Error}
	 * @static
	 */
	static async connectDirect(versionedUrl, options = {}) {
		let connection = new Connection(versionedUrl, options);

		// Check whether back-end is accessible and supports a compatible version.
		let capabilities = await connection.init();
		if (
			Versions.compare(capabilities.apiVersion(), MIN_API_VERSION, "<") ||
			Versions.compare(capabilities.apiVersion(), MAX_API_VERSION, ">")
		) {
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
		return "2.11.0";
	}

}

OpenEO.Environment = (await import('./env.js')).default;

// This is to silent TypeScript which does not like that we export external modules.
// So we define these locally first, with proper types.
/** @type {typeof globalThis.AbortController} */
const AbortController_ = globalThis.AbortController;
/** @type {typeof import('./authprovider')} */
const AuthProvider_ = AuthProvider;
/** @type {typeof import('./basicprovider')} */
const BasicProvider_ = BasicProvider;
/** @type {typeof import('./capabilities')} */
const Capabilities_ = Capabilities;
/** @type {typeof import('./connection')} */
const Connection_ = Connection;
/** @type {typeof import('./filetypes')} */
const FileTypes_ = FileTypes;
/** @type {typeof import('./job')} */
const Job_ = Job;
/** @type {typeof import('./logs')} */
const Logs_ = Logs;
/** @type {typeof import('./oidcprovider')} */
const OidcProvider_ = OidcProvider;
/** @type {typeof import('./service')} */
const Service_ = Service;
/** @type {typeof import('./userfile')} */
const UserFile_ = UserFile;
/** @type {typeof import('./userprocess')} */
const UserProcess_ = UserProcess;
/** @type {typeof import('./builder/builder')} */
const Builder_ = Builder;
/** @type {typeof import('./builder/node')} */
const BuilderNode_ = BuilderNode;
/** @type {typeof import('./builder/parameter')} */
const Parameter_ = Parameter;
/** @type {typeof import('./builder/formula')} */
const Formula_ = Formula;

export {
	AbortController_ as AbortController,
	AuthProvider_ as AuthProvider,
	BasicProvider_ as BasicProvider,
	Capabilities_ as Capabilities,
	Connection_ as Connection,
	FileTypes_ as FileTypes,
	Job_ as Job,
	Logs_ as Logs,
	OidcProvider_ as OidcProvider,
	OpenEO,
	Service_ as Service,
	UserFile_ as UserFile,
	UserProcess_ as UserProcess,
	Builder_ as Builder,
	BuilderNode_ as BuilderNode,
	Parameter_ as Parameter,
	Formula_ as Formula
};
