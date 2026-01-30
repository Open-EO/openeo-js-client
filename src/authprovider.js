/**
 * The base class for authentication providers such as Basic and OpenID Connect.
 * 
 * @abstract
 */
class AuthProvider {

	/**
	 * Creates a new OidcProvider instance to authenticate using OpenID Connect.
	 * 
	 * @param {string} type - The type of the authentication procedure as specified by the API, e.g. `oidc` or `basic`.
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {AuthProviderMeta} options - Options
	 */
	constructor(type, connection, options) {
		this.id = options.id || null;
		this.title = options.title || "";
		this.description = options.description || "";
		this.type = type;
		/**
		 * @protected
		 * @type {Connection}
		 */
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
	 * Returns a display name for the authenticated user.
	 * 
	 * @returns {string?} Name of the user or `null`
	 */
	getDisplayName() {
		return null;
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
	 * @returns {string | null}
	 */
	getToken(){
		//check conformance
		const isJWT = this.connection.capabilities().hasConformance(
			"https://api.openeo.org/1.3.0/authentication/jwt"
		);
		if(isJWT){
			// return the JWT token instead of the legacy token
			if (typeof this.token === 'string') {
				// should we check for 'iss'?
				return this.token;
			}
		} else {
			if (typeof this.token === 'string') {
				return this.getType() + "/" + this.getProviderId() + "/" + this.token;
			}
		}
		return null;
	}

	/**
	 * Sets the access token that is used as Bearer Token in API requests.
	 * 
	 * Set to `null` to remove the access token.
	 * 
	 * This also manages which auth provider is set for the connection.
	 * 
	 * @param {?string} token 
	 */
	setToken(token) {
		this.token = token;
		this.connection.emit('tokenChanged', token);
		if (this.token !== null) {
			this.connection.setAuthProvider(this);
		}
		else {
			this.connection.setAuthProvider(null);
		}
	}

	/**
	 * Abstract method that extending classes implement the login process with.
	 * 
	 * @async
	 * @param {...*} args 
	 * @throws {Error}
	 */
	async login(...args) {
		throw new Error("Not implemented.", args);
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

module.exports = AuthProvider;
