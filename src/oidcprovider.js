const Utils = require('@openeo/js-commons/src/utils');
const AuthProvider = require('./authprovider');
const Environment = require('./env');
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
 */
class OidcProvider extends AuthProvider {

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
	 * Finishes the OpenID Connect sign in (authentication) workflow.
	 * 
	 * Must be called in the page that OpenID Connect redirects to after logging in.
	 * 
	 * Supported only in Browser environments.
	 * 
	 * @async
	 * @static
	 * @param {OidcProvider} provider - A OIDC provider to assign the user to.
	 * @param {object.<string, *>} [options={}] - Object with additional options.
	 * @returns {Promise<?Oidc.User>} For uiMethod = 'redirect' only: OIDC User
	 * @throws {Error}
	 * @see https://github.com/IdentityModel/oidc-client-js/wiki#other-optional-settings
	 */
	static async signinCallback(provider = null, options = {}) {
		let url = Environment.getUrl();
		if (!provider) {
			// No provider options available, try to detect response mode from URL
			provider = new OidcProvider(null, {});
			provider.setGrant(url.includes('?') ? 'authorization_code+pkce' : 'implicit');
		}
		let providerOptions = provider.getOptions(options);
		let oidc = new Oidc.UserManager(providerOptions);
		return await oidc.signinCallback(url);
	}

	/**
	 * Creates a new OidcProvider instance to authenticate using OpenID Connect.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {OidcProviderMeta} options - OpenID Connect Provider details as returned by the API.
	 */
	constructor(connection, options) {
		super("oidc", connection, options);

		this.manager = null;
		this.listeners = {};

		/**
		 * The authenticated OIDC user.
		 * 
		 * @type {Oidc.User}
		 */
		this.user = null;
		
		/**
		 * The client ID to use for authentication.
		 * 
		 * @type {string | null}
		 */
		this.clientId = null;

		/**
		 * The grant type (flow) to use for this provider.
		 * 
		 * Either "authorization_code+pkce" (default) or "implicit"
		 * 
		 * @type {string}
		 */
		this.grant = "authorization_code+pkce"; // Set this before calling detectDefaultClient

		/**
		 * The issuer, i.e. the link to the identity provider.
		 * 
		 * @type {string}
		 */
		this.issuer = options.issuer || "";

		/**
		 * The scopes to be requested.
		 * 
		 * @type {Array.<string>}
		 */
		this.scopes = Array.isArray(options.scopes) && options.scopes.length > 0 ? options.scopes : ['openid'];

		/**
		 * The scope that is used to request a refresh token.
		 * 
		 * @type {string}
		 */
		this.refreshTokenScope = "offline_access";

		/**
		 * Any additional links.
		 * 
		 * 
		 * @type {Array.<Link>}
		 */
		this.links = Array.isArray(options.links) ? options.links : [];

		/**
		 * The default clients made available by the back-end.
		 * 
		 * @type {Array.<OidcClient>}
		 */
		this.defaultClients = Array.isArray(options.default_clients) ? options.default_clients : [];

		/**
		 * The detected default Client.
		 * 
		 * @type {OidcClient}
		 */
		this.defaultClient = this.detectDefaultClient();
	}

	/**
	 * Adds a listener to one of the following events:
	 * 
	 * - AccessTokenExpiring: Raised prior to the access token expiring.
	 * - AccessTokenExpired: Raised after the access token has expired.
	 * - SilentRenewError: Raised when the automatic silent renew has failed.
	 * 
	 * @param {string} event 
	 * @param {Function} callback
	 * @param {string} [scope="default"]
	 */
	addListener(event, callback, scope = 'default') {
		this.manager.events[`add${event}`](callback);
		this.listeners[`${scope}:${event}`] = callback;
	}

	/**
	 * Removes the listener for the given event that has been set with addListener.
	 * 
	 * @param {string} event 
	 * @param {string} [scope="default"]
	 * @see OidcProvider#addListener
	 */
	removeListener(event, scope = 'default') {
		this.manager.events[`remove${event}`](this.listeners[event]);
		delete this.listeners[`${scope}:${event}`];
	}

	/**
	 * Authenticate with OpenID Connect (OIDC).
	 * 
	 * Supported only in Browser environments.
	 * 
	 * @async
	 * @param {object.<string, *>} [options={}] - Object with authentication options.
	 * @param {boolean} [requestRefreshToken=false] - If set to `true`, adds a scope to request a refresh token.
	 * @returns {Promise<void>}
	 * @throws {Error}
	 * @see https://github.com/IdentityModel/oidc-client-js/wiki#other-optional-settings
	 * @see {OidcProvider#refreshTokenScope}
	 */
	async login(options = {}, requestRefreshToken = false) {
		if (!this.issuer || typeof this.issuer !== 'string') {
			throw new Error("No Issuer URL available for OpenID Connect");
		}

		this.manager = new Oidc.UserManager(this.getOptions(options, requestRefreshToken));
		this.addListener('UserLoaded', async () => this.setUser(await this.manager.getUser()), 'js-client');
		this.addListener('AccessTokenExpired', () => this.setUser(null), 'js-client');
		if (OidcProvider.uiMethod === 'popup') {
			await this.manager.signinPopup();
		}
		else {
			await this.manager.signinRedirect();
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
				if (OidcProvider.uiMethod === 'popup') {
					await this.manager.signoutPopup();
				}
				else {
					await this.manager.signoutRedirect({
						post_logout_redirect_uri: Environment.getUrl()
					});
				}
			} catch (error) {
				console.warn(error);
			}
			super.logout();
			this.removeListener('UserLoaded', 'js-client');
			this.removeListener('AccessTokenExpired', 'js-client');
			this.manager = null;
			this.setUser(null);
		}
	}

	/**
	 * Returns the options for the OIDC client library.
	 * 
	 * Options can be overridden by custom options via the options parameter.
	 * 
	 * @protected
	 * @param {object.<string, *>} options 
	 * @param {boolean} [requestRefreshToken=false] - If set to `true`, adds a scope to request a refresh token.
	 * @returns {object.<string, *>}
	 * @see {OidcProvider#refreshTokenScope}
	 */
	getOptions(options = {}, requestRefreshToken = false) {
		let response_type = this.getResponseType();
		let scope = this.scopes.slice(0);
		if (requestRefreshToken && !scope.includes(this.refreshTokenScope)) {
			scope.push(this.refreshTokenScope);
		}

		return Object.assign({
			client_id: this.clientId,
			redirect_uri: OidcProvider.redirectUrl,
			authority: this.issuer.replace('/.well-known/openid-configuration', ''),
			scope: scope.join(' '),
			validateSubOnSilentRenew: true,
			response_type,
			response_mode: response_type.includes('code') ? 'query' : 'fragment'
		}, options);
	}

	/**
	 * Get the response_type based on the grant type.
	 * 
	 * @protected
	 * @returns {string}
	 * @throws {Error}
	 */
	getResponseType() {
		switch(this.grant) {
			case 'authorization_code+pkce':
				return 'code';
			case 'implicit':
				return 'token id_token';
			default:
				throw new Error('Grant Type not supported');
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
	 * Sets the Client ID for OIDC authentication.
	 * 
	 * This may override a detected default client ID.
	 * 
	 * @param {string | null} clientId
	 */
	setClientId(clientId) {
		this.clientId = clientId;
	}

	/**
	 * Sets the OIDC User.
	 * 
	 * @see https://github.com/IdentityModel/oidc-client-js/wiki#user
	 * @param {Oidc.User | null} user - The OIDC User. Passing `null` resets OIDC authentication details.
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
	 * Returns a display name for the authenticated user.
	 * 
	 * @returns {string?} Name of the user or `null`
	 */
	getDisplayName() {
		if (this.user && Utils.isObject(this.user.profile)) {
			return this.user.profile.name || this.user.profile.preferred_username || this.user.profile.email || null;
		}
		return null;
	}

	/**
	 * Detects the default OIDC client ID for the given redirect URL.
	 * 
	 * Sets the grant and client ID accordingly.
	 * 
	 * @returns {OidcClient | null}
	 * @see OidcProvider#setGrant
	 * @see OidcProvider#setClientId
	 */
	detectDefaultClient() {
		for(let grant of OidcProvider.grants) {
			let defaultClient = this.defaultClients.find(client => Boolean(client.grant_types.includes(grant) && Array.isArray(client.redirect_urls) && client.redirect_urls.find(url => url.startsWith(OidcProvider.redirectUrl))));
			if (defaultClient) {
				this.setGrant(grant);
				this.setClientId(defaultClient.id);
				this.defaultClient = defaultClient;
				return defaultClient;
			}
		}

		return null;
	}

}

/**
 * The global "UI" method to use to open the login URL, either "redirect" (default) or "popup".
 * 
 * @type {string}
 */
OidcProvider.uiMethod = 'redirect';

/**
 * The global redirect URL to use.
 * 
 * By default uses the location of the browser, but removes fragment, query and
 * trailing slash.
 * The fragment conflicts with the fragment appended by the Implicit Flow and
 * the query conflicts with the query appended by the Authorization Code Flow.
 * The trailing slash is removed for consistency.
 * 
 * @type {string}
 */
OidcProvider.redirectUrl = Environment.getUrl().split('#')[0].split('?')[0].replace(/\/$/, '');

/**
 * The supported OpenID Connect grants (flows).
 * 
 * The grants are given as defined in openEO API, e.g. `implicit` and/or `authorization_code+pkce`
 * If not defined there, consult the OpenID Connect Discovery documentation.
 * 
 * Lists the grants by priority so that the first grant is the default grant.
 * The default grant type since client version 2.0.0 is 'authorization_code+pkce'.
 * 
 * @type {Array.<string>}
 */
OidcProvider.grants = [
	'authorization_code+pkce',
	'implicit'
];

module.exports = OidcProvider;
