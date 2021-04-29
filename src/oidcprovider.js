const Utils = require('@openeo/js-commons/src/utils');
const AuthProvider = require('./authprovider');
const Oidc = require('oidc-client');

/**
 * The Authentication Provider for OpenID Connect.
 * 
 * See the openid-connect-popup.html and openid-connect-redirect.html files in
 * the `/examples/oidc` folder for usage examples in the browser.
 * 
 * If you want to implement OIDC in a non-browser environment, you can override 
 * the OidcProvider or AuthProvider classes with custom behavior.
 * In this case you must provide a function that creates your new class to the
 * `Connection.setOidcProviderFactory()` method.
 * 
 * @augments AuthProvider
 * @see Connection#setOidcProviderFactory
 * @todo Default grant is "implicit" in JS Client 1.0, change to "authorization_code+pkce" in 2.0.
 */
class OidcProvider extends AuthProvider {

	/**
	 * Creates a new OidcProvider instance to authenticate using OpenID Connect.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {OidcProviderMeta} options - OpenID Connect Provider details as returned by the API.
	 */
	constructor(connection, options) {
		super("oidc", connection, options);
		this.issuer = options.issuer;
		this.scopes = options.scopes;
		this.links = options.links;
		this.defaultClients = Array.isArray(options.default_clients) ? options.default_clients : [];
		this.grant = "implicit"; // Default grant is "implicit" in JS Client 1.0, change to "authorization_code+pkce" in 2.0.
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
		return Utils.isObject(Oidc) && Boolean(Oidc.UserManager);
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
	 * Get the response_type based on the grant type.
	 * 
	 * @static
	 * @param {string} grant - Grant Type
	 * @returns {string}
	 * @throws {Error}
	 */
	static getResponseType(grant) {
		switch(grant) {
			case 'authorization_code+pkce':
				return 'code';
			case 'implicit':
				return 'token id_token';
			default:
				throw new Error('Grant Type not supported');
		}
	}
	
	/**
	 * Globally sets the supported OpenID Connect grants (flows) to use.
	 * 
	 * Lists them by priority so that the first grant is the default grant.
	 * 
	 * @static
	 * @param {Array.<string>} grants - Grants as defined in OpenID Connect Discovery, e.g. `implicit` and/or `authorization_code+pkce`
	 */
	static setSupportedGrants(grants) {
		OidcProvider.grants = grants;
	}

	/**
	 * Finishes the OpenID Connect sign in (authentication) workflow.
	 * 
	 * Must be called in the page that OpenID Connect redirects to after logging in.
	 * 
	 * @async
	 * @static
	 * @param {OidcProvider} provider - A OIDC provider to assign the user to.
	 * @param {object.<string, *>} [options={}] - Object with additional options.
	 * @returns {Promise<Oidc.User>} For uiMethod = 'redirect' only: OIDC User (to be assigned to the Connection via setUser if no provider has been specified). 
	 * @throws {Error}
	 * @see https://github.com/IdentityModel/oidc-client-js/wiki#other-optional-settings
	 */
	static async signinCallback(provider = null, options = {}) {
		let oidc = new Oidc.UserManager(options);
		let user = await oidc.signinCallback();
		if (provider && user) {
			provider.setUser(user);
		}
		return user;
	}

	/**
	 * Authenticate with OpenID Connect (OIDC).
	 * 
	 * Supported only in Browser environments.
	 * 
	 * @param {string} clientId - Your client application's identifier as registered with the OIDC provider
	 * @param {string} redirectUrl - The redirect URI of your client application to receive a response from the OIDC provider.
	 * @param {object.<string, *>} [options={}] - Object with authentication options.
	 * @returns {Promise<void>}
	 * @throws {Error}
	 * @see https://github.com/IdentityModel/oidc-client-js/wiki#other-optional-settings
	 */
	async login(clientId, redirectUrl, options = {}) {
		if (!this.issuer || typeof this.issuer !== 'string') {
			throw new Error("No Issuer URL available for OpenID Connect");
		}
		else if (!clientId || typeof clientId !== 'string') {
			throw new Error("No Client ID specified for OpenID Connect");
		}
		else if (!redirectUrl || typeof redirectUrl !== 'string') {
			throw new Error("No Redirect URI specified for OpenID Connect");
		}

		this.manager = new Oidc.UserManager(Object.assign({
			client_id: clientId,
			redirect_uri: redirectUrl,
			authority: this.issuer.replace('/.well-known/openid-configuration', ''),
			scope: this.getScopes().join(' '),
			response_type: OidcProvider.getResponseType(this.grant)
		}, options));

		if (OidcProvider.uiMethod === 'popup') {
			this.setUser(await this.manager.signinPopup());
		}
		else {
			await this.manager.signinRedirect();
		}
	}

	/**
	 * Sets the grant type (flow) used for OIDC authentication.
	 * 
	 * @param {string} grant - Grant Type
	 * @throws {Error}
	 */
	setGrant(grant) { // 
		switch(grant) {
			case 'authorization_code+pkce':
			case 'implicit':
				this.grant = grant;
				break;
			default:
				throw new Error('Grant Type not supported');
		}
	}

	/**
	 * Returns the grant type (flow) used for OIDC authentication.
	 * 
	 * @returns {string}
	 */
	getGrant() {
		return this.grant;
	}

	/**
	 * Returns the OpenID Connect / OAuth scopes.
	 * 
	 * @returns {Array.<string>}
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
	 * @returns {Oidc.User}
	 */
	getUser() {
		return this.user;
	}

	/**
	 * Detects the default OIDC client ID for the given redirect URL.
	 * 
	 * Sets the grant accordingly.
	 * 
	 * @param {string} redirectUrl - Redirect URL
	 * @returns {?string}
	 * @see OidcProvider#setGrant
	 */
	detectDefaultClient(redirectUrl) {
		for(let grant of OidcProvider.grants) {
			let defaultClient = this.defaultClients.find(client => Boolean(client.grant_types.includes(grant) && Array.isArray(client.redirect_urls) && client.redirect_urls.find(url => url.startsWith(redirectUrl))));
			if (defaultClient) {
				this.setGrant(grant);
				return defaultClient.id;
			}
		}

		return null;
	}

	/**
	 * Sets the OIDC User.
	 * 
	 * @see https://github.com/IdentityModel/oidc-client-js/wiki#user
	 * @param {Oidc.User} user - The OIDC User returned by OidcProvider.signinCallback(). Passing `null` resets OIDC authentication details.
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

// Default grant is "implicit" in JS Client 1.0, change to "authorization_code+pkce" in 2.0 by moving it up in the list.
OidcProvider.grants = [
	'implicit',
	'authorization_code+pkce'
];

module.exports = OidcProvider;
