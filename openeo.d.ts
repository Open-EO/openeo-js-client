/// <reference types="node" />

import { User, UserManager } from 'oidc-client';
import { Readable } from 'stream';

declare module OpenEO {
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
         * @param {Array} properties - A mapping from the API property names to the JS client property names (usually to convert between snake_case and camelCase), e.g. `["id", "title", ["process_graph", "processGraph"]]`
         */
        constructor(connection: Connection, properties?: any[]);
        /**
         * @protected
         * @type {Connection}
         */
        protected connection: Connection;
        /**
         * @protected
         * @type {object.<string, string>}
         */
        protected apiToClientNames: any;
        /**
         * @protected
         * @type {object.<string, string>}
         */
        protected clientToApiNames: any;
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
        protected extra: any;
        /**
         * Returns a JSON serializable representation of the data that is API compliant.
         *
         * @returns {object.<string, *>}
         */
        toJSON(): any;
        /**
         * Converts the data from an API response into data suitable for our JS client models.
         *
         * @param {object.<string, *>} metadata - JSON object originating from an API response.
         * @returns {BaseEntity} Returns the object itself.
         */
        setAll(metadata: any): BaseEntity;
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
        getAll(): any;
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
        protected _convertToRequest(parameters: any): any;
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
         * Returns the name of the Environment, `Node` or `Browser`.
         *
         * @returns {string}
         * @static
         */
        static getName(): string;
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
        static base64encode(str: string|Buffer): string;
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
        static downloadResults(con: any, assets: Array<any>, targetFolder: string): Promise<void>;
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
        /**
         * Authenticate with HTTP Basic.
         * 
         * @async
         * @param {string} username 
         * @param {string} password 
         * @returns {Promise<void>}
         * @throws {Error}
         */
        login(username: string, password: string) : Promise<void>;
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
        constructor(data: any);
        /**
         * @private
         * @type {object.<string, *>}
         */
        private data;
        /**
         * @private
         * @type {Array.<string>}
         */
        private features;
        /**
         * @private
         * @ignore
         * @type {object.<string, string>}
         */
        private featureMap;
        /**
         * Returns the capabilities response as a JSON serializable representation of the data that is API compliant.
         *
         * @returns {object.<string, *>} - A reference to the capabilities response.
         */
        toJSON(): any;
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
         * Get the billing currency.
         *
         * @returns {?string} The billing currency or `null` if not available.
         */
        currency(): string | null;
        /**
         * List all billing plans.
         *
         * @returns {Array.<BillingPlan>} Billing plans
         */
        listPlans(): Array<BillingPlan>;
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
         * @param {object.<string, *>} [options={}] - Object with additional options.
         * @returns {Promise<User>} For uiMethod = 'redirect' only: OIDC User (to be assigned to the Connection via setUser if no provider has been specified). 
         * @throws Error
         * @see https://github.com/IdentityModel/oidc-client-js/wiki#other-optional-settings
         */
        static signinCallback(provider?: OidcProvider, options?: any): Promise<User>;
        /**
         * Creates a new OidcProvider instance to authenticate using OpenID Connect.
         *
         * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
         * @param {OidcProviderMeta} options - OpenID Connect Provider details as returned by the API.
         */
        constructor(connection: Connection, options: OidcProviderMeta);
        issuer: string;
        scopes: string[];
        links: Link[];
        manager: UserManager;
        user: User;
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
         * @returns {User}
         */
        getUser(): User;
        /**
         * Sets the OIDC User.
         *
         * @see https://github.com/IdentityModel/oidc-client-js/wiki#user
         * @param {User} user - The OIDC User returned by OidcProvider.signinCallback(). Passing `null` resets OIDC authentication details.
         */
        setUser(user: User): void;
    }
    export namespace OidcProvider {
        const uiMethod: string;
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
         * @type {FileTypesAPI}
         */
        data: FileTypesAPI;
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
        getInputTypes(): any;
        /**
         * Returns the output file formats.
         *
         * @returns {object.<string, FileType>}
         */
        getOutputTypes(): any;
        /**
         * Returns a single input file format for a given identifier.
         *
         * Returns null if no input file format was found for the given identifier.
         *
         * @param {string} type - Case-insensitive file format identifier
         * @returns {?FileType}
         */
        getInputType(type: string): FileType | null;
        /**
         * Returns a single output file format for a given identifier.
         *
         * Returns null if no output file format was found for the given identifier.
         *
         * @param {string} type - Case-insensitive file format identifier
         * @returns {?FileType}
         */
        getOutputType(type: string): FileType | null;
        /**
         * Get a file type object from the list of input or output file formats.
         *
         * @param {string} type - Identifier of the file type
         * @param {string} io - Either `input` or `output`
         * @returns {?FileType}
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
         * @returns {Promise<UserFile>}
         * @throws {Error}
         */
        uploadFile(source: any, statusCallback?: (percentCompleted: number, file: UserFile) => any): Promise<UserFile>;
        /**
         * Deletes the file from the user workspace.
         *
         * @async
         * @throws {Error}
         */
        deleteFile(): Promise<void>;
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
         */
        constructor(connection: Connection, endpoint: string);
        /**
         * @protected
         * @type {Connection}
         */
        protected connection: Connection;
        endpoint: string;
        lastId: string;
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
         * @type {Process}
         */
        public readonly process: Process;
        /**
         * The current status of a batch job.
         * One of "created", "queued", "running", "canceled", "finished" or "error".
         * @public
         * @readonly
         * @type {string}
         */
        public readonly status: string;
        /**
         * Indicates the process of a running batch job in percent.
         * @public
         * @readonly
         * @type {number}
         */
        public readonly progress: number;
        /**
         * Date and time of creation, formatted as a RFC 3339 date-time.
         * @public
         * @readonly
         * @type {string}
         */
        public readonly created: string;
        /**
         * Date and time of the last status change, formatted as a RFC 3339 date-time.
         * @public
         * @readonly
         * @type {string}
         */
        public readonly updated: string;
        /**
         * The billing plan to process and charge the batch job with.
         * @public
         * @readonly
         * @type {string}
         */
        public readonly plan: string;
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
         * @returns {Logs}
         */
        debugJob(): Logs;
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
         * Retrieves the STAC Item produced for the job results.
         * 
         * The Item returned always complies to the latest STAC version (currently 1.0.0-rc.1). 
         *
         * @async
         * @returns {Promise<object.<string, *>>} The JSON-based response compatible to the API specification, but also including a `costs` property if present in the headers.
         * @throws {Error}
         * @deprecated
         */
        getResultsAsItem(): Promise<any>;
        /**
         * Retrieves the STAC Item or Collection produced for the job results.
         * 
         * The Item or Collection returned always complies to the latest STAC version (currently 1.0.0-rc.1). 
         *
         * @async
         * @returns {Promise<object.<string, *>>} The JSON-based response compatible to the API specification, but also including a `costs` property if present in the headers.
         * @throws {Error}
         */
        getResultsAsStac(): Promise<any>;
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
         * @type {Array.<string>}
         */
        public readonly categories: Array<string>;
        /**
         * A list of parameters.
         *
         * @public
         * @readonly
         * @type {?Array.<object.<string, *>>}
         */
        public readonly parameters: Array<any> | null;
        /**
         * Description of the data that is returned by this process.
         * @public
         * @readonly
         * @type {?object.<string, *>}
         */
        public readonly returns: any;
        /**
         * Specifies that the process or parameter is deprecated with the potential to be removed in any of the next versions.
         * @public
         * @readonly
         * @type {boolean}
         */
        public readonly deprecated: boolean;
        /**
         * Declares the process or parameter to be experimental, which means that it is likely to change or may produce unpredictable behaviour.
         * @public
         * @readonly
         * @type {boolean}
         */
        public readonly experimental: boolean;
        /**
         * Declares any exceptions (errors) that might occur during execution of this process.
         * @public
         * @readonly
         * @type {object.<string, *>}
         */
        public readonly exceptions: any;
        /**
         * @public
         * @readonly
         * @type {Array.<object.<string, *>>}
         */
        public readonly examples: Array<any>;
        /**
         * Links related to this process.
         * @public
         * @readonly
         * @type {Array.<Link>}
         */
        public readonly links: Array<Link>;
        /**
         * @public
         * @readonly
         * @type {object.<string, *>}
         */
        public readonly processGraph: any;
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
         * @type {Process}
         */
        public readonly process: Process;
        /**
         * URL at which the secondary web service is accessible
         * @public
         * @readonly
         * @type {string}
         */
        public readonly url: string;
        /**
         * Web service type (protocol / standard) that is exposed.
         * @public
         * @readonly
         * @type {string}
         */
        public readonly type: string;
        /**
         * @public
         * @readonly
         * @type {boolean}
         */
        public readonly enabled: boolean;
        /**
         * Map of configuration settings, i.e. the setting names supported by the secondary web service combined with actual values.
         * @public
         * @readonly
         * @type {object.<string, *>}
         */
        public readonly configuration: any;
        /**
         * Additional attributes of the secondary web service, e.g. available layers for a WMS based on the bands in the underlying GeoTiff.
         * @public
         * @readonly
         * @type {object.<string, *>}
         */
        public readonly attributes: any;
        /**
         * Date and time of creation, formatted as a RFC 3339 date-time.
         * @public
         * @readonly
         * @type {string}
         */
        public readonly created: string;
        /**
         * The billing plan to process and charge the service with.
         * @public
         * @readonly
         * @type {string}
         */
        public readonly plan: string;
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
            configuration: any;
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
         * @returns {Logs}
         */
        debugService(): Logs;
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
        constructor(name: string, schema?: any | string, description?: string, defaultValue?: any);
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
        toJSON(): any;
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
     *
     * Only available if a builder is specified in the constructor:
     * You can refer to output from processes with a leading `#`, e.g. `#loadco1` if the node to refer to has the key `loadco1`.
     *
     * Only available if a parent node is set via `setNode()`:
     * Parameters can be accessed simply by name.
     * If the first parameter is a (labeled) array, the value for a specific index or label can be accessed by typing the numeric index or textual label with a $ in front, for example $B1 for the label B1 or $0 for the first element in the array. Numeric labels are not supported.
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
        tree: any;
        /**
         * @type {?Builder}
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
        protected parseTree(tree: any): any;
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
        addOperatorProcess(operator: string, left: number | any, right: number | any): BuilderNode;
    }
    export namespace Formula {
        const operatorMapping: any;
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
         */
        constructor(parent: Builder, processId: string, processArgs?: any, processDescription?: string | null);
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
         * The arguments for the process.
         * @type {object.<string, *>}
         */
        arguments: any;
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
         * @param {Array} processArgs
         * @returns {object.<string, *>}
         * @throws {Error}
         */
        namedArguments(processArgs: any[]): any;
        /**
         * Checks the arguments given for parameters and add them to the process.
         *
         * @param {object.<string, *>|Array} processArgs
         */
        addParametersToProcess(processArgs: any | any[]): void;
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
         * @param {?string} parentParameter
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
        protected exportCallback(arg: Function, name: string): any;
        /**
         * Returns a JSON serializable representation of the data that is API compliant.
         *
         * @returns {object.<string, *>}
         */
        toJSON(): any;
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
         * @param {?string} version
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
         * @param {?string} url
         * @returns {Promise<Builder>}
         * @throws {Error}
         */
        static fromURL(url: string | null): Promise<Builder>;
        /**
         * Creates a Builder instance.
         *
         * Each process passed to the constructor is made available as object method.
         *
         * @param {Array.<Process>|Processes} processes - Either an array containing processes or an object compatible with `GET /processes` of the API.
         * @param {?Builder} parent - The parent builder, usually only used by the Builder itself.
         * @param {string} id - A unique identifier for the process.
         */
        constructor(processes: Array<Process> | Processes, parent?: Builder | null, id?: string);
        /**
         * List of all process specifications.
         * @type {Array.<Process>}
         */
        processes: Array<Process>;
        /**
         * The parent builder.
         * @type {?Builder}
         */
        parent: Builder | null;
        /**
         * The parent node.
         * @type {?BuilderNode}
         */
        parentNode: BuilderNode | null;
        /**
         * The parent parameter name.
         * @type {?string}
         */
        parentParameter: string | null;
        nodes: {};
        idCounter: {};
        callbackParameterCache: {};
        parameters: any;
        /**
         * A unique identifier for the process.
         * @public
         * @type {string}
         */
        public id: string;
        /**
         * Adds a process specification to the builder so that it can be used to create a process graph.
         *
         * @param {Process} process - Process specification compliant to openEO API
         * @throws {Error}
         */
        addProcessSpec(process: Process): void;
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
         * @returns {Array}
         * @todo Should this also pass callback parameters from parents until root is reached?
         */
        getParentCallbackParameters(): any[];
        /**
         * Adds a parameter to the list of process parameters.
         *
         * Doesn't add the parameter if it has the same name as a callback parameter.
         *
         * @param {object.<string, *>} parameter - The parameter spec to add, must comply to the API.
         * @param {boolean} [root=true] - Adds the parameter to the root process if set to `true`, otherwise to the process constructed by this builder. Usually you want to add it to the root.
         */
        addParameter(parameter: any, root?: boolean): void;
        /**
         * Returns the process specification for the given process identifier.
         *
         * @param {string} id
         * @returns {Process}
         */
        spec(id: string): Process;
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
         * Adds another process call to the process chain.
         *
         * @param {string} processId - The id of the process to call.
         * @param {object.<string, *>|Array} args - The arguments as key-value pairs or as array. For objects, they keys must be the parameter names and the values must be the arguments. For arrays, arguments must be specified in the same order as in the corresponding process.
         * @param {?string} description - An optional description for the process call.
         * @returns {BuilderNode}
         */
        process(processId: string, args?: any | any[], description?: string | null): BuilderNode;
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
     * A connection to a back-end.
     */
    export class Connection {
        /**
         * Creates a new Connection.
         *
         * @param {string} baseUrl - URL to the back-end
         */
        constructor(baseUrl: string);
        /**
         * @type {string}
         */
        baseUrl: string;
        /**
         * @type {?Array.<AuthProvider>}
         */
        authProviderList: Array<AuthProvider> | null;
        /**
         * @type {?AuthProvider}
         */
        authProvider: AuthProvider | null;
        /**
         * @type {?Capabilities}
         */
        capabilitiesObject: Capabilities | null;
        processes: any;
        /**
         * Initializes the connection by requesting the capabilities.
         *
         * @async
         * @returns {Promise<Capabilities>} Capabilities
         */
        init(): Promise<Capabilities>;
        /**
         * Returns the URL of the back-end currently connected to.
         *
         * @returns {string} The URL or the back-end.
         */
        getBaseUrl(): string;
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
         * List the supported secondary service types.
         *
         * @async
         * @returns {Promise<object.<string, ServiceType>>} A response compatible to the API specification.
         * @throws {Error}
         */
        listServiceTypes(): Promise<any>;
        /**
         * List the supported UDF runtimes.
         *
         * @async
         * @returns {Promise<object.<string, UdfRuntime>>} A response compatible to the API specification.
         * @throws {Error}
         */
        listUdfRuntimes(): Promise<any>;
        /**
         * List all collections available on the back-end.
         * 
         * The collections returned always comply to the latest STAC version (currently 1.0.0-rc.1).
         *
         * @async
         * @returns {Promise<Collections>} A response compatible to the API specification.
         * @throws {Error}
         */
        listCollections(): Promise<Collections>;
        /**
         * Get further information about a single collection.
         * 
         * The collection returned always complies to the latest STAC version (currently 1.0.0-rc.1). 
         *
         * @async
         * @param {string} collectionId - Collection ID to request further metadata for.
         * @returns {Promise<Collection>} - A response compatible to the API specification.
         * @throws {Error}
         */
        describeCollection(collectionId: string): Promise<Collection>;
        /**
         * Loads items for a specific image collection.
         * May not be available for all collections.
         * 
         * The items returned always comply to the latest STAC version (currently 1.0.0-rc.1). 
         *
         * This is an experimental API and is subject to change.
         *
         * @async
         * @param {string} collectionId - Collection ID to request items for.
         * @param {?Array.<number>} spatialExtent - Limits the items to the given bounding box in WGS84:
         * 1. Lower left corner, coordinate axis 1
         * 2. Lower left corner, coordinate axis 2
         * 3. Upper right corner, coordinate axis 1
         * 4. Upper right corner, coordinate axis 2
         * @param {?Array.<*>} temporalExtent - Limits the items to the specified temporal interval.
         * The interval has to be specified as an array with exactly two elements (start, end) and
         * each must be either an RFC 3339 compatible string or a Date object.
         * Also supports open intervals by setting one of the boundaries to `null`, but never both.
         * @param {?number} limit - The amount of items per request/page as integer. If `null` (default), the back-end decides.
         * @yields {Promise<ItemCollection>} A response compatible to the API specification.
         * @throws {Error}
         */
        listCollectionItems(collectionId: string, spatialExtent?: Array<number> | null, temporalExtent?: Array<any> | null, limit?: number | null): AsyncGenerator<any, void, unknown>;
        /**
         * List all processes available on the back-end.
         *
         * Data is cached in memory.
         *
         * @async
         * @returns {Promise<Processes>} - A response compatible to the API specification.
         * @throws {Error}
         */
        listProcesses(): Promise<Processes>;
        /**
         * Get information about a single process.
         *
         * @async
         * @param {string} processId - Collection ID to request further metadata for.
         * @returns {Promise<?Process>} - A single process as object, or `null` if none is found.
         * @throws {Error}
         * @see Connection#listProcesses
         */
        describeProcess(processId: string): Promise<Process | null>;
        /**
         * Returns an object to simply build user-defined processes.
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
         * @returns {?AuthProvider}
         */
        /**
         * Sets a factory function that creates custom OpenID Connect provider instances.
         *
         * You only need to call this if you have implemented a new AuthProvider based
         * on the AuthProvider interface (or OIDCProvider class), e.g. to use a
         * OIDC library other than oidc-client-js.
         *
         * @param {?oidcProviderFactoryFunction} providerFactoryFunc
         * @see AuthProvider
         */
        setOidcProviderFactory(providerFactoryFunc: (providerInfo: any) => AuthProvider | null): void;
        oidcProviderFactory: (providerInfo: any) => AuthProvider | null;
        /**
         * Get the OpenID Connect provider factory.
         *
         * Returns `null` if OIDC is not supported by the client or an instance
         * can't be created for whatever reason.
         *
         * @returns {?oidcProviderFactoryFunction}
         * @see AuthProvider
         */
        getOidcProviderFactory(): (providerInfo: any) => AuthProvider | null;
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
         * Returns the AuthProvider.
         *
         * @returns {?AuthProvider}
         */
        getAuthProvider(): AuthProvider | null;
        /**
         * Sets the AuthProvider.
         *
         * The provider must have a token set.
         *
         * @param {AuthProvider} provider
         * @throws {Error}
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
         * Lists all files from the user workspace.
         *
         * @async
         * @returns {Promise<Array.<UserFile>>} A list of files.
         * @throws {Error}
         */
        listFiles(): Promise<Array<UserFile>>;
        /**
         * A callback that is executed on upload progress updates.
         *
         * @callback uploadStatusCallback
         * @param {number} percentCompleted - The percent (0-100) completed.
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
         * @returns {Promise<UserFile>}
         * @throws {Error}
         */
        uploadFile(source: any, targetPath?: string | null, statusCallback?: (percentCompleted: number) => any): Promise<UserFile>;
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
        protected _normalizeUserProcess(process: UserProcess | BuilderNode | any, additional?: any): any;
        /**
         * Validates a user-defined process at the back-end.
         *
         * @async
         * @param {Process} process - User-defined process to validate.
         * @returns {Promise<Array.<ApiError>>} errors - A list of API compatible error objects. A valid process returns an empty list.
         * @throws {Error}
         */
        validateProcess(process: Process): Promise<Array<ApiError>>;
        /**
         * Lists all user-defined processes of the authenticated user.
         *
         * @async
         * @returns {Promise<Array.<UserProcess>>} A list of user-defined processes.
         * @throws {Error}
         */
        listUserProcesses(): Promise<Array<UserProcess>>;
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
         * @param {?string} [plan=null] - The billing plan to use for this computation.
         * @param {?number} [budget=null] - The maximum budget allowed to spend for this computation.
         * @returns {Promise<SyncResult>} - An object with the data and some metadata.
         */
        computeResult(process: Process, plan?: string | null, budget?: number | null): Promise<SyncResult>;
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
         * @throws {Error}
         */
        downloadResult(process: Process, targetPath: string, plan?: string | null, budget?: number | null): Promise<void>;
        /**
         * Lists all batch jobs of the authenticated user.
         *
         * @async
         * @returns {Promise<Array.<Job>>} A list of jobs.
         * @throws {Error}
         */
        listJobs(): Promise<Array<Job>>;
        /**
         * Creates a new batch job at the back-end.
         *
         * @async
         * @param {Process} process - A user-define process to execute.
         * @param {?string} [title=null] - A title for the batch job.
         * @param {?string} [description=null] - A description for the batch job.
         * @param {?string} [plan=null] - The billing plan to use for this batch job.
         * @param {?number} [budget=null] - The maximum budget allowed to spend for this batch job.
         * @param {object.<string, *>} [additional={}] - Proprietary parameters to pass for the batch job.
         * @returns {Promise<Job>} The stored batch job.
         * @throws {Error}
         */
        createJob(process: Process, title?: string | null, description?: string | null, plan?: string | null, budget?: number | null, additional?: any): Promise<Job>;
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
         * Lists all secondary web services of the authenticated user.
         *
         * @async
         * @returns {Promise<Array.<Job>>} A list of services.
         * @throws {Error}
         */
        listServices(): Promise<Array<Job>>;
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
         * @param {object.<string, *>} [additional={}] - Proprietary parameters to pass for the batch job.
         * @returns {Promise<Service>} The stored service.
         * @throws {Error}
         */
        createService(process: Process, type: string, title?: string | null, description?: string | null, enabled?: boolean, configuration?: any, plan?: string | null, budget?: number | null, additional?: any): Promise<Service>;
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
         * Get the a link with the given rel type.
         *
         * @param {Array.<Link>} links - An array of links.
         * @param {string} rel - Relation type to find, defaults to `next`.
         * @returns {?string}
         * @throws {Error}
         */
        _getLinkHref(links: Array<Link>, rel?: string): string | null;
        /**
         * Sends a GET request.
         *
         * @async
         * @param {string} path
         * @param {object.<string, *>} query
         * @param {string} responseType - Response type according to axios, defaults to `json`.
         * @returns {Promise<AxiosResponse>}
         * @throws {Error}
         * @see https://github.com/axios/axios#request-config
         */
        _get(path: string, query: any, responseType: string): Promise<AxiosResponse>;
        /**
         * Sends a POST request.
         *
         * @async
         * @param {string} path
         * @param {*} body
         * @param {string} responseType - Response type according to axios, defaults to `json`.
         * @returns {Promise<AxiosResponse>}
         * @throws {Error}
         * @see https://github.com/axios/axios#request-config
         */
        _post(path: string, body: any, responseType: string): Promise<AxiosResponse>;
        /**
         * Sends a PUT request.
         *
         * @async
         * @param {string} path
         * @param {*} body
         * @returns {Promise<AxiosResponse>}
         * @throws {Error}
         */
        _put(path: string, body: any): Promise<AxiosResponse>;
        /**
         * Sends a PATCH request.
         *
         * @async
         * @param {string} path
         * @param {*} body
         * @returns {Promise<AxiosResponse>}
         * @throws {Error}
         */
        _patch(path: string, body: any): Promise<AxiosResponse>;
        /**
         * Sends a DELETE request.
         *
         * @async
         * @param {string} path
         * @returns {Promise<AxiosResponse>}
         * @throws {Error}
         */
        _delete(path: string): Promise<AxiosResponse>;
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
         * @async
         * @param {object.<string, *>} options
         * @returns {Promise<AxiosResponse>}
         * @throws {Error}
         * @see https://github.com/axios/axios
         */
        _send(options: any): Promise<AxiosResponse>;
    }
    /**
     * Main class to start with openEO. Allows to connect to a server.
     *
     * @hideconstructor
     */
    export class OpenEO {
        /**
         * Connect to a back-end with version discovery (recommended).
         *
         * Includes version discovery (request to `GET /well-known/openeo`) and connects to the most suitable version compatible to this JS client version.
         * Requests the capabilities and authenticates where required.
         *
         * @async
         * @param {string} url - The server URL to connect to.
         * @returns {Promise<Connection>}
         * @throws {Error}
         * @static
         */
        static connect(url: string): Promise<Connection>;
        /**
         * Connects directly to a back-end instance, without version discovery (NOT recommended).
         *
         * Doesn't do version discovery, therefore a URL of a versioned API must be specified. Requests the capabilities and authenticates where required.
         *
         * @async
         * @param {string} versionedUrl - The server URL to connect to.
         * @returns {Promise<Connection>}
         * @throws {Error}
         * @static
         */
        static connectDirect(versionedUrl: string): Promise<Connection>;
        /**
         * Returns the version number of the client.
         *
         * Not to confuse with the API version(s) supported by the client.
         *
         * @returns {string} Version number (according to SemVer).
         */
        static clientVersion(): string;
    }
    export namespace OpenEO {
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
        config: any;
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
    };
    export type Collection = any;
    export type FileTypesAPI = {
        /**
         * - File types supported to import
         */
        input: any;
        /**
         * - File types supported to export
         */
        output: any;
    };
    export type FileType = {
        title: string;
        description: string;
        gis_data_types: Array<string>;
        parameters: any;
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
    export type Item = any;
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
        path: Array<any>;
        links: Array<Link>;
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
         * Links
         */
        links: Array<Link>;
    };
    export type Processes = {
        processes: Array<Process>;
        links: Array<Link>;
    };
    /**
     * An openEO processing chain.
     */
    export type Process = any;
    export type ServiceType = any;
    export type SyncResult = {
        /**
         * The data as `Stream` in NodeJS environments or as `Blob` in browsers.
         */
        data: any | Blob;
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
    export type UdfRuntime = any;
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
        name: string;
        storage: UserAccountStorage;
        budget: number | null;
        links: Array<Link>;
    };

}

export = OpenEO;