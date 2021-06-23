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
	 * @returns {Promise<Oidc.User>} For uiMethod = 'redirect' only: OIDC User 
	 * @throws {Error}
	 * @see https://github.com/IdentityModel/oidc-client-js/wiki#other-optional-settings
	 */
	static async signinCallback(provider = null, options = {}) {
		let providerOptions;
		if (provider) {
			providerOptions = provider.getOptions(options);
		}
		else {
			// No provider options available, try to detect response mode from URL
			providerOptions = Object.assign({
				response_type: window.location.toString().includes('?') ? 'code' : 'token id_token'
//				response_mode: window.location.toString().includes('?') ? 'query' : 'fragment'
			}, options);
		}
		let oidc = new Oidc.UserManager(Object.assign(providerOptions, options));
		let user = await oidc.signinCallback();
		if (provider && user) {
			provider.setUser(user);
		}
		return user;
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

		/**
		 * The authenticated OIDC user.
		 * 
		 * @type {Oidc.User}
		 */
		this.user = null;
		
		/**
		 * The client ID to use for authentication.
		 * 
		 * @type {?string}
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
		this.issuer = options.issuer;

		/**
		 * The scopes to be requested.
		 * 
		 * @type {Array.<string>}
		 */
		this.scopes = Array.isArray(options.scopes) && options.scopes.length > 0 ? options.scopes.concat(['openid']) : ['openid'];

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
	 * Authenticate with OpenID Connect (OIDC).
	 * 
	 * Supported only in Browser environments.
	 * 
	 * @param {object.<string, *>} [options={}] - Object with authentication options.
	 * @returns {Promise<void>}
	 * @throws {Error}
	 * @see https://github.com/IdentityModel/oidc-client-js/wiki#other-optional-settings
	 */
	async login(options = {}) {
		if (!this.issuer || typeof this.issuer !== 'string') {
			throw new Error("No Issuer URL available for OpenID Connect");
		}

		this.manager = new Oidc.UserManager(this.getOptions(options));

		console.log(this.getOptions(options));
		if (OidcProvider.uiMethod === 'popup') {
			this.setUser(await this.manager.signinPopup());
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
				await this.manager.signoutRedirect();
			} catch (error) {
				console.warn(error);
			}
			super.logout();
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
	 * @returns {object.<string, *>}
	 */
	getOptions(options = {}) {
		return Object.assign({
			client_id: this.clientId,
			redirect_uri: OidcProvider.redirectUrl,
			authority: this.issuer.replace('/.well-known/openid-configuration', ''),
			scope: this.scopes.join(' '),
			response_type: this.getResponseType()
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
	 * @returns {string}
	 */
	setClientId(clientId) {
		this.clientId = clientId;
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
	 * Detects the default OIDC client ID for the given redirect URL.
	 * 
	 * Sets the grant and client ID accordingly.
	 * 
	 * @returns {?OidcClient}
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
OidcProvider.redirectUrl = window.location.toString().split('#')[0].split('?')[0].replace(/\/$/, '');

/**
 * The supported OpenID Connect grants (flows).
 * 
 * Lists them by priority so that the first grant is the default grant.
 * The default grant type since client version 2.0.0 is 'authorization_code+pkce'.
 * 
 * @type {Árray.<string>} - Grants as defined in OpenID Connect Discovery, e.g. `implicit` and/or `authorization_code+pkce`
 */
OidcProvider.grants = [
	'authorization_code+pkce',
	'implicit'
];

module.exports = OidcProvider;
