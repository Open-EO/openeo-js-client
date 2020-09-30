const Environment = require('./env');
const Utils = require('@openeo/js-commons/src/utils');
const OidcClient = require('oidc-client');
const Connection = require('./connection'); // jshint ignore:line

/**
 * Authentication Provider details.
 * 
 * @typedef AuthProviderMeta
 * @type {object} 
 * @property {string|null} id - Provider identifier, may not be used for all authentication methods. 
 * @property {string} title - Title for the authentication method.
 * @property {string} description - Description for the authentication method.
 */


/**
 * The base class for authentication providers such as Basic and OpenID Connect.
 * 
 * @class
 * @abstract
 */
class AuthProvider {

	/**
	 * Creates a new OidcProvider instance to authenticate using OpenID Connect.
	 * 
	 * @param {string} type - The type of the authentication procedure as specified by the API, e.g. `oidc` or `basic`.
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {AuthProviderMeta} options - Options
	 * @constructor
	 */
	constructor(type, connection, options) {
		this.id = options.id || null;
		this.title = options.title || "";
		this.description = options.description || "";
		this.type = type;
		this.connection = connection;
		this.token = null;
	}

	/**
	 * Get an identifier for the auth provider (combination of the type + provider identifier).
	 * 
	 * @returns {string}
	 */
	getId() {
		let id = this.getType();
		if (this.getProviderId().length > 0) {
			id += '.' + this.getProviderId();
		}
		return id;
	}

	/**
	 * Returns the type of the authentication procedure as specified by the API, e.g. `oidc` or `basic`.
	 * 
	 * @returns {string}
	 */
	getType() {
		return this.type;
	}

	/**
	 * Returns the provider identifier, may not be available for all authentication methods.
	 * 
	 * @returns {string}
	 */
	getProviderId() {
		return typeof this.id === 'string' ? this.id : "";
	}

	/**
	 * Returns the human-readable title for the authentication method / provider.
	 * 
	 * @returns {string}
	 */
	getTitle() {
		return this.title;
	}

	/**
	 * Returns the human-readable description for the authentication method / provider.
	 * 
	 * @returns {string}
	 */
	getDescription() {
		return this.description;
	}

	/**
	 * Returns the access token that is used as Bearer Token in API requests.
	 * 
	 * Returns `null` if no access token has been set yet (i.e. not authenticated any longer).
	 * 
	 * @returns {string|null}
	 */
	getToken() {
		if (typeof this.token === 'string') {
			return this.getType() + "/" + this.getProviderId() + "/" + this.token;
		}
		else {
			return null;
		}
	}

	/**
	 * Sets the access token that is used as Bearer Token in API requests.
	 * 
	 * Set to `null` to remove the access token.
	 * 
	 * This also manages which auth provider is set for the connection.
	 * 
	 * @param {string|null} token 
	 */
	setToken(token) {
		this.token = token;
		if (this.token !== null) {
			this.connection.authProvider = this;
		}
		else {
			this.connection.authProvider = null;
		}
	}

	/**
	 * Login procedure, to be overridden by sub-classes.
	 * 
	 * @async
	 * @param {...*} var_args
	 * @returns {Promise<void>}
	 * @throws {Error}
	 */
	async login(...var_args) { // jshint ignore:line
		throw new Error("Not implemented.");
	}

	/**
	 * Logout from the established session.
	 * 
	 * This is experimental and just removes the token for now.
	 * May need to be overridden by sub-classes.
	 * 
	 * @async
	 */
	async logout() {
		this.setToken(null);
	}

}

/**
 * The Authentication Provider for OpenID Connect.
 * 
 * 
 * 
 * ToDo: Add how to use the OIDC Provider.
 * 
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
	 * @property {string} id - Provider identifier.
	 * @property {string} title - Title for the authentication method.
	 * @property {string} description - Description for the authentication method.
	 * @property {string} issuer - The OpenID Connect issuer location (authority).
	 * @property {string[]} scopes - OpenID Connect Scopes
	 * @property {object[]} links - Links
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
	async login(client_id, redirect_uri, options = {}) {
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


/**
 * The Authentication Provider for HTTP Basic.
 * 
 * @class
 * @extends {AuthProvider}
 */
class BasicProvider extends AuthProvider {

	/**
	 * Creates a new BasicProvider instance to authenticate using HTTP Basic.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @constructor
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

module.exports = {
	AuthProvider,
	BasicProvider,
	OidcProvider
};
