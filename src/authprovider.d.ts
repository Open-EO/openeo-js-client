export = AuthProvider;
/**
 * Authentication Provider details.
 *
 * @typedef AuthProviderMeta
 * @type {object}
 * @property {?string} id Provider identifier, may not be used for all authentication methods.
 * @property {string} title Title for the authentication method.
 * @property {string} description Description for the authentication method.
 */
/**
 * The base class for authentication providers such as Basic and OpenID Connect.
 *
 * @abstract
 */
declare class AuthProvider {
    /**
     * Creates a new OidcProvider instance to authenticate using OpenID Connect.
     *
     * @param {string} type - The type of the authentication procedure as specified by the API, e.g. `oidc` or `basic`.
     * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
     * @param {AuthProviderMeta} options - Options
     */
    constructor(type: string, connection: import("./connection"), options: AuthProviderMeta);
    id: string;
    title: string;
    description: string;
    type: string;
    /**
     * @protected
     * @type {Connection}
     */
    protected connection: import("./connection");
    token: string;
    /**
     * Get an identifier for the auth provider (combination of the type + provider identifier).
     *
     * @returns {string}
     */
    getId(): string;
    /**
     * Returns the type of the authentication procedure as specified by the API, e.g. `oidc` or `basic`.
     *
     * @returns {string}
     */
    getType(): string;
    /**
     * Returns the provider identifier, may not be available for all authentication methods.
     *
     * @returns {string}
     */
    getProviderId(): string;
    /**
     * Returns the human-readable title for the authentication method / provider.
     *
     * @returns {string}
     */
    getTitle(): string;
    /**
     * Returns the human-readable description for the authentication method / provider.
     *
     * @returns {string}
     */
    getDescription(): string;
    /**
     * Returns the access token that is used as Bearer Token in API requests.
     *
     * Returns `null` if no access token has been set yet (i.e. not authenticated any longer).
     *
     * @returns {?string}
     */
    getToken(): string | null;
    /**
     * Sets the access token that is used as Bearer Token in API requests.
     *
     * Set to `null` to remove the access token.
     *
     * This also manages which auth provider is set for the connection.
     *
     * @param {?string} token
     */
    setToken(token: string | null): void;
    /**
     * Abstract method that extending classes implement the login process with.
     *
     * @param  {...*} args
     * @throws {Error}
     */
    login(...args: any[]): Promise<void>;
    /**
     * Logout from the established session.
     *
     * This is experimental and just removes the token for now.
     * May need to be overridden by sub-classes.
     *
     * @async
     */
    logout(): Promise<void>;
}
declare namespace AuthProvider {
    export { AuthProviderMeta };
}
/**
 * Authentication Provider details.
 */
type AuthProviderMeta = {
    /**
     * Provider identifier, may not be used for all authentication methods.
     */
    id: string | null;
    /**
     * Title for the authentication method.
     */
    title: string;
    /**
     * Description for the authentication method.
     */
    description: string;
};
