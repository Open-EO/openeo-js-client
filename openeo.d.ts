/// <reference types="node" />

import { User, UserManager } from 'oidc-client';
import { ProcessRegistry } from '@openeo/js-commons';
import { Readable } from 'stream';
import axios from 'axios';

declare namespace Client {
    /**
     * The base class for authentication providers such as Basic and OpenID Connect.
     *
     * @abstract
     */
    export class AuthProvider {
        /**
         * Creates a new OidcProvider instance to authenticate using OpenID Connect.
         *
         * @param {string} type - The type of the authentication procedure as specified by the API, e.g. `oidc` or `basic`.
         * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
         * @param {AuthProviderMeta} options - Options
         */
        constructor(type: string, connection: Connection, options: AuthProviderMeta);
        id: string;
        title: string;
        description: string;
        type: string;
        /**
         * @protected
         * @type {Connection}
         */
        protected connection: Connection;
        token: string;
        /**
         * Get an identifier for the auth provider (combination of the type + provider identifier).
         *
         * @returns {string}
         */
        getId(): string;
        /**
         * Returns a display name for the authenticated user.
         *
         * @returns {string?} Name of the user or `null`
         */
        getDisplayName(): string | null;
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
         * @returns {string | null}
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
         * @async
         * @param {...*} args
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
    /**
     * The base class for entities such as Job, Process Graph, Service etc.
     *
     * @abstract
     */
    export class BaseEntity {
        /**
         * Creates an instance of this object.
         *
         * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
         * @param {Array.<string|Array.<string>>} properties - A mapping from the API property names to the JS client property names (usually to convert between snake_case and camelCase), e.g. `["id", "title", ["process_graph", "processGraph"]]`
         */
        constructor(connection: Connection, properties?: Array<string | Array<string>>);
        /**
         * @protected
         * @type {Connection}
         */
        protected connection: Connection;
        /**
         * @protected
         * @type {object.<string, string>}
         */
        protected apiToClientNames: Record<string, string>;
        /**
         * @protected
         * @type {object.<string, string>}
         */
        protected clientToApiNames: Record<string, string>;
        /**
         * @protected
         * @type {number}
         */
        protected lastRefreshTime: number;
        /**
         * Additional (non-standardized) properties received from the API.
         *
         * @protected
         * @type {object.<string, *>}
         */
        protected extra: Record<string, any>;
        /**
         * Returns a JSON serializable representation of the data that is API compliant.
         *
         * @returns {object.<string, *>}
         */
        toJSON(): Record<string, any>;
        /**
         * Converts the data from an API response into data suitable for our JS client models.
         *
         * @param {object.<string, *>} metadata - JSON object originating from an API response.
         * @returns {BaseEntity} Returns the object itself.
         */
        setAll(metadata: Record<string, any>): BaseEntity;
        /**
         * Returns the age of the data in seconds.
         *
         * @returns {number} Age of the data in seconds as integer.
         */
        getDataAge(): number;
        /**
         * Returns all data in the model.
         *
         * @returns {object.<string, *>}
         */
        getAll(): Record<string, any>;
        /**
         * Get a value from the additional data that is not part of the core model, i.e. from proprietary extensions.
         *
         * @param {string} name - Name of the property.
         * @returns {*} The value, which could be of any type.
         */
        get(name: string): any;
        /**
         * Converts the object to a valid objects for API requests.
         *
         * @param {object.<string, *>} parameters
         * @returns {object.<string, *>}
         * @protected
         */
        protected _convertToRequest(parameters: Record<string, any>): Record<string, any>;
        /**
         * Checks whether a features is supported by the API.
         *
         * @param {string} feature
         * @returns {boolean}
         * @protected
         * @see Capabilities#hasFeature
         */
        protected _supports(feature: string): boolean;
    }
    /**
     * Platform dependant utilities for the openEO JS Client.
     *
     * @hideconstructor
     */
    export class Environment {
        /**
         * The axios instance to use for HTTP requests.
         *
         * 
         * @type {object}
         * @static
         */
        static axios: typeof axios;
        /**
         * Returns the name of the Environment, `Node` or `Browser`.
         *
         * @returns {string}
         * @static
         */
        static getName(): string;
        /**
         * Returns the URL of the Environment.
         *
         * @returns {string}
         * @static
         */
        static getUrl(): string;
        /**
         * Sets the URL of the Environment.
         *
         * @param {string} uri
         * @static
         */
        static setUrl(uri: string): void;
        /**
         * Handles errors from the API that are returned as Blobs/Streams.
         *
         * @ignore
         * @static
         * @param {Blob | Readable} error
         * @returns {Promise<void>}
         */
        static handleErrorResponse(error: Blob | Readable): Promise<void>;
        /**
         * Returns how binary responses from the servers are returned (`stream` or `blob`).
         *
         * @returns {string}
         * @static
         */
        static getResponseType(): string;
        /**
         * Encodes a string into Base64 encoding.
         *
         * @static
         * @param {string|Buffer} str - String to encode.
         * @returns {string} String encoded in Base64.
         */
        static base64encode(str: string | Buffer): string;
        /**
         * Detect the file name for the given data source.
         *
         * @ignore
         * @static
         * @param {*} source - An object from a file upload form.
         * @returns {string}
         */
        static fileNameForUpload(source: any): string;
        /**
         * Get the data from the source that should be uploaded.
         *
         * @ignore
         * @static
         * @param {*} source - An object from a file upload form.
         * @returns {*}
         */
        static dataForUpload(source: any): any;
        /**
         * Downloads files to local storage and returns a list of file paths.
         *
         * Not supported in Browsers and only throws an Error!
         *
         * @static
         * @param {Connection} con
         * @param {Array.<object.<string, *>>} assets
         * @param {string} targetFolder
         * @throws {Error}
         */
        static downloadResults(con: Connection, assets: Array<Record<string, any>>, targetFolder: string): Promise<void>;
        /**
         * Streams data into a file (node) or offers data to download (browser).
         *
         * This method may fail with overly big data in browsers.
         *
         * @async
         * @static
         * @param {*} data - Data to save.
         * @param {string} filename - File path to store the data at (node) or file name that is suggested to the user (browser).
         * @returns {Promise<void>}
         * @throws {Error}
         * @see https://github.com/kennethjiang/js-file-download/blob/master/file-download.js
         */
        static saveToFile(data: any, filename: string): Promise<void>;
    }
    /**
     * The Authentication Provider for HTTP Basic.
     *
     * @augments AuthProvider
     */
    export class BasicProvider extends AuthProvider {
        /**
         * Creates a new BasicProvider instance to authenticate using HTTP Basic.
         *
         * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
         */
        constructor(connection: Connection);
        username: string;
        /**
         * Authenticate with HTTP Basic.
         *
         * @async
         * @param {string} username
         * @param {string} password
         * @returns {Promise<void>}
         * @throws {Error}
         */
        login(username: string, password: string): Promise<void>;
    }
    /**
     * Capabilities of a back-end.
     */
    export class Capabilities {
        /**
         * Creates a new Capabilities object from an API-compatible JSON response.
         *
         * @param {object.<string, *>} data - A capabilities response compatible to the API specification for `GET /`.
         * @throws {Error}
         */
        constructor(data: Record<string, any>);
        /**
         * @private
         * @type {object.<string, *>}
         */
        private data;
        /**
         * @private
         * @ignore
         * @type {object.<string, string>}
         */
        private featureMap;
        /**
         * @private
         * @type {Array.<string>}
         */
        private features;
        /**
         * Validates the capabilities.
         *
         * Throws an error in case of an issue, otherwise just passes.
         *
         * @protected
         * @throws {Error}
         */
        protected validate(): void;
        /**
         * Returns the capabilities response as a JSON serializable representation of the data that is API compliant.
         *
         * @returns {object.<string, *>} - A reference to the capabilities response.
         */
        toJSON(): Record<string, any>;
        /**
         * Returns the openEO API version implemented by the back-end.
         *
         * @returns {string} openEO API version number.
         */
        apiVersion(): string;
        /**
         * Returns the back-end version number.
         *
         * @returns {string} openEO back-end version number.
         */
        backendVersion(): string;
        /**
         * Returns the back-end title.
         *
         * @returns {string} Title
         */
        title(): string;
        /**
         * Returns the back-end description.
         *
         * @returns {string} Description
         */
        description(): string;
        /**
         * Is the back-end suitable for use in production?
         *
         * @returns {boolean} true = stable/production, false = unstable
         */
        isStable(): boolean;
        /**
         * Returns the links.
         *
         * @returns {Array.<Link>} Array of link objects (href, title, rel, type)
         */
        links(): Array<Link>;
        /**
         * Returns list of backends in the federation.
         *
         * @returns {Array.<FederationBackend>} Array of backends
         */
        listFederation(): Array<FederationBackend>;
        /**
         * Given just the string ID of a backend within the federation, returns that backend's full details as a FederationBackend object.
         *
         * @param {string} backendId - The ID of a backend within the federation
         * @returns {FederationBackend} The full details of the backend
         */
        getFederationBackend(backendId: string): FederationBackend;
        /**
         * Given a list of string IDs of backends within the federation, returns those backends' full details as FederationBackend objects.
         *
         * @param {Array<string>} backendIds - The IDs of backends within the federation
         * @returns {Array<FederationBackend>} An array in the same order as the input, containing for each position the full details of the backend
         */
        getFederationBackends(backendIds: Array<string>): Array<FederationBackend>;
        /**
         * Lists all supported features.
         *
         * @returns {Array.<string>} An array of supported features.
         */
        listFeatures(): Array<string>;
        /**
         * Check whether a feature is supported by the back-end.
         *
         * @param {string} methodName - A feature name (corresponds to the JS client method names, see also the feature map for allowed values).
         * @returns {boolean} `true` if the feature is supported, otherwise `false`.
         */
        hasFeature(methodName: string): boolean;
        /**
         * Check whether a conformance class is supported by the back-end.
         *
         * Use `*` as a wildcard character for e.g. version numbers.
         *
         * @param {string|Array.<string>} uris - Conformance class URI(s) - any of them must match.
         * @returns {boolean} `true` if any of the conformance classes is supported, otherwise `false`.
         */
        hasConformance(uris: string | Array<string>): boolean;
        /**
         * Get the billing currency.
         *
         * @returns {string | null} The billing currency or `null` if not available.
         */
        currency(): string | null;
        /**
         * List all billing plans.
         *
         * @returns {Array.<BillingPlan>} Billing plans
         */
        listPlans(): Array<BillingPlan>;
        /**
         * Migrates a response, if required.
         *
         * @param {AxiosResponse} response
         * @protected
         * @returns {AxiosResponse}
         */
        protected migrate(response: AxiosResponse): AxiosResponse;

        static Conformance: Record<string, string | Array<string>>;
    }
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
    export class OidcProvider extends AuthProvider {
        /**
         * Checks whether the required OIDC client library `openid-client-js` is available.
         *
         * @static
         * @returns {boolean}
         */
        static isSupported(): boolean;
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
         * @returns {Promise<?User>} For uiMethod = 'redirect' only: OIDC User
         * @throws {Error}
         * @see https://github.com/IdentityModel/oidc-client-js/wiki#other-optional-settings
         */
        static signinCallback(provider?: OidcProvider, options?: Record<string, any>): Promise<User | null>;
        /**
         * Creates a new OidcProvider instance to authenticate using OpenID Connect.
         *
         * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
         * @param {OidcProviderMeta} options - OpenID Connect Provider details as returned by the API.
         */
        constructor(connection: Connection, options: OidcProviderMeta);
        manager: UserManager;
        listeners: {};
        /**
         * The authenticated OIDC user.
         *
         * @type {User}
         */
        user: Oidc.User;
        /**
         * The client ID to use for authentication.
         *
         * @type {string | null}
         */
        clientId: string | null;
        /**
         * The grant type (flow) to use for this provider.
         *
         * Either "authorization_code+pkce" (default) or "implicit"
         *
         * @type {string}
         */
        grant: string;
        /**
         * The issuer, i.e. the link to the identity provider.
         *
         * @type {string}
         */
        issuer: string;
        /**
         * The scopes to be requested.
         *
         * @type {Array.<string>}
         */
        scopes: Array<string>;
        /**
         * The scope that is used to request a refresh token.
         *
         * @type {string}
         */
        refreshTokenScope: string;
        /**
         * Any additional links.
         *
         *
         * @type {Array.<Link>}
         */
        links: Array<Link>;
        /**
         * The default clients made available by the back-end.
         *
         * @type {Array.<OidcClient>}
         */
        defaultClients: Array<OidcClient>;
        /**
         * The detected default Client.
         *
         * @type {OidcClient}
         */
        defaultClient: OidcClient;
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
        addListener(event: string, callback: Function, scope?: string): void;
        /**
         * Removes the listener for the given event that has been set with addListener.
         *
         * @param {string} event
         * @param {string} [scope="default"]
         * @see OidcProvider#addListener
         */
        removeListener(event: string, scope?: string): void;
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
        login(options?: Record<string, any>, requestRefreshToken?: boolean): Promise<void>;
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
        protected getOptions(options?: Record<string, any>, requestRefreshToken?: boolean): Record<string, any>;
        /**
         * Get the response_type based on the grant type.
         *
         * @protected
         * @returns {string}
         * @throws {Error}
         */
        protected getResponseType(): string;
        /**
         * Sets the grant type (flow) used for OIDC authentication.
         *
         * @param {string} grant - Grant Type
         * @throws {Error}
         */
        setGrant(grant: string): void;
        /**
         * Sets the Client ID for OIDC authentication.
         *
         * This may override a detected default client ID.
         *
         * @param {string | null} clientId
         */
        setClientId(clientId: string | null): void;
        /**
         * Sets the OIDC User.
         *
         * @see https://github.com/IdentityModel/oidc-client-js/wiki#user
         * @param {User | null} user - The OIDC User. Passing `null` resets OIDC authentication details.
         */
        setUser(user: User | null): void;
        /**
         * Detects the default OIDC client ID for the given redirect URL.
         *
         * Sets the grant and client ID accordingly.
         *
         * @returns {OidcClient | null}
         * @see OidcProvider#setGrant
         * @see OidcProvider#setClientId
         */
        detectDefaultClient(): OidcClient | null;
    }
    export namespace OidcProvider {
        let uiMethod: string;
        let redirectUrl: string;
        let grants: Array<string>;
    }
    /**
     * Manages the files types supported by the back-end.
     */
    export class FileTypes {
        /**
         * Creates a new FileTypes object from an API-compatible JSON response.
         *
         * @param {FileTypesAPI} data - A capabilities response compatible to the API specification for `GET /file_formats`.
         */
        constructor(data: FileTypesAPI);
        /**
         * @protected
         * @type {FileTypesAPI}
         */
        protected data: FileTypesAPI;
        /**
         * A list of backends from the federation that are missing in the response data.
         *
         * @public
         * @type {Array.<string>}
         */
        public 'federation:missing': Array<string>;
        /**
         * Returns the file types response as a JSON serializable representation of the data that is API compliant.
         *
         * @returns {FileTypesAPI}
         */
        toJSON(): FileTypesAPI;
        /**
         * Returns the input file formats.
         *
         * @returns {object.<string, FileType>}
         */
        getInputTypes(): Record<string, FileType>;
        /**
         * Returns the output file formats.
         *
         * @returns {object.<string, FileType>}
         */
        getOutputTypes(): Record<string, FileType>;
        /**
         * Returns a single input file format for a given identifier.
         *
         * Returns null if no input file format was found for the given identifier.
         *
         * @param {string} type - Case-insensitive file format identifier
         * @returns {FileType | null}
         */
        getInputType(type: string): FileType | null;
        /**
         * Returns a single output file format for a given identifier.
         *
         * Returns null if no output file format was found for the given identifier.
         *
         * @param {string} type - Case-insensitive file format identifier
         * @returns {FileType | null}
         */
        getOutputType(type: string): FileType | null;
        /**
         * Get a file type object from the list of input or output file formats.
         *
         * @param {string} type - Identifier of the file type
         * @param {string} io - Either `input` or `output`
         * @returns {FileType | null}
         * @protected
         */
        protected _findType(type: string, io: string): FileType | null;
    }
    /**
     * A File on the user workspace.
     *
     * @augments BaseEntity
     */
    export class UserFile extends BaseEntity {
        /**
         * Creates an object representing a file on the user workspace.
         *
         * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
         * @param {string} path - The path to the file, relative to the user workspace and without user ID.
         */
        constructor(connection: Connection, path: string);
        /**
         * Path to the file, relative to the user's directory.
         * @readonly
         * @public
         * @type {string}
         */
        public readonly path: string;
        /**
         * File size in bytes as integer.
         * @readonly
         * @public
         * @type {number}
         */
        public readonly size: number;
        /**
         * Date and time the file has lastly been modified, formatted as a RFC 3339 date-time.
         * @readonly
         * @public
         * @type {string}
         */
        public readonly modified: string;
        /**
         * Downloads a file from the user workspace into memory.
         *
         * This method has different behaviour depending on the environment.
         * Returns a stream in a NodeJS environment or a Blob in a browser environment.
         *
         * @async
         * @returns {Promise<Readable|Blob>} - Return value depends on the target and environment, see method description for details.
         * @throws {Error}
         */
        retrieveFile(): Promise<Readable | Blob>;
        /**
         * Downloads a file from the user workspace and saves it.
         *
         * This method has different behaviour depending on the environment.
         * In a NodeJS environment writes the downloaded file to the target location on the file system.
         * In a browser environment offers the file for downloading using the specified name (folders are not supported).
         *
         * @async
         * @param {string} target - The target, see method description for details.
         * @returns {Promise<Array.<string>|void>} - Return value depends on the target and environment, see method description for details.
         * @throws {Error}
         */
        downloadFile(target: string): Promise<Array<string> | void>;
        /**
         * A callback that is executed on upload progress updates.
         *
         * @callback uploadStatusCallback
         * @param {number} percentCompleted - The percent (0-100) completed.
         * @param {UserFile} file - The file object corresponding to the callback.
         */
        /**
         * Uploads a file to the user workspace.
         * If a file with the name exists, overwrites it.
         *
         * This method has different behaviour depending on the environment.
         * In a nodeJS environment the source must be a path to a file as string.
         * In a browser environment the source must be an object from a file upload form.
         *
         * @async
         * @param {*} source - The source, see method description for details.
         * @param {?uploadStatusCallback} statusCallback - Optionally, a callback that is executed on upload progress updates.
         * @param {?AbortController} [abortController=null] - An AbortController object that can be used to cancel the upload process.
         * @returns {Promise<UserFile>}
         * @throws {Error}
         */
        uploadFile(source: any, statusCallback?: uploadStatusCallback | null, abortController?: AbortController | null): Promise<UserFile>;
        /**
         * Deletes the file from the user workspace.
         *
         * @async
         * @throws {Error}
         */
        deleteFile(): Promise<void>;
    }
    /**
     * A callback that is executed on upload progress updates.
     */
    type uploadStatusCallback = (percentCompleted: number, file: UserFile) => any;
    namespace UserFile {
        export { uploadStatusCallback };
    }
    /**
     * Interface to loop through the logs.
     */
    export class Logs {
        /**
         * Creates a new Logs instance to retrieve logs from a back-end.
         *
         * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
         * @param {string} endpoint - The relative endpoint to request the logs from, usually `/jobs/.../logs` or `/services/.../logs` with `...` being the actual job or service id.
         * @param {?string} [level=null] - Minimum level of logs to return.
         */
        constructor(connection: Connection, endpoint: string, level?: string | null);
        /**
         * @protected
         * @type {Connection}
         */
        protected connection: Connection;
        /**
         * @protected
         * @type {string}
         */
        protected endpoint: string;
        /**
         * @protected
         * @type {string}
         */
        protected lastId: string;
        /**
         * @protected
         * @type {?string}
         */
        protected level: string | null;
        /**
         * @protected
         * @type {Set<string>}
         */
        protected missing: Set<string>;
        /**
         * Retrieves the next log entries since the last request.
         *
         * Retrieves log entries only.
         *
         * @async
         * @param {number} limit - The number of log entries to retrieve per request, as integer.
         * @returns {Promise<Array.<Log>>}
         */
        nextLogs(limit?: number): Promise<Array<Log>>;
        /**
         * Retrieves the backend identifiers that are (partially) missing in the logs.
         *
         * This is only filled after the first request using `nextLogs` or `next`.
         *
         * @returns {Array.<string>}
         * @see {Logs#nextLogs}
         * @see {Logs#next}
         */
        getMissingBackends(): Array<string>;
        /**
         * Retrieves the next log entries since the last request.
         *
         * Retrieves the full response compliant to the API, including log entries and links.
         *
         * @async
         * @param {number} limit - The number of log entries to retrieve per request, as integer.
         * @returns {Promise<LogsAPI>}
         */
        next(limit?: number): Promise<LogsAPI>;
    }
    /**
     * A Batch Job.
     *
     * @augments BaseEntity
     */
    export class Job extends BaseEntity {
        /**
         * Creates an object representing a batch job stored at the back-end.
         *
         * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
         * @param {string} jobId - The batch job ID.
         */
        constructor(connection: Connection, jobId: string);
        /**
         * The identifier of the batch job.
         * @public
         * @readonly
         * @type {string}
         */
        public readonly id: string;
        /**
         * @public
         * @readonly
         * @type {?string}
         */
        public readonly title: string | null;
        /**
         * @public
         * @readonly
         * @type {?string}
         */
        public readonly description: string | null;
        /**
         * The process chain to be executed.
         * @public
         * @readonly
         * @type {?Process}
         */
        public readonly process: Process | null;
        /**
         * The current status of a batch job.
         * One of "created", "queued", "running", "canceled", "finished" or "error".
         * @public
         * @readonly
         * @type {?string}
         */
        public readonly status: string | null;
        /**
         * Indicates the process of a running batch job in percent.
         * @public
         * @readonly
         * @type {?number}
         */
        public readonly progress: number | null;
        /**
         * Date and time of creation, formatted as a RFC 3339 date-time.
         * @public
         * @readonly
         * @type {?string}
         */
        public readonly created: string | null;
        /**
         * Date and time of the last status change, formatted as a RFC 3339 date-time.
         * @public
         * @readonly
         * @type {?string}
         */
        public readonly updated: string | null;
        /**
         * The billing plan to process and charge the batch job with.
         * @public
         * @readonly
         * @type {?string}
         */
        public readonly plan: string | null;
        /**
         * An amount of money or credits in the currency specified by the back-end.
         * @public
         * @readonly
         * @type {?number}
         */
        public readonly costs: number | null;
        /**
         * Maximum amount of costs the request is allowed to produce in the currency specified by the back-end.
         * @public
         * @readonly
         * @type {?number}
         */
        public readonly budget: number | null;
        /**
         * Updates the batch job data stored in this object by requesting the metadata from the back-end.
         *
         * @async
         * @returns {Promise<Job>} The update job object (this).
         * @throws {Error}
         */
        describeJob(): Promise<Job>;
        /**
         * Modifies the batch job at the back-end and afterwards updates this object, too.
         *
         * @async
         * @param {object} parameters - An object with properties to update, each of them is optional, but at least one of them must be specified. Additional properties can be set if the server supports them.
         * @param {Process} parameters.process - A new process.
         * @param {string} parameters.title - A new title.
         * @param {string} parameters.description - A new description.
         * @param {string} parameters.plan - A new plan.
         * @param {number} parameters.budget - A new budget.
         * @returns {Promise<Job>} The updated job object (this).
         * @throws {Error}
         */
        updateJob(parameters: {
            process: Process;
            title: string;
            description: string;
            plan: string;
            budget: number;
        }): Promise<Job>;
        /**
         * Deletes the batch job from the back-end.
         *
         * @async
         * @throws {Error}
         */
        deleteJob(): Promise<void>;
        /**
         * Calculate an estimate (potentially time/costs/volume) for a batch job.
         *
         * @async
         * @returns {Promise<JobEstimate>} A response compatible to the API specification.
         * @throws {Error}
         */
        estimateJob(): Promise<JobEstimate>;
        /**
         * Get logs for the batch job from the back-end.
         *
         * @param {?string} [level=null] - Minimum level of logs to return.
         * @returns {Logs}
         */
        debugJob(level?: string | null): Logs;
        /**
         * Checks for status changes and new log entries every x seconds.
         *
         * On every status change observed or on new log entries (if supported by the
         * back-end and not disabled via `requestLogs`), the callback is executed.
         * It may also be executed once at the beginning.
         * The callback receives the updated job (this object) and the logs (array) passed.
         *
         * The monitoring stops once the job has finished, was canceled or errored out.
         *
         * This is only supported if describeJob is supported by the back-end.
         *
         * Returns a function that can be called to stop monitoring the job manually.
         *
         * @param {Function} callback
         * @param {number} [interval=60] - Interval between update requests, in seconds as integer.
         * @param {boolean} [requestLogs=true] - Enables/Disables requesting logs
         * @returns {Function}
         * @throws {Error}
         */
        monitorJob(callback: Function, interval?: number, requestLogs?: boolean): Function;
        /**
         * Starts / queues the batch job for processing at the back-end.
         *
         * @async
         * @returns {Promise<Job>} The updated job object (this).
         * @throws {Error}
         */
        startJob(): Promise<Job>;
        /**
         * Stops / cancels the batch job processing at the back-end.
         *
         * @async
         * @returns {Promise<Job>} The updated job object (this).
         * @throws {Error}
         */
        stopJob(): Promise<Job>;
        /**
         * Retrieves the STAC Item or Collection produced for the job results.
         *
         * The Item or Collection returned always complies to the latest STAC version (currently 1.0.0).
         *
         * @async
         * @returns {Promise<object.<string, *>>} The JSON-based response compatible to the API specification, but also including a `costs` property if present in the headers.
         * @throws {Error}
         */
        getResultsAsStac(): Promise<Record<string, any>>;
        /**
         * Retrieves download links.
         *
         * @async
         * @returns {Promise<Array.<Link>>} A list of links (object with href, rel, title, type and roles).
         * @throws {Error}
         */
        listResults(): Promise<Array<Link>>;
        /**
         * Downloads the results to the specified target folder. The specified target folder must already exist!
         *
         * NOTE: This method is only supported in a NodeJS environment. In a browser environment this method throws an exception!
         *
         * @async
         * @param {string} targetFolder - A target folder to store the file to, which must already exist.
         * @returns {Promise<Array.<string>|void>} Depending on the environment: A list of file paths of the newly created files (Node), throws in Browsers.
         * @throws {Error}
         */
        downloadResults(targetFolder: string): Promise<Array<string> | void>;
    }
    /**
     * A Stored Process Graph.
     *
     * @augments BaseEntity
     */
    export class UserProcess extends BaseEntity {
        /**
         * Creates an object representing a process graph stored at the back-end.
         *
         * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
         * @param {string} id - ID of a stored process graph.
         */
        constructor(connection: Connection, id: string);
        /**
         * The identifier of the process.
         * @public
         * @readonly
         * @type {string}
         */
        public readonly id: string;
        /**
         * @public
         * @readonly
         * @type {?string}
         */
        public readonly summary: string | null;
        /**
         * @public
         * @readonly
         * @type {?string}
         */
        public readonly description: string | null;
        /**
         * A list of categories.
         * @public
         * @readonly
         * @type {?Array.<string>}
         */
        public readonly categories: Array<string> | null;
        /**
         * A list of parameters.
         *
         * @public
         * @readonly
         * @type {?Array.<object.<string, *>>}
         */
        public readonly parameters: Array<Record<string, any>> | null;
        /**
         * Description of the data that is returned by this process.
         * @public
         * @readonly
         * @type {?object.<string, *>}
         */
        public readonly returns: Record<string, any> | null;
        /**
         * Specifies that the process or parameter is deprecated with the potential to be removed in any of the next versions.
         * @public
         * @readonly
         * @type {?boolean}
         */
        public readonly deprecated: boolean | null;
        /**
         * Declares the process or parameter to be experimental, which means that it is likely to change or may produce unpredictable behaviour.
         * @public
         * @readonly
         * @type {?boolean}
         */
        public readonly experimental: boolean | null;
        /**
         * Declares any exceptions (errors) that might occur during execution of this process.
         * @public
         * @readonly
         * @type {?object.<string, *>}
         */
        public readonly exceptions: Record<string, any> | null;
        /**
         * @public
         * @readonly
         * @type {?Array.<object.<string, *>>}
         */
        public readonly examples: Array<Record<string, any>> | null;
        /**
         * Links related to this process.
         * @public
         * @readonly
         * @type {?Array.<Link>}
         */
        public readonly links: Array<Link> | null;
        /**
         * @public
         * @readonly
         * @type {?object.<string, *>}
         */
        public readonly processGraph: Record<string, any> | null;
        /**
         * Updates the data stored in this object by requesting the process graph metadata from the back-end.
         *
         * @async
         * @returns {Promise<UserProcess>} The updated process graph object (this).
         * @throws {Error}
         */
        describeUserProcess(): Promise<UserProcess>;
        /**
         * Modifies the stored process graph at the back-end and afterwards updates this object, too.
         *
         * @async
         * @param {object} parameters - An object with properties to update, each of them is optional, but at least one of them must be specified. Additional properties can be set if the server supports them.
         * @param {Process} parameters.process - A new process.
         * @param {string} parameters.title - A new title.
         * @param {string} parameters.description - A new description.
         * @returns {Promise<UserProcess>} The updated process graph object (this).
         * @throws {Error}
         */
        replaceUserProcess(parameters: {
            process: Process;
            title: string;
            description: string;
        }): Promise<UserProcess>;
        /**
         * Deletes the stored process graph from the back-end.
         *
         * @async
         * @throws {Error}
         */
        deleteUserProcess(): Promise<void>;
    }
    /**
     * A Secondary Web Service.
     *
     * @augments BaseEntity
     */
    export class Service extends BaseEntity {
        /**
         * Creates an object representing a secondary web service stored at the back-end.
         *
         * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
         * @param {string} serviceId - The service ID.
         */
        constructor(connection: Connection, serviceId: string);
        /**
         * The identifier of the service.
         * @public
         * @readonly
         * @type {string}
         */
        public readonly id: string;
        /**
         * @public
         * @readonly
         * @type {?string}
         */
        public readonly title: string | null;
        /**
         * @public
         * @readonly
         * @type {?string}
         */
        public readonly description: string | null;
        /**
         * The process chain to be executed.
         * @public
         * @readonly
         * @type {?Process}
         */
        public readonly process: Process | null;
        /**
         * URL at which the secondary web service is accessible
         * @public
         * @readonly
         * @type {?string}
         */
        public readonly url: string | null;
        /**
         * Web service type (protocol / standard) that is exposed.
         * @public
         * @readonly
         * @type {?string}
         */
        public readonly type: string | null;
        /**
         * @public
         * @readonly
         * @type {?boolean}
         */
        public readonly enabled: boolean | null;
        /**
         * Map of configuration settings, i.e. the setting names supported by the secondary web service combined with actual values.
         * @public
         * @readonly
         * @type {?object.<string, *>}
         */
        public readonly configuration: Record<string, any> | null;
        /**
         * Additional attributes of the secondary web service, e.g. available layers for a WMS based on the bands in the underlying GeoTiff.
         * @public
         * @readonly
         * @type {?object.<string, *>}
         */
        public readonly attributes: Record<string, any> | null;
        /**
         * Date and time of creation, formatted as a RFC 3339 date-time.
         * @public
         * @readonly
         * @type {?string}
         */
        public readonly created: string | null;
        /**
         * The billing plan to process and charge the service with.
         * @public
         * @readonly
         * @type {?string}
         */
        public readonly plan: string | null;
        /**
         * An amount of money or credits in the currency specified by the back-end.
         * @public
         * @readonly
         * @type {?number}
         */
        public readonly costs: number | null;
        /**
         * Maximum amount of costs the request is allowed to produce in the currency specified by the back-end.
         * @public
         * @readonly
         * @type {?number}
         */
        public readonly budget: number | null;
        /**
         * Updates the data stored in this object by requesting the secondary web service metadata from the back-end.
         *
         * @async
         * @returns {Promise<Service>} The updates service object (this).
         * @throws {Error}
         */
        describeService(): Promise<Service>;
        /**
         * Modifies the secondary web service at the back-end and afterwards updates this object, too.
         *
         * @async
         * @param {object} parameters - An object with properties to update, each of them is optional, but at least one of them must be specified. Additional properties can be set if the server supports them.
         * @param {Process} parameters.process - A new process.
         * @param {string} parameters.title - A new title.
         * @param {string} parameters.description - A new description.
         * @param {boolean} parameters.enabled - Enables (`true`) or disables (`false`) the service.
         * @param {object.<string, *>} parameters.configuration - A new set of configuration parameters to set for the service.
         * @param {string} parameters.plan - A new plan.
         * @param {number} parameters.budget - A new budget.
         * @returns {Promise<Service>} The updated service object (this).
         * @throws {Error}
         */
        updateService(parameters: {
            process: Process;
            title: string;
            description: string;
            enabled: boolean;
            configuration: Record<string, any>;
            plan: string;
            budget: number;
        }): Promise<Service>;
        /**
         * Deletes the secondary web service from the back-end.
         *
         * @async
         * @throws {Error}
         */
        deleteService(): Promise<void>;
        /**
         * Get logs for the secondary web service from the back-end.
         *
         * @param {?string} [level=null] - Minimum level of logs to return.
         * @returns {Logs}
         */
        debugService(level?: string | null): Logs;
        /**
         * Checks for new log entries every x seconds.
         *
         * On every status change (enabled/disabled) observed or on new log entries
         * (if supported by the back-end and not disabled via `requestLogs`), the
         * callback is executed. It may also be executed once at the beginning.
         * The callback receives the updated service (this object) and the logs (array) passed.
         *
         * Returns a function that can be called to stop monitoring the service manually.
         * The monitoring must be stopped manually, otherwise it runs forever.
         *
         * This is only supported if describeService is supported by the back-end.
         *
         * @param {Function} callback
         * @param {number} [interval=60] - Interval between update requests, in seconds as integer.
         * @param {boolean} [requestLogs=true] - Enables/Disables requesting logs
         * @returns {Function}
         * @throws {Error}
         */
        monitorService(callback: Function, interval?: number, requestLogs?: boolean): Function;
    }
    /**
     * A class that represents a process parameter.
     *
     * This is used for two things:
     * 1. You can create process parameters (placeholders) with `new Parameter()`.
     * 2. This is passed to functions for the parameters of the sub-process.
     *
     * For the second case, you can access array elements referred to by the parameter
     * with a simplified notation:
     *
     * ```
     * function(data, context) {
     *     data['B1'] // Accesses the B1 element of the array by label
     *     data[1] // Accesses the second element of the array by index
     * }
     * ```
     *
     * Those array calls create corresponding `array_element` nodes in the process. So it's
     * equivalent to
     * `this.array_element(data, undefined, 'B1')` or
     * `this.array_element(data, 1)` respectively.
     *
     * Simple access to numeric labels is not supported. You need to use `array_element` directly, e.g.
     * `this.array_element(data, undefined, 1)`.
     */
    export class Parameter {
        /**
         * Creates a new parameter instance, but proxies calls to it
         * so that array access is possible (see class description).
         *
         * @static
         * @param {Builder} builder
         * @param {string} parameterName
         * @returns {Proxy<Parameter>}
         */
        static create(builder: Builder, parameterName: string): ProxyConstructor;
        /**
         * Creates a new process parameter.
         *
         * @param {string} name - Name of the parameter.
         * @param {object.<string, *>|string} schema - The schema for the parameter. Can be either an object compliant to JSON Schema or a string with a JSON Schema compliant data type, e.g. `string`.
         * @param {string} description - A description for the parameter
         * @param {*} defaultValue - An optional default Value for the parameter. If set, make the parameter optional. If not set, the parameter is required. Defaults to `undefined`.
         */
        constructor(name: string, schema?: Record<string, any> | string, description?: string, defaultValue?: any);
        name: string;
        spec: {
            name: string;
            schema: any;
            description: string;
        };
        /**
         * Returns a JSON serializable representation of the data that is API compliant.
         *
         * @returns {object.<string, *>}
         */
        toJSON(): Record<string, any>;
        /**
         * Returns the reference object for this parameter.
         *
         * @returns {FromParameter}
         */
        ref(): FromParameter;
    }
    export function Lexer(): {
        reset: (str: any) => void;
        next: () => {
            type: any;
            value: any;
            start: number;
            end: number;
        };
        peek: () => {
            type: any;
            value: any;
            start: number;
            end: number;
        };
    };
    export function Parser(): {
        parse: (expression: any) => {
            Expression: any;
        };
    };
    /**
     * This converts a mathematical formula into a openEO process for you.
     *
     * Operators: - (subtract), + (add), / (divide), * (multiply), ^ (power)
     *
     * It supports all mathematical functions (i.e. expects a number and returns a number) the back-end implements, e.g. `sqrt(x)`.
     * For namespaced processes, use for example `process@namespace(x)` - EXPERIMENTAL!
     *
     * Only available if a builder is specified in the constructor:
     * You can refer to output from processes with a leading `#`, e.g. `#loadco1` if the node to refer to has the key `loadco1`.
     *
     * Only available if a parent node is set via `setNode()`:
     * Parameters can be accessed simply by name.
     * If the first parameter is a (labeled) array, the value for a specific index or label can be accessed by typing the numeric index or textual label with a `$` in front, for example `$B1` for the label `B1` or `$0` for the first element in the array. Numeric labels are not supported.
     * You can access subsequent parameters by adding additional `$` at the beginning, e.g. `$$0` to access the first element of an array in the second parameter, `$$$0` for the same in the third parameter etc.
     *
     * An example that computes an EVI (assuming the labels for the bands are `NIR`, `RED` and `BLUE`): `2.5 * ($NIR - $RED) / (1 + $NIR + 6 * $RED + (-7.5 * $BLUE))`
     */
    export class Formula {
        /**
         * Creates a math formula object.
         *
         * @param {string} formula - A mathematical formula to parse.y
         */
        constructor(formula: string);
        /**
         * @type {object.<string, *>}
         */
        tree: Record<string, any>;
        /**
         * @type {Builder | null}
         */
        builder: Builder | null;
        /**
         * The builder instance to use.
         *
         * @param {Builder} builder - The builder instance to add the formula to.
         */
        setBuilder(builder: Builder): void;
        /**
         * Generates the processes for the formula specified in the constructor.
         *
         * Returns the last node that computes the result.
         *
         * @param {boolean} setResultNode - Set the `result` flag to `true`.
         * @returns {BuilderNode}
         * @throws {Error}
         */
        generate(setResultNode?: boolean): BuilderNode;
        /**
         * Walks through the tree generated by the TapDigit parser and generates process nodes.
         *
         * @protected
         * @param {object.<string, *>} tree
         * @returns {object.<string, *>}
         * @throws {Error}
         */
        protected parseTree(tree: Record<string, any>): Record<string, any>;
        /**
         * Gets the reference for a value, e.g. from_node or from_parameter.
         *
         * @protected
         * @param {*} value
         * @returns {*}
         */
        protected getRef(value: any): any;
        /**
         * Adds a process node for an operator like +, -, *, / etc.
         *
         * @param {string} operator - The operator.
         * @param {number|object.<string, *>} left - The left part for the operator.
         * @param {number|object.<string, *>} right - The right part for the operator.
         * @returns {BuilderNode}
         * @throws {Error}
         */
        addOperatorProcess(operator: string, left: number | Record<string, any>, right: number | Record<string, any>): BuilderNode;
    }
    export namespace Formula {
        let operatorMapping: Record<string, string>;
    }
    /**
     * A class that represents a process node and also a result from a process.
     */
    export class BuilderNode {
        /**
         * Creates a new process node for the builder.
         *
         * @param {Builder} parent
         * @param {string} processId
         * @param {object.<string, *>} [processArgs={}]
         * @param {?string} [processDescription=null]
         * @param {?string} [processNamespace=null]
         */
        constructor(parent: Builder, processId: string, processArgs?: Record<string, any>, processDescription?: string | null, processNamespace?: string | null);
        /**
         * The parent builder.
         * @type {Builder}
         */
        parent: Builder;
        /**
         * The specification of the process associated with this node.
         * @type {Process}
         * @readonly
         */
        readonly spec: Process;
        /**
         * The unique identifier for the node (not the process ID!).
         * @type {string}
         */
        id: string;
        /**
         * The namespace of the process - EXPERIMENTAL!
         * @type {string}
         */
        namespace: string;
        /**
         * The arguments for the process.
         * @type {object.<string, *>}
         */
        arguments: Record<string, any>;
        /**
         * @ignore
         */
        _description: string;
        /**
         * Is this the result node?
         * @type {boolean}
         */
        result: boolean;
        /**
         * Converts a sorted array of arguments to an object with the respective parameter names.
         *
         * @param {Array.<object.<string, *>>} processArgs
         * @returns {object.<string, *>}
         * @throws {Error}
         */
        namedArguments(processArgs: Array<Record<string, any>>): Record<string, any>;
        /**
         * Checks the arguments given for parameters and add them to the process.
         *
         * @param {object.<string, *>|Array} processArgs
         */
        addParametersToProcess(processArgs: Record<string, any> | any[]): void;
        /**
         * Gets/Sets a description for the node.
         *
         * Can be used in a variety of ways:
         *
         * By default, this is a function:
         * `node.description()` - Returns the description.
         * `node.description("foo")` - Sets the description to "foo". Returns the node itself for method chaining.
         *
         * You can also "replace" the function (not supported in TypeScript!),
         * then it acts as normal property and the function is not available any longer:
         * `node.description = "foo"` - Sets the description to "foo".
         * Afterwards you can call `node.description` as normal object property.
         *
         * @param {string|undefined} description - Optional: If given, set the value.
         * @returns {string|BuilderNode}
         */
        description(description: string | undefined): string | BuilderNode;
        /**
         * Converts the given argument into something serializable...
         *
         * @protected
         * @param {*} arg - Argument
         * @param {string} name - Parameter name
         * @returns {*}
         */
        protected exportArgument(arg: any, name: string): any;
        /**
         * Creates a new Builder, usually for a callback.
         *
         * @protected
         * @param {?BuilderNode} [parentNode=null]
         * @param {?string} [parentParameter=null]
         * @returns {BuilderNode}
         */
        protected createBuilder(parentNode?: BuilderNode | null, parentParameter?: string | null): BuilderNode;
        /**
         * Returns the serializable process for the callback function given.
         *
         * @protected
         * @param {Function} arg - callback function
         * @param {string} name - Parameter name
         * @returns {object.<string, *>}
         * @throws {Error}
         */
        protected exportCallback(arg: Function, name: string): Record<string, any>;
        /**
         * Returns a JSON serializable representation of the data that is API compliant.
         *
         * @returns {object.<string, *>}
         */
        toJSON(): Record<string, any>;
        /**
         * Returns the reference object for this node.
         *
         * @returns {FromNode}
         */
        ref(): FromNode;
    }
    /**
     * A class to construct processes easily.
     *
     * An example (`con` is a object of type `Connection`):
     *
     * ```
     * var builder = await con.buildProcess();
     *
     * var datacube = builder.load_collection(
     *   new Parameter("collection-id", "string", "The ID of the collection to load"), // collection-id is then a process parameter that can be specified by users.
     *   { "west": 16.1, "east": 16.6, "north": 48.6, "south": 47.2 },
     *   ["2018-01-01", "2018-02-01"],
     *   ["B02", "B04", "B08"]
     * );
     *
     * // Alternative 1 - using the Formula class
     * var eviAlgorithm = new Formula('2.5 * (($B08 - $B04) / (1 + $B08 + 6 * $B04 + -7.5 * $B02))');
     * // Alternative 2 - "by hand"
     * var eviAlgorithm = function(data) {
     *   var nir = data["B08"]; // Array access by label, accessing label "B08" here
     *   var red = data["B04"];
     *   var blue = data["B02"];
     *   return this.multiply(
     *     2.5,
     *     this.divide(
     *       this.subtract(nir, red),
     *       this.sum([
     *         1,
     *         nir,
     *         this.multiply(6, red),
     *         this.multiply(-7.5, blue)
     *       ])
     *     )
     *   );
     * };
     * datacube = builder.reduce_dimension(datacube, eviAlgorithm, "bands")
     *                   .description("Compute the EVI. Formula: 2.5 * (NIR - RED) / (1 + NIR + 6*RED + -7.5*BLUE)");
     *
     * var min = function(data) { return this.min(data); };
     * datacube = builder.reduce_dimension(datacube, min, "t");
     *
     * datacube = builder.save_result(datacube, "PNG");
     *
     * var storedProcess = await con.setUserProcess("evi", datacube);
     * ```
     *
     * As you can see above, the builder in callback functions is available as `this`.
     * Arrow functions do not support rebinding this and therefore the builder is passed as the last argument.
     *
     * So a normal function can be defined as follows:
     * ```
     * let callback = function(data) {
     *   return this.mean(data);
     * }
     * ```
     *
     * An arrow function on the other hand has to use the builder that is passed as the last parameter:
     * ```
     * let callback = (data, c, builder) => builder.mean(data);
     * ```
     *
     * Using arrow functions is available only since JS client version 1.3.0.
     * Beforehand it was not possible to use arrow functions in this context.
     */
    export class Builder {
        /**
         * Creates a Builder instance that can be used without connecting to a back-end.
         *
         * It requests the processes for the version specified from processes.openeo.org.
         * Requests the latest version if no version number is passed.
         *
         * @async
         * @static
         * @param {?string} [version=null]
         * @returns {Promise<Builder>}
         * @throws {Error}
         */
        static fromVersion(version?: string | null): Promise<Builder>;
        /**
         * Creates a Builder instance that can be used without connecting to a back-end.
         *
         * It requests the processes for the version specified from the given URL.
         * CORS needs to be implemented on the server-side for the URL given.
         *
         * @async
         * @static
         * @param {string | null} url
         * @returns {Promise<Builder>}
         * @throws {Error}
         */
        static fromURL(url: string | null): Promise<Builder>;
        /**
         * Creates a Builder instance.
         *
         * Each process passed to the constructor is made available as object method.
         *
         * @param {Array.<Process>|Processes|ProcessRegistry} processes - Either an array containing processes or an object compatible with `GET /processes` of the API.
         * @param {?Builder} parent - The parent builder, usually only used by the Builder itself.
         * @param {string} id - A unique identifier for the process.
         */
        constructor(processes: Array<Process> | Processes | ProcessRegistry, parent?: Builder | null, id?: string);
        /**
         * A unique identifier for the process.
         * @public
         * @type {string}
         */
        public id: string;
        /**
         * The parent builder.
         * @type {Builder | null}
         */
        parent: Builder | null;
        /**
         * The parent node.
         * @type {BuilderNode | null}
         */
        parentNode: BuilderNode | null;
        /**
         * The parent parameter name.
         * @type {string | null}
         */
        parentParameter: string | null;
        nodes: {};
        idCounter: {};
        callbackParameterCache: {};
        parameters: any;
        /**
         * List of all non-namespaced process specifications.
         * @type {ProcessRegistry}
         */
        processes: ProcessRegistry;
        /**
         * Creates a callable function on the builder object for a process.
         *
         * @param {Process} process
         * @throws {Error}
         */
        createFunction(process: Process): void;
        /**
         * Adds a process specification to the builder so that it can be used to create a process graph.
         *
         * @param {Process} process - Process specification compliant to openEO API
         * @param {?string} [namespace=null] - Namespace of the process (default to `null`, i.e. pre-defined processes). EXPERIMENTAL!
         * @throws {Error}
         */
        addProcessSpec(process: Process, namespace?: string | null): void;
        /**
         * Sets the parent for this Builder.
         *
         * @param {BuilderNode} node
         * @param {string} parameterName
         */
        setParent(node: BuilderNode, parameterName: string): void;
        /**
         * Creates a callback parameter with the given name.
         *
         * @protected
         * @param {string} parameterName
         * @returns {Proxy<Parameter>}
         */
        protected createCallbackParameter(parameterName: string): ProxyConstructor;
        /**
         * Gets the callback parameter specifics from the parent process.
         *
         * @returns {Array.<object.<string,*>>}
         * @todo Should this also pass callback parameters from parents until root is reached?
         */
        getParentCallbackParameters(): Array<Record<string, any>>;
        /**
         * Adds a parameter to the list of process parameters.
         *
         * Doesn't add the parameter if it has the same name as a callback parameter.
         *
         * @param {object.<string, *>} parameter - The parameter spec to add, must comply to the API.
         * @param {boolean} [root=true] - Adds the parameter to the root process if set to `true`, otherwise to the process constructed by this builder. Usually you want to add it to the root.
         */
        addParameter(parameter: Record<string, any>, root?: boolean): void;
        /**
         * Returns the process specification for the given process identifier and namespace (or `null`).
         *
         * @param {string} id - Process identifier
         * @param {?string} [namespace=null] - Namespace of the process (default to `null`, i.e. user or backend namespace). EXPERIMENTAL!
         * @returns {Process | null}
         */
        spec(id: string, namespace?: string | null): Process | null;
        /**
         * Adds a mathematical formula to the process.
         *
         * See the {@link Formula} class for more information.
         *
         * @param {string} formula
         * @returns {BuilderNode}
         * @throws {Error}
         * @see Formula
         */
        math(formula: string): BuilderNode;
        /**
         * Checks whether a process with the given id and namespace is supported by the back-end.
         *
         * @param {string} processId - The id of the process.
         * @param {?string} [namespace=null] - Namespace of the process (default to `null`, i.e. pre-defined processes). EXPERIMENTAL!
         * @returns {boolean}
         */
        supports(processId: string, namespace?: string | null): boolean;
        /**
         * Adds another process call to the process chain.
         *
         * @param {string} processId - The id of the process to call. To access a namespaced process, use the `process@namespace` notation.
         * @param {object.<string, *>|Array} [args={}] - The arguments as key-value pairs or as array. For objects, they keys must be the parameter names and the values must be the arguments. For arrays, arguments must be specified in the same order as in the corresponding process.
         * @param {?string} [description=null] - An optional description for the process call.
         * @returns {BuilderNode}
         */
        process(processId: string, args?: Record<string, any> | any[], description?: string | null): BuilderNode;
        /**
         * Returns a JSON serializable representation of the data that is API compliant.
         *
         * @returns {Process}
         */
        toJSON(): Process;
        /**
         * Generates a unique identifier for the process nodes.
         *
         * A prefix can be given to make the identifiers more human-readable.
         * If the given name is empty, the id is simply an incrementing number.
         *
         * @param {string} [prefix=""]
         * @returns {string}
         */
        generateId(prefix?: string): string;
    }
    /**
     * A class to handle pagination of resources.
     *
     * @abstract
     */
    export class Pages {
        /**
         * Creates an instance of Pages.
         *
         * @param {Connection} connection
         * @param {string} endpoint
         * @param {string} key
         * @param {Constructor} cls - Class
         * @param {object} [params={}]
         * @param {string} primaryKey
         */
        constructor(connection: Connection, endpoint: string, key: string, cls: Constructor, params?: object, primaryKey?: string);
        connection: Connection;
        nextUrl: string;
        key: string;
        primaryKey: string;
        cls: Constructor;
        params: any;
        /**
         * Returns true if there are more pages to fetch.
         *
         * @returns {boolean}
         */
        hasNextPage(): boolean;
        /**
         * Returns the next page of resources.
         *
         * @async
         * @param {Array.<object>} oldObjects - Existing objects to update, if any.
         * @param {boolean} [toArray=true] - Whether to return the objects as a simplified array or as an object with all information.
         * @returns {Array.<object>}
         * @throws {Error}
         */
        nextPage(oldObjects?: Array<object>, toArray?: boolean): Array<object>;
        /**
         * Ensures a variable is an array.
         *
         * @protected
         * @param {*} x
         * @returns {Array}
         */
        protected _ensureArray(x: any): any[];
        /**
         * Creates a facade for the object, if needed.
         *
         * @protected
         * @param {object} obj
         * @returns {object}
         */
        protected _createObject(obj: object): object;
        /**
         * Caches the plain objects if needed.
         *
         * @param {Array.<object>} objects
         * @returns {Array.<object>}
         */
        _cache(objects: Array<object>): Array<object>;
        /**
         * Get the URL of the next page from a response.
         *
         * @protected
         * @param {AxiosResponse} response
         * @returns {string | null}
         */
        protected _getNextLink(response: AxiosResponse): string | null;
        /**
         * Makes this class asynchronously iterable.
         *
         * @returns {AsyncIterator}
         */
        [Symbol.asyncIterator](): AsyncIterator<any, any, any>;
    }
    /**
     * Paginate through collections.
     */
    export class CollectionPages extends Pages {
        /**
         * Paginate through collections.
         *
         * @param {Connection} connection
         * @param {?number} limit
         */
        constructor(connection: Connection, limit?: number | null);
    }
    /**
     * Paginate through collection items.
     */
    export class ItemPages extends Pages {
        /**
         * Paginate through collection items.
         *
         * @param {Connection} connection
         * @param {string} collectionId
         * @param {object} params
         */
        constructor(connection: Connection, collectionId: string, params: object);
    }
    /**
     * Paginate through jobs.
     */
    export class JobPages extends Pages {
        /**
         * Paginate through jobs.
         *
         * @param {Connection} connection
         * @param {?number} limit
         */
        constructor(connection: Connection, limit?: number | null);
    }
    /**
     * Paginate through processes.
     */
    export class ProcessPages extends Pages {
        /**
         * Paginate through processes.
         *
         * @param {Connection} connection
         * @param {?number} limit
         * @param {?string} namespace
         */
        constructor(connection: Connection, limit?: number | null, namespace?: string | null);
        namespace: string;
    }
    /**
     * Paginate through services.
     */
    export class ServicePages extends Pages {
        /**
         * Paginate through services.
         *
         * @param {Connection} connection
         * @param {?number} limit
         */
        constructor(connection: Connection, limit?: number | null);
    }
    /**
     * Paginate through user files.
     */
    export class UserFilePages extends Pages {
        /**
         * Paginate through user files.
         *
         * @param {Connection} connection
         * @param {?number} limit
         */
        constructor(connection: Connection, limit?: number | null);
    }
    /**
     * A connection to a back-end.
     */
    export class Connection {
        /**
         * Creates a new Connection.
         *
         * @param {string} baseUrl - The versioned URL or the back-end instance.
         * @param {Options} [options={}] - Additional options for the connection.
         * @param {?string} [url=null] - User-provided URL of the backend connected to.
         */
        constructor(baseUrl: string, options?: Options, url?: string | null);
        /**
         * User-provided URL of the backend connected to.
         *
         * `null` if not given and the connection was directly made to a versioned instance of the back-end.
         *
         * @protected
         * @type {string | null}
         */
        protected url: string | null;
        /**
         * The versioned URL or the back-end instance.
         *
         * @protected
         * @type {string}
         */
        protected baseUrl: string;
        /**
         * Auth Provider cache
         *
         * @protected
         * @type {Array.<AuthProvider> | null}
         */
        protected authProviderList: Array<AuthProvider> | null;
        /**
         * Current auth provider
         *
         * @protected
         * @type {AuthProvider | null}
         */
        protected authProvider: AuthProvider | null;
        /**
         * Capability cache
         *
         * @protected
         * @type {Capabilities | null}
         */
        protected capabilitiesObject: Capabilities | null;
        /**
         * Listeners for events.
         *
         * @protected
         * @type {object.<string|Function>}
         */
        protected listeners: Record<string, Function>;
        /**
         * Additional options for the connection.
         *
         * @protected
         * @type {Options}
         */
        protected options: Options;
        /**
         * Process cache
         *
         * @protected
         * @type {ProcessRegistry}
         */
        protected processes: ProcessRegistry;
        /**
         * Refresh the cache for processes.
         *
         * @async
         * @protected
         * @returns {Promise}
         */
        protected refreshProcessCache(): Promise<any>;
        /**
         * Returns the URL of the versioned back-end instance currently connected to.
         *
         * @returns {string} The versioned URL or the back-end instance.
         */
        getBaseUrl(): string;
        /**
         * Returns the user-provided URL of the back-end currently connected to.
         *
         * @returns {string} The URL or the back-end.
         */
        getUrl(): string;
        /**
         * Returns the capabilities of the back-end.
         *
         * @returns {Capabilities} Capabilities
         */
        capabilities(): Capabilities;
        /**
         * List the supported output file formats.
         *
         * @async
         * @returns {Promise<FileTypes>} A response compatible to the API specification.
         * @throws {Error}
         */
        listFileTypes(): Promise<FileTypes>;
        /**
         * List the supported output file formats.
         *
         * @async
         * @returns {Promise<ProcessingParameters>} A response compatible to the API specification.
         * @throws {Error}
         */
        listProcessingParameters(): Promise<ProcessingParameters>;
        /**
         * List the supported secondary service types.
         *
         * @async
         * @returns {Promise<object.<string, ServiceType>>} A response compatible to the API specification.
         * @throws {Error}
         */
        listServiceTypes(): Promise<Record<string, ServiceType>>;
        /**
         * List the supported UDF runtimes.
         *
         * @async
         * @returns {Promise<object.<string, UdfRuntime>>} A response compatible to the API specification.
         * @throws {Error}
         */
        listUdfRuntimes(): Promise<Record<string, UdfRuntime>>;
        /**
         * List all collections available on the back-end.
         *
         * The collections returned always comply to the latest STAC version (currently 1.0.0).
         * This function adds a self link to the response if not present.
         *
         * @async
         * @returns {Promise<Collections>} A response compatible to the API specification.
         * @throws {Error}
         */
        listCollections(): Promise<Collections>;
        /**
         * Paginate through the collections available on the back-end.
         *
         * The collections returned always comply to the latest STAC version (currently 1.0.0).
         *
         * @param {?number} [limit=50] - The number of collections per request/page as integer. If `null`, requests all collections.
         * @returns {CollectionPages} A paged list of collections.
         */
        paginateCollections(limit?: number | null): CollectionPages;
        /**
         * Get further information about a single collection.
         *
         * The collection returned always complies to the latest STAC version (currently 1.0.0).
         *
         * @async
         * @param {string} collectionId - Collection ID to request further metadata for.
         * @returns {Promise<Collection>} - A response compatible to the API specification.
         * @throws {Error}
         */
        describeCollection(collectionId: string): Promise<Collection>;
        /**
         * Paginate through items for a specific collection.
         *
         * May not be available for all collections.
         *
         * The items returned always comply to the latest STAC version (currently 1.0.0).
         *
         * @async
         * @param {string} collectionId - Collection ID to request items for.
         * @param {?Array.<number>} [spatialExtent=null] - Limits the items to the given bounding box in WGS84:
         * 1. Lower left corner, coordinate axis 1
         * 2. Lower left corner, coordinate axis 2
         * 3. Upper right corner, coordinate axis 1
         * 4. Upper right corner, coordinate axis 2
         * @param {?Array} [temporalExtent=null] - Limits the items to the specified temporal interval.
         * The interval has to be specified as an array with exactly two elements (start, end) and
         * each must be either an RFC 3339 compatible string or a Date object.
         * Also supports open intervals by setting one of the boundaries to `null`, but never both.
         * @param {?number} [limit=null] - The amount of items per request/page as integer. If `null` (default), the back-end decides.
         * @returns {Promise<ItemPages>} A response compatible to the API specification.
         * @throws {Error}
         */
        listCollectionItems(collectionId: string, spatialExtent?: Array<number> | null, temporalExtent?: any[] | null, limit?: number | null): Promise<ItemPages>;
        /**
         * Normalisation of the namespace to a value that is compatible with the OpenEO specs - EXPERIMENTAL.
         *
         * This is required to support UDP that are shared as public. These can only be executed with providing the full URL
         * (e.g. https://<backend>/processes/<namespace>/<process_id>) as the namespace value in the processing graph. For other
         * parts of the API (such as the listing of the processes, only the name of the namespace is required.
         *
         * This function will extract the short name of the namespace from a shareable URL.
         *
         * @protected
         * @param {?string} namespace - Namespace of the process
         * @returns {?string}
         */
        protected normalizeNamespace(namespace: string | null): string | null;
        /**
         * List all processes available on the back-end.
         *
         * Requests pre-defined processes by default.
         * Set the namespace parameter to request processes from a specific namespace.
         *
         * Note: The list of namespaces can be retrieved by calling `listProcesses` without a namespace given.
         * The namespaces are then listed in the property `namespaces`.
         *
         * This function adds a self link to the response if not present.
         *
         * @async
         * @param {?string} [namespace=null] - Namespace of the processes (default to `null`, i.e. pre-defined processes). EXPERIMENTAL!
         * @returns {Promise<Processes>} - A response compatible to the API specification.
         * @throws {Error}
         */
        listProcesses(namespace?: string | null): Promise<Processes>;
        /**
         * Paginate through the processes available on the back-end.
         *
         * Requests pre-defined processes by default.
         * Set the namespace parameter to request processes from a specific namespace.
         *
         * Note: The list of namespaces can be retrieved by calling `listProcesses` without a namespace given.
         * The namespaces are then listed in the property `namespaces`.
         *
         * @param {?string} [namespace=null] - Namespace of the processes (default to `null`, i.e. pre-defined processes). EXPERIMENTAL!
         * @param {?number} [limit=50] - The number of processes per request/page as integer. If `null`, requests all processes.
         * @returns {ProcessPages} A paged list of processes.
         */
        paginateProcesses(namespace?: string | null, limit?: number | null): ProcessPages;
        /**
         * Get information about a single process.
         *
         * @async
         * @param {string} processId - Collection ID to request further metadata for.
         * @param {?string} [namespace=null] - Namespace of the process (default to `null`, i.e. pre-defined processes). EXPERIMENTAL!
         * @returns {Promise<?Process>} - A single process as object, or `null` if none is found.
         * @throws {Error}
         * @see Connection#listProcesses
         */
        describeProcess(processId: string, namespace?: string | null): Promise<Process | null>;
        /**
         * Returns an object to simply build user-defined processes based upon pre-defined processes.
         *
         * @async
         * @param {string} id - A name for the process.
         * @returns {Promise<Builder>}
         * @throws {Error}
         * @see Connection#listProcesses
         */
        buildProcess(id: string): Promise<Builder>;
        /**
         * List all authentication methods supported by the back-end.
         *
         * @async
         * @returns {Promise<Array.<AuthProvider>>} An array containing all supported AuthProviders (including all OIDC providers and HTTP Basic).
         * @throws {Error}
         * @see AuthProvider
         */
        listAuthProviders(): Promise<Array<AuthProvider>>;
        /**
         * This function is meant to create the OIDC providers used for authentication.
         *
         * The function gets passed a single argument that contains the
         * provider information as provided by the API, e.g. having the properties
         * `id`, `issuer`, `title` etc.
         *
         * The function must return an instance of AuthProvider or any derived class.
         * May return `null` if the instance can't be created.
         *
         * @callback oidcProviderFactoryFunction
         * @param {object.<string, *>} providerInfo - The provider information as provided by the API, having the properties `id`, `issuer`, `title` etc.
         * @returns {AuthProvider | null}
         */
        /**
         * Sets a factory function that creates custom OpenID Connect provider instances.
         *
         * You only need to call this if you have implemented a new AuthProvider based
         * on the AuthProvider interface (or OIDCProvider class), e.g. to use a
         * OIDC library other than oidc-client-js.
         *
         * @param {?oidcProviderFactoryFunction} [providerFactoryFunc=null]
         * @see AuthProvider
         */
        setOidcProviderFactory(providerFactoryFunc?: oidcProviderFactoryFunction | null): void;
        oidcProviderFactory: oidcProviderFactoryFunction;
        /**
         * Get the OpenID Connect provider factory.
         *
         * Returns `null` if OIDC is not supported by the client or an instance
         * can't be created for whatever reason.
         *
         * @returns {oidcProviderFactoryFunction | null}
         * @see AuthProvider
         */
        getOidcProviderFactory(): oidcProviderFactoryFunction | null;
        /**
         * Authenticates with username and password against a back-end supporting HTTP Basic Authentication.
         *
         * DEPRECATED in favor of using `listAuthProviders` and `BasicProvider`.
         *
         * @async
         * @deprecated
         * @param {string} username
         * @param {string} password
         * @see BasicProvider
         * @see Connection#listAuthProviders
         */
        authenticateBasic(username: string, password: string): Promise<void>;
        /**
         * Returns whether the user is authenticated (logged in) at the back-end or not.
         *
         * @returns {boolean} `true` if authenticated, `false` if not.
         */
        isAuthenticated(): boolean;
        /**
         * Emits the given event.
         *
         * @protected
         * @param {string} event
         * @param {...*} args
         */
        protected emit(event: string, ...args: any[]): void;
        /**
         * Registers a listener with the given event.
         *
         * Currently supported:
         * - authProviderChanged(provider): Raised when the auth provider has changed.
         * - tokenChanged(token): Raised when the access token has changed.
         * - processesChanged(type, data, namespace): Raised when the process registry has changed (i.e. a process was added, updated or deleted).
         *
         * @param {string} event
         * @param {Function} callback
         */
        on(event: string, callback: Function): void;
        /**
         * Removes a listener from the given event.
         *
         * @param {string} event
         */
        off(event: string): void;
        /**
         * Returns the AuthProvider.
         *
         * @returns {AuthProvider | null}
         */
        getAuthProvider(): AuthProvider | null;
        /**
         * Sets the AuthProvider.
         *
         * @param {AuthProvider} provider
         */
        setAuthProvider(provider: AuthProvider): void;
        /**
         * Sets the authentication token for the connection.
         *
         * This creates a new custom `AuthProvider` with the given details and returns it.
         * After calling this function you can make requests against the API.
         *
         * This is NOT recommended to use. Only use if you know what you are doing.
         * It is recommended to authenticate through `listAuthProviders` or related functions.
         *
         * @param {string} type - The authentication type, e.g. `basic` or `oidc`.
         * @param {string} providerId - The provider identifier. For OIDC the `id` of the provider.
         * @param {string} token - The actual access token as given by the authentication method during the login process.
         * @returns {AuthProvider}
         */
        setAuthToken(type: string, providerId: string, token: string): AuthProvider;
        /**
         * Get information about the authenticated user.
         *
         * Updates the User ID if available.
         *
         * @async
         * @returns {Promise<UserAccount>} A response compatible to the API specification.
         * @throws {Error}
         */
        describeAccount(): Promise<UserAccount>;
        /**
         * List all files from the user workspace.
         *
         * @async
         * @returns {Promise<ResponseArray.<UserFile>>} A list of files.
         * @throws {Error}
         */
        listFiles(): Promise<ResponseArray<UserFile>>;
        /**
         * Paginate through the files from the user workspace.
         *
         * @param {?number} [limit=50] - The number of files per request/page as integer. If `null`, requests all files.
         * @returns {ServicePages} A paged list of files.
         */
        paginateFiles(limit?: number | null): ServicePages;
        /**
         * A callback that is executed on upload progress updates.
         *
         * @callback uploadStatusCallback
         * @param {number} percentCompleted - The percent (0-100) completed.
         * @param {UserFile} file - The file object corresponding to the callback.
         */
        /**
         * Uploads a file to the user workspace.
         * If a file with the name exists, overwrites it.
         *
         * This method has different behaviour depending on the environment.
         * In a nodeJS environment the source must be a path to a file as string.
         * In a browser environment the source must be an object from a file upload form.
         *
         * @async
         * @param {*} source - The source, see method description for details.
         * @param {?string} [targetPath=null] - The target path on the server, relative to the user workspace. Defaults to the file name of the source file.
         * @param {?uploadStatusCallback} [statusCallback=null] - Optionally, a callback that is executed on upload progress updates.
         * @param {?AbortController} [abortController=null] - An AbortController object that can be used to cancel the upload process.
         * @returns {Promise<UserFile>}
         * @throws {Error}
         */
        uploadFile(source: any, targetPath?: string | null, statusCallback?: uploadStatusCallback | null, abortController?: AbortController | null): Promise<UserFile>;
        /**
         * Opens a (existing or non-existing) file without reading any information or creating a new file at the back-end.
         *
         * @async
         * @param {string} path - Path to the file, relative to the user workspace.
         * @returns {Promise<UserFile>} A file.
         * @throws {Error}
         */
        getFile(path: string): Promise<UserFile>;
        /**
         * Takes a UserProcess, BuilderNode or a plain object containing process nodes
         * and converts it to an API compliant object.
         *
         * @param {UserProcess|BuilderNode|object.<string, *>} process - Process to be normalized.
         * @param {object.<string, *>} additional - Additional properties to be merged with the resulting object.
         * @returns {object.<string, *>}
         * @protected
         */
        protected _normalizeUserProcess(process: UserProcess | BuilderNode | Record<string, any>, additional?: Record<string, any>): Record<string, any>;
        /**
         * Validates a user-defined process at the back-end.
         *
         * @async
         * @param {Process} process - User-defined process to validate.
         * @returns {Promise<ValidationResult>} errors - A list of API compatible error objects. A valid process returns an empty list.
         * @throws {Error}
         */
        validateProcess(process: Process): Promise<ValidationResult>;
        /**
         * List all user-defined processes of the authenticated user.
         *
         * @async
         * @param {Array.<UserProcess>} [oldProcesses=[]] - A list of existing user-defined processes to update.
         * @returns {Promise<ResponseArray.<UserProcess>>} A list of user-defined processes.
         * @throws {Error}
         */
        listUserProcesses(oldProcesses?: Array<UserProcess>): Promise<ResponseArray<UserProcess>>;
        /**
         * Paginates through the user-defined processes of the authenticated user.
         *
         * @param {?number} [limit=50] - The number of processes per request/page as integer. If `null`, requests all processes.
         * @returns {ProcessPages} A paged list of user-defined processes.
         */
        paginateUserProcesses(limit?: number | null): ProcessPages;
        /**
         * Creates a new stored user-defined process at the back-end.
         *
         * @async
         * @param {string} id - Unique identifier for the process.
         * @param {Process} process - A user-defined process.
         * @returns {Promise<UserProcess>} The new user-defined process.
         * @throws {Error}
         */
        setUserProcess(id: string, process: Process): Promise<UserProcess>;
        /**
         * Get all information about a user-defined process.
         *
         * @async
         * @param {string} id - Identifier of the user-defined process.
         * @returns {Promise<UserProcess>} The user-defined process.
         * @throws {Error}
         */
        getUserProcess(id: string): Promise<UserProcess>;
        /**
         * Executes a process synchronously and returns the result as the response.
         *
         * Please note that requests can take a very long time of several minutes or even hours.
         *
         * @async
         * @param {Process} process - A user-defined process.
         * @param {?AbortController} [abortController=null] - An AbortController object that can be used to cancel the processing request.
         * @param {object.<string, *>} [additional={}] - Other parameters to pass for the batch job, e.g. `log_level`.
         * @returns {Promise<SyncResult>} - An object with the data and some metadata.
         */
        computeResult(process: Process, abortController?: AbortController | null, additional?: Record<string, any>): Promise<SyncResult>;
        /**
         * Executes a process synchronously and downloads to result the given path.
         *
         * Please note that requests can take a very long time of several minutes or even hours.
         *
         * This method has different behaviour depending on the environment.
         * If a NodeJs environment, writes the downloaded file to the target location on the file system.
         * In a browser environment, offers the file for downloading using the specified name (folders are not supported).
         *
         * @async
         * @param {Process} process - A user-defined process.
         * @param {string} targetPath - The target, see method description for details.
         * @param {?string} [plan=null] - The billing plan to use for this computation.
         * @param {?number} [budget=null] - The maximum budget allowed to spend for this computation.
         * @param {?AbortController} [abortController=null] - An AbortController object that can be used to cancel the processing request.
         * @throws {Error}
         */
        downloadResult(process: Process, targetPath: string, plan?: string | null, budget?: number | null, abortController?: AbortController | null): Promise<void>;
        /**
         * List all batch jobs of the authenticated user.
         *
         * @async
         * @param {Array.<Job>} [oldJobs=[]] - A list of existing jobs to update.
         * @returns {Promise<ResponseArray.<Job>>} A list of jobs.
         * @throws {Error}
         */
        listJobs(oldJobs?: Array<Job>): Promise<ResponseArray<Job>>;
        /**
         * Paginate through the batch jobs of the authenticated user.
         *
         * @param {?number} [limit=50] - The number of jobs per request/page as integer. If `null`, requests all jobs.
         * @returns {JobPages} A paged list of jobs.
         */
        paginateJobs(limit?: number | null): JobPages;
        /**
         * Creates a new batch job at the back-end.
         *
         * @async
         * @param {Process} process - A user-define process to execute.
         * @param {?string} [title=null] - A title for the batch job.
         * @param {?string} [description=null] - A description for the batch job.
         * @param {?string} [plan=null] - The billing plan to use for this batch job.
         * @param {?number} [budget=null] - The maximum budget allowed to spend for this batch job.
         * @param {object.<string, *>} [additional={}] - Other parameters to pass for the batch job, e.g. `log_level`.
         * @returns {Promise<Job>} The stored batch job.
         * @throws {Error}
         */
        createJob(process: Process, title?: string | null, description?: string | null, plan?: string | null, budget?: number | null, additional?: Record<string, any>): Promise<Job>;
        /**
         * Get all information about a batch job.
         *
         * @async
         * @param {string} id - Batch Job ID.
         * @returns {Promise<Job>} The batch job.
         * @throws {Error}
         */
        getJob(id: string): Promise<Job>;
        /**
         * List all secondary web services of the authenticated user.
         *
         * @async
         * @param {Array.<Service>} [oldServices=[]] - A list of existing services to update.
         * @returns {Promise<ResponseArray.<Service>>} A list of services.
         * @throws {Error}
         */
        listServices(oldServices?: Array<Service>): Promise<ResponseArray<Service>>;
        /**
         * Paginate through the secondary web services of the authenticated user.
         *
         * @param {?number} [limit=50] - The number of services per request/page as integer. If `null` (default), requests all services.
         * @returns {ServicePages} A paged list of services.
         */
        paginateServices(limit?: number | null): ServicePages;
        /**
         * Creates a new secondary web service at the back-end.
         *
         * @async
         * @param {Process} process - A user-defined process.
         * @param {string} type - The type of service to be created (see `Connection.listServiceTypes()`).
         * @param {?string} [title=null] - A title for the service.
         * @param {?string} [description=null] - A description for the service.
         * @param {boolean} [enabled=true] - Enable the service (`true`, default) or not (`false`).
         * @param {object.<string, *>} [configuration={}] - Configuration parameters to pass to the service.
         * @param {?string} [plan=null] - The billing plan to use for this service.
         * @param {?number} [budget=null] - The maximum budget allowed to spend for this service.
         * @param {object.<string, *>} [additional={}] - Other parameters to pass for the service, e.g. `log_level`.
         * @returns {Promise<Service>} The stored service.
         * @throws {Error}
         */
        createService(process: Process, type: string, title?: string | null, description?: string | null, enabled?: boolean, configuration?: Record<string, any>, plan?: string | null, budget?: number | null, additional?: Record<string, any>): Promise<Service>;
        /**
         * Get all information about a secondary web service.
         *
         * @async
         * @param {string} id - Service ID.
         * @returns {Promise<Service>} The service.
         * @throws {Error}
         */
        getService(id: string): Promise<Service>;
        /**
         * Adds additional response details to the array.
         *
         * Adds links and federation:missing.
         *
         * @protected
         * @param {Array.<*>} arr
         * @param {object.<string, *>} response
         * @returns {ResponseArray}
         */
        protected _toResponseArray(arr: Array<any>, response: object<string, any>): ResponseArray;
        /**
         * Sends a GET request.
         *
         * @protected
         * @async
         * @param {string} path
         * @param {object.<string, *>} query
         * @param {string} responseType - Response type according to axios, defaults to `json`.
         * @param {?AbortController} [abortController=null] - An AbortController object that can be used to cancel the request.
         * @returns {Promise<AxiosResponse>}
         * @throws {Error}
         * @see https://github.com/axios/axios#request-config
         */
        protected _get(path: string, query: Record<string, any>, responseType: string, abortController?: AbortController | null): Promise<AxiosResponse>;
        /**
         * Sends a POST request.
         *
         * @protected
         * @async
         * @param {string} path
         * @param {*} body
         * @param {string} responseType - Response type according to axios, defaults to `json`.
         * @param {?AbortController} [abortController=null] - An AbortController object that can be used to cancel the request.
         * @returns {Promise<AxiosResponse>}
         * @throws {Error}
         * @see https://github.com/axios/axios#request-config
         */
        protected _post(path: string, body: any, responseType: string, abortController?: AbortController | null): Promise<AxiosResponse>;
        /**
         * Sends a PUT request.
         *
         * @protected
         * @async
         * @param {string} path
         * @param {*} body
         * @returns {Promise<AxiosResponse>}
         * @throws {Error}
         */
        protected _put(path: string, body: any): Promise<AxiosResponse>;
        /**
         * Sends a PATCH request.
         *
         * @protected
         * @async
         * @param {string} path
         * @param {*} body
         * @returns {Promise<AxiosResponse>}
         * @throws {Error}
         */
        protected _patch(path: string, body: any): Promise<AxiosResponse>;
        /**
         * Sends a DELETE request.
         *
         * @protected
         * @async
         * @param {string} path
         * @returns {Promise<AxiosResponse>}
         * @throws {Error}
         */
        protected _delete(path: string): Promise<AxiosResponse>;
        /**
         * Downloads data from a URL.
         *
         * May include authorization details where required.
         *
         * @param {string} url - An absolute or relative URL to download data from.
         * @param {boolean} authorize - Send authorization details (`true`) or not (`false`).
         * @returns {Promise<Readable|Blob>} - Returns the data as `Stream` in NodeJS environments or as `Blob` in browsers
         * @throws {Error}
         */
        download(url: string, authorize: boolean): Promise<Readable | Blob>;
        /**
         * Get the authorization header for requests.
         *
         * @protected
         * @returns {object.<string, string>}
         */
        protected _getAuthHeaders(): Record<string, string>;
        /**
         * Sends a HTTP request.
         *
         * Options mostly conform to axios,
         * see {@link https://github.com/axios/axios#request-config}.
         *
         * Automatically sets a baseUrl and the authorization information.
         * Default responseType is `json`.
         *
         * Tries to smoothly handle error responses by providing an object for all response types,
         * instead of Streams or Blobs for non-JSON response types.
         *
         * @protected
         * @async
         * @param {object.<string, *>} options
         * @param {?AbortController} [abortController=null] - An AbortController object that can be used to cancel the request.
         * @returns {Promise<AxiosResponse>}
         * @throws {Error}
         * @see https://github.com/axios/axios
         */
        protected _send(options: Record<string, any>, abortController?: AbortController | null): Promise<AxiosResponse>;
    }
    namespace Connection {
        export { oidcProviderFactoryFunction, uploadStatusCallback };
    }
    /**
     * This function is meant to create the OIDC providers used for authentication.
     *
     * The function gets passed a single argument that contains the
     * provider information as provided by the API, e.g. having the properties
     * `id`, `issuer`, `title` etc.
     *
     * The function must return an instance of AuthProvider or any derived class.
     * May return `null` if the instance can't be created.
     */
    type oidcProviderFactoryFunction = (providerInfo: any) => AuthProvider | null;
    /**
     * Main class to start with openEO. Allows to connect to a server.
     *
     * @hideconstructor
     */
    export class Client {
        /**
         * Connect to a back-end with version discovery (recommended).
         *
         * Includes version discovery (request to `GET /well-known/openeo`) and connects to the most suitable version compatible to this JS client version.
         * Requests the capabilities and authenticates where required.
         *
         * @async
         * @param {string} url - The server URL to connect to.
         * @param {Options} [options={}] - Additional options for the connection.
         * @returns {Promise<Connection>}
         * @throws {Error}
         * @static
         */
        static connect(url: string, options?: Options): Promise<Connection>;
        /**
         * Connects directly to a back-end instance, without version discovery (NOT recommended).
         *
         * Doesn't do version discovery, therefore a URL of a versioned API must be specified. Requests the capabilities and authenticates where required.
         *
         * @async
         * @param {string} versionedUrl - The server URL to connect to.
         * @param {Options} [options={}] - Additional options for the connection.
         * @returns {Promise<Connection>}
         * @throws {Error}
         * @static
         */
        static connectDirect(versionedUrl: string, options?: Options): Promise<Connection>;
        /**
         * Returns the version number of the client.
         *
         * Not to confuse with the API version(s) supported by the client.
         *
         * @returns {string} Version number (according to SemVer).
         */
        static clientVersion(): string;
    }
    export namespace Client {
        const Environment: Environment;
    }

    /**
     * An error.
     */
    export type ApiError = {
        id: string;
        code: string;
        message: string;
        links: Array<Link>;
    };
    /**
     * Authentication Provider details.
     */
    export type AuthProviderMeta = {
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
    /**
     * Response for a HTTP request.
     */
    export type AxiosResponse = {
        data: any;
        status: number;
        statusText: string;
        headers: any;
        config: Record<string, any>;
        request: any;
    };
    export type BillingPlan = {
        /**
         * Name of the billing plan.
         */
        name: string;
        /**
         * A description of the billing plan, may include CommonMark syntax.
         */
        description: string;
        /**
         * `true` if it is a paid plan, otherwise `false`.
         */
        paid: boolean;
        /**
         * A URL pointing to a page describing the billing plan.
         */
        url: string;
        /**
         * `true` if it is the default plan of the back-end, otherwise `false`.
         */
        default: boolean;
    };
    export type Collections = {
        collections: Array<Collection>;
        links: Array<Link>;
        /**
         * "federation:missing"] A list of backends from the federation that are missing in the response data.
         */
	"federation:missing": Array<string>;
    };
    export type Collection = Record<string, any>;
    export type FileTypesAPI = {
        /**
         * - File types supported to import
         */
        input: Record<string, FileType>;
        /**
         * - File types supported to export
         */
        output: Record<string, FileType>;
    };
    export type FileType = {
        title: string;
        description: string;
        gis_data_types: Array<string>;
        parameters: Record<string, any>;
        links: Array<Link>;
    };
    /**
     * Reference to a parameter.
     */
    export type FromNode = {
        /**
         * - The node identifier.
         */
        from_node: string;
    };
    /**
     * Reference to a parameter.
     */
    export type FromParameter = {
        /**
         * - The name of the parameter.
         */
        from_parameter: string;
    };
    export type Item = Record<string, any>;
    export type ItemCollection = {
        /**
         * - The items in the collection.
         */
        features: Array<Item>;
        /**
         * - Additional links, e.g. for pagination.
         */
        links: Array<Link> | null;
        /**
         * This property indicates the time and date when the response was generated.
         */
        timeStamp: string | null;
        /**
         * The number (integer) of features of the feature type that match the selection parameters.
         */
        numberMatched: number | null;
        /**
         * The number (integer) of features in the feature collection.
         */
        numberReturned: number | null;
    };
    export type JobEstimate = {
        costs: number | null;
        duration: string;
        /**
         * in bytes as integer
         */
        size: number;
        /**
         * integer
         */
        downloads_included: number | null;
        expires: string;
    };
    /**
     * A link to another resource.
     */
    export type Link = {
        /**
         * The URL to the resource.
         */
        href: string;
        /**
         * Relation type
         */
        rel: string | null;
        /**
         * Media type
         */
        type: string | null;
        /**
         * Human-readable title
         */
        title: string | null;
        /**
         * A list of roles, if link is originating from an asset.
         */
        roles: Array<string> | null;
    };
    export type LogsAPI = {
        logs: Array<Log>;
        links: Array<Link>;
    };
    /**
     * A log entry.
     */
    export type Log = {
        id: string;
        code: string;
        level: string;
        message: string;
        data: any;
        path: Array<Record<string, string | null>>;
        links: Array<Link>;
    };
    /**
     * Default OpenID Connect Client as returned by the API.
     */
    export type OidcClient = {
        /**
         * Client ID
         */
        id: string;
        /**
         * Supported Grant Types
         */
        grant_types: Array<string>;
        /**
         * Allowed Redirect URLs
         */
        redirect_urls: Array<string>;
    };
    /**
     * OpenID Connect Provider details as returned by the API.
     */
    export type OidcProviderMeta = {
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
         * Default OpenID Connect Clients
         */
        default_clients: Array<OidcClient>;
        /**
         * Links
         */
        links: Array<Link>;
    };
    /**
     * Connection options.
     */
    export type Options = {
        /**
         * Add a namespace property to processes if set to `true`. Defaults to `false`.
         */
        addNamespaceToProcess: boolean;
    };
    export type Processes = {
        processes: Array<Process>;
        links: Array<Link>;
        /**
         * EXPERIMENTAL!
         */
        namespaces: Array<string> | null;
        /**
         * "federation:missing"] A list of backends from the federation that are missing in the response data.
         */
	"federation:missing": Array<string>;
    };
    /**
     * An openEO processing chain.
     */
    export type Process = Record<string, any>;
    /**
     * A specific processing parameter.
     */
    type ProcessingParameter = object<string, any>;
    /**
     * All types of processing parameters.
     */
    type ProcessingParameters = {
        /**
         * Processing parameters for batch jobs.
         */
        create_job_parameters: Array<ProcessingParameter>;
        /**
         * Processing parameters for secondary web services.
         */
        create_service_parameters: Array<ProcessingParameter>;
        /**
         * Processing parameters for synchronous processing.
         */
        create_synchronous_parameters: Array<ProcessingParameter>;
    };
    /**
     * A back-end in the federation.
     */
    export type FederationBackend = {
        /**
         * ID of the back-end within the federation.
         */
        id: string;
        /**
         * URL to the versioned API endpoint of the back-end.
         */
        url: string;
        /**
         * Name of the back-end.
         */
        title: string;
        /**
         * A description of the back-end and its specifics.
         */
        description: string;
        /**
         * Current status of the back-end (online or offline).
         */
        status: string;
        /**
         * The time at which the status of the back-end was checked last, formatted as a RFC 3339 date-time.
         */
        last_status_check: string;
        /**
         * If the `status` is `offline`: The time at which the back-end was checked and available the last time. Otherwise, this is equal to the property `last_status_check`. Formatted as a RFC 3339 date-time.
         */
        last_successful_check: string;
        /**
         * Declares the back-end to be experimental.
         */
        experimental: boolean;
        /**
         * Declares the back-end to be deprecated.
         */
        deprecated: boolean;
    };
    /**
     * An array, but enriched with additional details from an openEO API response.
     *
     * Adds two properties: `links` and `federation:missing`.
     */
    export type ResponseArray = any;
    export type ServiceType = Record<string, any>;
    export type SyncResult = {
        /**
         * The data as `Stream` in NodeJS environments or as `Blob` in browsers.
         */
        data: Readable | Blob;
        /**
         * The costs for the request in the currency exposed by the back-end.
         */
        costs: number | null;
        /**
         * The content media type returned by the back-end.
         */
        type: string | null;
        /**
         * Array of log entries as specified in the API.
         */
        logs: Array<Log>;
    };
    export type UdfRuntime = Record<string, any>;
    export type UserAccountStorage = {
        /**
         * in bytes as integer
         */
        free: number;
        /**
         * in bytes as integer
         */
        quota: number;
    };
    export type UserAccount = {
        user_id: string;
        name: string | null;
        default_plan: string | null;
        storage: UserAccountStorage | null;
        budget: number | null;
        links: Array<Link> | null;
    };
    /**
     * An array, but enriched with additional details from an openEO API response.
     *
     * Adds the property `federation:backends`.
     */
    export type ValidationResult = any;
}

export = Client;