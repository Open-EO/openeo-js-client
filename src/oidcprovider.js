const Utils = require('@openeo/js-commons/src/utils');
const OidcClient = require('oidc-client');
const AuthProvider = require('./authprovider');
const Connection = require('./connection'); // jshint ignore:line

/**
 * The Authentication Provider for OpenID Connect.
 * 
 * @todo Add how to use the OIDC Provider.
 * @class
 * @extends {AuthProvider}
 */
class OidcProvider extends AuthProvider {

	/**
	 * OpenID Connect Provider details as returned by the API.
	 * 
	 * @extends AuthProviderMeta
	 * @typedef OidcProviderMeta
	 * @type {object} 
	 * @property {string} id Provider identifier.
	 * @property {string} title Title for the authentication method.
	 * @property {string} description Description for the authentication method.
	 * @property {string} issuer The OpenID Connect issuer location (authority).
	 * @property {string[]} scopes OpenID Connect Scopes
	 * @property {object[]} links Links
	 */

	/**
	 * Creates a new OidcProvider instance to authenticate using OpenID Connect.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {OidcProviderMeta} options - OpenID Connect Provider details as returned by the API.
	 * @constructor
	 */
	constructor(connection, options) {
		super("oidc", connection, options);
		this.issuer = options.issuer;
		this.scopes = options.scopes;
		this.links = options.links;
		this.manager = null;
		this.user = null;
	}

	/**
	 * Checks whether the required OIDC client library `openid-client-js` is available.
	 * 
	 * @static
	 * @returns {boolean}
	 */
	static isSupported() {
		return (Utils.isObject(OidcClient) && !!OidcClient.UserManager);
	}

	/**
	 * Globally sets the UI method (redirect, popup) to use for OIDC authentication.
	 * 
	 * @static
	 * @param {string} method - Method how to load and show the authentication process. Either `popup` (opens a popup window) or `redirect` (HTTP redirects, default).
	 */
	static setUiMethod(method) {
		OidcProvider.uiMethod = method;
	}

	/**
	 * Finishes the OpenID Connect sign in (authentication) workflow.
	 * 
	 * Must be called in the page that OpenID Connect redirects to after logging in.
	 * 
	 * @async
	 * @static
	 * @param {OidcProvider} provider - A OIDC provider to assign the user to.
	 * @returns {Promise<OidcClient.User>} For uiMethod = 'redirect' only: OIDC User (to be assigned to the Connection via setUser if no provider has been specified). 
	 * @throws Error
	 */
	static async signinCallback(provider = null) {
		var oidc = new OidcClient.UserManager({});
		if (OidcProvider.uiMethod === 'popup') {
			await oidc.signinPopupCallback();
		}
		else {
			let user = await oidc.signinRedirectCallback();
			if (provider) {
				provider.setUser(user);
			}
			return user;
		}
	}

	/**
	 * Authenticate with OpenID Connect (OIDC).
	 * 
	 * Supported only in Browser environments.
	 * 
	 * @param {string} client_id - Your client application's identifier as registered with the OIDC provider
	 * @param {string} redirect_uri - The redirect URI of your client application to receive a response from the OIDC provider.
	 * @param {object} [options={}] - Object with authentication options.
	 * @returns {Promise<void>}
	 * @throws {Error}
	 * @see https://github.com/IdentityModel/oidc-client-js/wiki#other-optional-settings
	 */
	async login(...args) {
		const [client_id, redirect_uri, options = {}] = args;

		if (!this.issuer || typeof this.issuer !== 'string') {
			throw new Error("No Issuer URL available for OpenID Connect");
		}
		else if (!client_id || typeof client_id !== 'string') {
			throw new Error("No Client ID specified for OpenID Connect");
		}
		else if (!redirect_uri || typeof redirect_uri !== 'string') {
			throw new Error("No Redirect URI specified for OpenID Connect");
		}

		this.manager = new OidcClient.UserManager(Object.assign({
			client_id: client_id,
			redirect_uri: redirect_uri,
			authority: this.issuer.replace('/.well-known/openid-configuration', ''),
			response_type: 'token id_token',
			scope: this.getScopes().join(' ')
		}, options));

		if (OidcProvider.uiMethod === 'popup') {
			this.setUser(await this.manager.signinPopup());
		}
		else {
			await this.manager.signinRedirect();
		}
	}

	/**
	 * Returns the OpenID Connect / OAuth scopes.
	 * 
	 * @returns {string[]}
	 */
	getScopes() {
		return Array.isArray(this.scopes) && this.scopes.length > 0 ? this.scopes : ['openid'];
	}

	/**
	 * Returns the OpenID Connect / OAuth issuer.
	 * 
	 * @returns {string}
	 */
	getIssuer() {
		return this.issuer;
	}

	/**
	 * Returns the OpenID Connect user instance retrieved from the OIDC client library.
	 * 
	 * @returns {OidcClient.User}
	 */
	getUser() {
		return this.user;
	}

	/**
	 * Sets the OIDC User.
	 * 
	 * @see https://github.com/IdentityModel/oidc-client-js/wiki#user
	 * @param {OidcClient.User} user - The OIDC User returned by OidcProvider.signinCallback(). Passing `null` resets OIDC authentication details.
	 */
	setUser(user) {
		if (!user) {
			this.user = null;
			this.setToken(null);
		}
		else {
			this.user = user;
			this.setToken(user.access_token);
		}
	}

	/**
	 * Logout from the established session.
	 * 
	 * @async
	 */
	async logout() {
		if (this.manager !== null) {
			try {
				await this.manager.signoutRedirect();
			} catch (error) {
				console.warn(error);
			}
			super.logout();
			this.manager = null;
			this.setUser(null);
		}
	}

}
OidcProvider.uiMethod = 'redirect';

module.exports = OidcProvider;
