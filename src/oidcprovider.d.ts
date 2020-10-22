export = OidcProvider;
declare const OidcProvider_base: typeof import("./authprovider");
/**
 * The Authentication Provider for OpenID Connect.
 *
 * See the openid-connect-popup.html and openid-connect-redirect.html files in
 * the examples folder for usage examples in the browser.
 *
 * If you want to implement OIDC in a non-browser environment, you can override
 * the OidcProvider or AuthProvider classes with custom behavior.
 * In this case you must provide a function that creates your new class to the
 * `Connection.setOidcProviderFactory()` method.
 *
 * @augments AuthProvider
 * @see Connection#setOidcProviderFactory
 */
declare class OidcProvider extends OidcProvider_base {
    /**
     * Checks whether the required OIDC client library `openid-client-js` is available.
     *
     * @static
     * @returns {boolean}
     */
    static isSupported(): boolean;
    /**
     * Globally sets the UI method (redirect, popup) to use for OIDC authentication.
     *
     * @static
     * @param {string} method - Method how to load and show the authentication process. Either `popup` (opens a popup window) or `redirect` (HTTP redirects, default).
     */
    static setUiMethod(method: string): void;
    /**
     * Finishes the OpenID Connect sign in (authentication) workflow.
     *
     * Must be called in the page that OpenID Connect redirects to after logging in.
     *
     * @async
     * @static
     * @param {OidcProvider} provider - A OIDC provider to assign the user to.
     * @returns {Promise<Oidc.User>} For uiMethod = 'redirect' only: OIDC User (to be assigned to the Connection via setUser if no provider has been specified).
     * @throws Error
     */
    static signinCallback(provider?: OidcProvider): Promise<Oidc.User>;
    /**
     * OpenID Connect Provider details as returned by the API.
     *
     * @augments AuthProviderMeta
     * @typedef OidcProviderMeta
     * @type {object}
     * @property {string} id Provider identifier.
     * @property {string} title Title for the authentication method.
     * @property {string} description Description for the authentication method.
     * @property {string} issuer The OpenID Connect issuer location (authority).
     * @property {Array.<string>} scopes OpenID Connect Scopes
     * @property {Array.<Link>} links Links
     */
    /**
     * Creates a new OidcProvider instance to authenticate using OpenID Connect.
     *
     * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
     * @param {OidcProviderMeta} options - OpenID Connect Provider details as returned by the API.
     */
    constructor(connection: import("./connection"), options: {
        /**
         * Provider identifier.
         */
        id: string;
        /**
         * Title for the authentication method.
         */
        title: string;
        /**
         * Description for the authentication method.
         */
        description: string;
        /**
         * The OpenID Connect issuer location (authority).
         */
        issuer: string;
        /**
         * OpenID Connect Scopes
         */
        scopes: Array<string>;
        /**
         * Links
         */
        links: Link[];
    });
    issuer: string;
    scopes: string[];
    links: Link[];
    manager: Oidc.UserManager;
    user: Oidc.User;
    /**
     * Returns the OpenID Connect / OAuth scopes.
     *
     * @returns {Array.<string>}
     */
    getScopes(): Array<string>;
    /**
     * Returns the OpenID Connect / OAuth issuer.
     *
     * @returns {string}
     */
    getIssuer(): string;
    /**
     * Returns the OpenID Connect user instance retrieved from the OIDC client library.
     *
     * @returns {Oidc.User}
     */
    getUser(): Oidc.User;
    /**
     * Sets the OIDC User.
     *
     * @see https://github.com/IdentityModel/oidc-client-js/wiki#user
     * @param {Oidc.User} user - The OIDC User returned by OidcProvider.signinCallback(). Passing `null` resets OIDC authentication details.
     */
    setUser(user: Oidc.User): void;
}
declare namespace OidcProvider {
    const uiMethod: string;
}
declare const Oidc_1: typeof globalThis.Oidc;
