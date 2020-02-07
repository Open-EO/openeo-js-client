import axios from 'axios';
import { UserManager } from 'oidc-client';
import { Utils, Versions } from '@openeo/js-commons';

import Capabilities from './capabilities';
import Connection from './connection';
import File from './file';
import Job from './job';
import ProcessGraph from './processgraph';
import Service from './service';

export {
	Capabilities,
	Connection,
	File,
	Job,
	ProcessGraph,
	Service
};

const SUPPORTED_API_VERSIONS = '0.4.x';

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
	 * Please note that support for OpenID Connect is EXPERIMENTAL!
	 * Also note that the User ID may not be initialized correctly after authenticating with OpenID Connect.
	 * Therefore requests to endpoints requiring the user ID (e.g file management) may fail.
	 * Users should always request the user details using descibeAccount() directly after authentication.
	 * 
	 * @async
	 * @param {string} url - The server URL to connect to.
	 * @param {string} [authType=null] - Authentication type, either `basic` for HTTP Basic, `oidc` for OpenID Connect (Browser only, experimental) or `null` to disable authentication.
	 * @param {object} [authOptions={}] - Object with authentication options.
	 * @param {string} [authOptions.username] - HTTP Basic only: Username
	 * @param {string} [authOptions.password] - HTTP Basic only: Password
	 * @param {string} [authOptions.client_id] - OpenID Connect only: Your client application's identifier as registered with the OIDC provider
	 * @param {string} [authOptions.redirect_uri] - OpenID Connect only: The redirect URI of your client application to receive a response from the OIDC provider.
	 * @param {string} [authOptions.scope=openid] - OpenID Connect only: The scope being requested from the OIDC provider. Defaults to `openid`.
	 * @param {boolean} [authOptions.uiMethod=redirect] - OpenID Connect only: Method how to load and show the authentication process. Either `popup` (opens a popup window) or `redirect` (HTTP redirects, default).
	 * @returns {Connection}
	 * @throws {Error}
	 * @static
	 */
	static async connect(url, authType = null, authOptions = {}) {
		let wellKnownUrl = Utils.normalizeUrl(url, '/.well-known/openeo');
		let response;
		try {
			response = await axios.get(wellKnownUrl);

			if (!Utils.isObject(response.data) || !Array.isArray(response.data.versions)) {
				throw new Error("Well-Known Document doesn't list any version.");
			}
	
			let version = Versions.findLatest(response.data.versions, true, SUPPORTED_API_VERSIONS, SUPPORTED_API_VERSIONS);
			if (version !== null) {
				url = version.url;
			}
			else {
				throw new Error("Server doesn't support API version 1.0.x.");
			}
		} catch(error) {
			/** @todo We should replace the fallback in a 1.0 or so. */
			console.warn("DEPRECATED: Can't read well-known document, connecting directly to the specified URL as fallback mechanism.", error.message);
		}

		return await OpenEO.connectDirect(url, authType, authOptions);
	}

	/**
	 * Connects directly to a back-end instance, without version discovery (NOT recommended).
	 * 
	 * Doesn't do version discovery, therefore a URL of a versioned API must be specified. Requests the capabilities and authenticates where required.
	 * 
	 * Please note that support for OpenID Connect is EXPERIMENTAL!
	 * Also note that the User ID may not be initialized correctly after authenticating with OpenID Connect.
	 * Therefore requests to endpoints requiring the user ID (e.g file management) may fail.
	 * Users should always request the user details using descibeAccount() directly after authentication.
	 * 
	 * @async
	 * @param {string} url - The server URL to connect to.
	 * @param {string} [authType=null] - Authentication type, either `basic` for HTTP Basic, `oidc` for OpenID Connect (Browser only, experimental) or `null` to disable authentication.
	 * @param {object} [authOptions={}] - Object with authentication options.
	 * @param {string} [authOptions.username] - HTTP Basic only: Username
	 * @param {string} [authOptions.password] - HTTP Basic only: Password
	 * @param {string} [authOptions.client_id] - OpenID Connect only: Your client application's identifier as registered with the OIDC provider
	 * @param {string} [authOptions.redirect_uri] - OpenID Connect only: The redirect URI of your client application to receive a response from the OIDC provider.
	 * @param {string} [authOptions.scope=openid] - OpenID Connect only: The scope being requested from the OIDC provider. Defaults to `openid`.
	 * @param {boolean} [authOptions.uiMethod=redirect] - OpenID Connect only: Method how to load and show the authentication process. Either `popup` (opens a popup window) or `redirect` (HTTP redirects, default).
	 * @returns {Connection}
	 * @throws {Error}
	 * @static
	 */
	static async connectDirect(versionedUrl, authType = null, authOptions = {}) {
		let connection = new Connection(versionedUrl);

		// Check whether back-end is accessible and supports a compatible version.
		let capabilities = await connection.init();
		if (Versions.compare(capabilities.apiVersion(), SUPPORTED_API_VERSIONS) !== 0) {
			throw new Error("Server instance doesn't support API version 0.4.x.");
		}

		if(authType !== null) {
			switch(authType) {
				case 'basic':
					await connection.authenticateBasic(authOptions.username, authOptions.password);
					break;
				case 'oidc':
					await connection.authenticateOIDC(authOptions);
					break;
				default:
					throw new Error("Unknown authentication type.");
			}
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
		return "1.0.0-alpha.1";
	}

	/**
	 * Finishes the OpenID Connect signin (authentication) worflow - EXPERIMENTAL!
	 * 
	 * Must be called in the page that OpenID Connect redirects to after logging in.
	 * 
	 * @async
	 * @param {boolean} [uiMethod=redirect] - Method how to load and show the signin/authentication process. Either `popup` (opens a popup window) or `redirect` (HTTP redirects, default).
	 * @returns {User} For uiMethod = 'redirect' only: OIDC User (to be assigned to the Connection via setUserOIDC). 
	 */
	static async signinCallbackOIDC(uiMethod = 'redirect') {
		try {
			var oidc = new UserManager();
			if (uiMethod === 'popup') {
				await oidc.signinPopupCallback();
			}
			else {
				return await oidc.signinRedirectCallback();
			}
		} catch (e) {}
	}

}