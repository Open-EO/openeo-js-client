const Environment = require('./env');
const Utils = require('@openeo/js-commons/src/utils');
const { UserManager } = require('oidc-client');

class AuthProvider {

	constructor(type, connection, options) {
		Object.assign(this, options);
		this.type = type;
		this.connection = connection;
		this.token = null;
	}

	getId() {
		let id = this.getType();
		if (this.getProviderId().length > 0) {
			id += '.' + this.getProviderId();
		}
		return id;
	}

	getType() {
		return this.type;
	}

	getProviderId() {
		return typeof this.id === 'string' ? this.id : "";
	}

	getTitle() {
		return this.title;
	}

	getDescription() {
		return this.description;
	}

	getToken() {
		if (typeof this.token === 'string') {
			return this.getType() + "/" + this.getProviderId() + "/" + this.token;
		}
		else {
			return null;
		}
	}

	setToken(token) {
		this.token = token;
		if (this.token !== null) {
			this.connection.authProvider = this;
		}
		else {
			this.connection.authProvider = null;
		}
	}

	async login() {
		throw "Not implemented.";
	}

	/**
	 * Logout from the established session - EXPERIMENTAL!
	 * 
	 * @async
	 */
	async logout() {
		this.setToken(null);
	}

}


class OidcProvider extends AuthProvider {

	constructor(connection, options) {
		super("oidc", connection, options);
		this.manager = null;
		this.user = null;
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
	 * Finishes the OpenID Connect sign in (authentication) workflow - EXPERIMENTAL!
	 * 
	 * Must be called in the page that OpenID Connect redirects to after logging in.
	 * 
	 * @async
	 * @static
	 * @param {OidcProvider} provider - A OIDC provider to assign the user to.
	 * @returns {User} For uiMethod = 'redirect' only: OIDC User (to be assigned to the Connection via setUser if no provider has been specified). 
	 */
	static async signinCallback(provider = null) {
		try {
			var oidc = new UserManager();
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
		} catch (e) {}
	}

	/**
	 * Authenticate with OpenID Connect (OIDC) - EXPERIMENTAL!
	 * 
	 * Supported only in Browser environments.
	 * 
	 * @param {string} client_id - Your client application's identifier as registered with the OIDC provider
	 * @param {string} redirect_uri - The redirect URI of your client application to receive a response from the OIDC provider.
	 * @param {object} [options={}] - Object with authentication options. See https://github.com/IdentityModel/oidc-client-js/wiki#other-optional-settings for further options.
	 * @throws {Error}
	 */
	async login(client_id, redirect_uri, options = {}) {
		if (!this.issuer || typeof this.issuer !== 'string') {
			throw "No Issuer URL available for OpenID Connect";
		}
		else if (!this.client_id || typeof this.client_id !== 'string') {
			throw "No Client ID specified for OpenID Connect";
		}
		else if (!this.redirect_uri || typeof this.redirect_uri !== 'string') {
			throw "No Redirect URI specified for OpenID Connect";
		}

		this.manager = new UserManager(Object.assign({
			client_id: client_id,
			redirect_uri: redirect_uri,
			authority: this.issuer.replace('/.well-known/openid-configuration', ''),
			response_type: 'token id_token',
			scope: this.getScopes().join(' ')
		}, options));

		if (OidcProvider.uiMethod === 'popup') {
			this.setUserOIDC(await this.manager.signinPopup());
		}
		else {
			await this.manager.signinRedirect();
		}
	}

	getScopes() {
		return Array.isArray(this.scopes) && this.scopes.length > 0 ? this.scopes : ['openid'];
	}

	getIssuer() {
		return this.issuer;
	}

	getUser() {
		return this.user;
	}

	/**
	 * Sets the OIDC User.
	 * 
	 * @see https://github.com/IdentityModel/oidc-client-js/wiki#user
	 * @param {User} user - The OIDC User returned by OpenEO.signinCallbackOIDC(). Passing `null` resets OIDC authentication details.
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
	 * Logout from the established session - EXPERIMENTAL!
	 * 
	 * @async
	 */
	async logout() {
		if (this.manager !== null) {
			await this.manager.signoutRedirect();
			super.logout();
			this.manager = null;
			this.setUser(null);
		}
	}

}
OidcProvider.uiMethod = 'redirect';


class BasicProvider extends AuthProvider {

	constructor(connection) {
		super("basic", connection, {
			title: "HTTP Basic",
			description: "Login with username and password using the method HTTP Basic."
		});
	}

	/**
	 * Authenticate with HTTP Basic.
	 * 
	 * @async
	 * @param {object} options - Options for Basic authentication.
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
