/// <reference types="node" />
export = Connection;
/**
 * A connection to a back-end.
 */
declare class Connection {
    /**
     * Creates a new Connection.
     *
     * @param {string} baseUrl - URL to the back-end
     */
    constructor(baseUrl: string);
    baseUrl: any;
    authProviderList: any[];
    authProvider: import("./authprovider");
    capabilitiesObject: import("./capabilities");
    processes: any;
    /**
     * Initializes the connection by requesting the capabilities.
     *
     * @async
     * @returns {Promise<Capabilities>} Capabilities
     */
    init(): Promise<import("./capabilities")>;
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
    capabilities(): import("./capabilities");
    /**
     * List the supported output file formats.
     *
     * @async
     * @returns {Promise<FileTypes>} A response compatible to the API specification.
     * @throws {Error}
     */
    listFileTypes(): Promise<import("./filetypes")>;
    /**
     * List the supported secondary service types.
     *
     * @async
     * @returns {Promise<object>} A response compatible to the API specification.
     * @throws {Error}
     */
    listServiceTypes(): Promise<object>;
    /**
     * List the supported UDF runtimes.
     *
     * @async
     * @returns {Promise<object>} A response compatible to the API specification.
     * @throws {Error}
     */
    listUdfRuntimes(): Promise<object>;
    /**
     * List all collections available on the back-end.
     *
     * @async
     * @returns {Promise<object>} A response compatible to the API specification.
     * @throws {Error}
     */
    listCollections(): Promise<object>;
    /**
     * Get further information about a single collection.
     *
     * @async
     * @param {string} collectionId - Collection ID to request further metadata for.
     * @returns {Promise<object>} - A response compatible to the API specification.
     * @throws {Error}
     */
    describeCollection(collectionId: string): Promise<object>;
    /**
     * List all processes available on the back-end.
     *
     * Data is cached in memory.
     *
     * @async
     * @returns {Promise<object>} - A response compatible to the API specification.
     * @throws {Error}
     */
    listProcesses(): Promise<object>;
    /**
     * Get information about a single process.
     *
     * @async
     * @param {string} processId - Collection ID to request further metadata for.
     * @returns {Promise<?object>} - A single process as object, or `null` if none is found.
     * @throws {Error}
     * @see Connection#listProcesses
     */
    describeProcess(processId: string): Promise<object | null>;
    /**
     * Returns an object to simply build user-defined processes.
     *
     * @async
     * @param {string} id - A name for the process.
     * @returns {Promise<Builder>}
     * @throws {Error}
     * @see Connection#listProcesses
     */
    buildProcess(id: string): Promise<import("./builder/builder")>;
    /**
     * List all authentication methods supported by the back-end.
     *
     * @async
     * @returns {Promise<AuthProvider[]>} An array containing all supported AuthProviders (including all OIDC providers and HTTP Basic).
     * @throws {Error}
     * @see AuthProvider
     */
    listAuthProviders(): Promise<import("./authprovider")[]>;
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
     * @param {object} providerInfo - The provider information as provided by the API, having the properties `id`, `issuer`, `title` etc.
     * @returns {?AuthProvider}
     */
    /**
     * Sets a factory function that creates custom OpenID Connect provider instances.
     *
     * You only need to call this if you have implemented a new AuthProvider based
     * on the AuthProvider interface (or OIDCProvider class), e.g. to use a
     * OIDC library other than oidc-client-js.
     *
     * @param {oidcProviderFactoryFunction} providerFactoryFunc
     * @see AuthProvider
     */
    setOidcProviderFactory(providerFactoryFunc: (providerInfo: object) => import("./authprovider") | null): void;
    oidcProviderFactory: (providerInfo: object) => import("./authprovider") | null;
    /**
     * Get the OpenID Connect provider factory.
     *
     * Returns `null` if OIDC is not supported by the client or an instance
     * can't be created for whatever reason.
     *
     * @returns {oidcProviderFactoryFunction}
     * @see AuthProvider
     */
    getOidcProviderFactory(): (providerInfo: object) => import("./authprovider") | null;
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
     * @returns {AuthProvider}
     */
    getAuthProvider(): import("./authprovider");
    /**
     * Sets the AuthProvider.
     *
     * The provider must have a token set.
     *
     * @param {AuthProvider} provider
     * @throws {Error}
     */
    setAuthProvider(provider: import("./authprovider")): void;
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
     * @returns {sAuthProvider}
     */
    setAuthToken(type: string, providerId: string, token: string): any;
    /**
     * Get information about the authenticated user.
     *
     * Updates the User ID if available.
     *
     * @async
     * @returns {Promise<object>} A response compatible to the API specification.
     * @throws {Error}
     */
    describeAccount(): Promise<object>;
    /**
     * Lists all files from the user workspace.
     *
     * @async
     * @returns {Promise<UserFile[]>} A list of files.
     * @throws {Error}
     */
    listFiles(): Promise<import("./userfile")[]>;
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
     * @param {string|object} source - The source, see method description for details.
     * @param {?string} [targetPath=null] - The target path on the server, relative to the user workspace. Defaults to the file name of the source file.
     * @param {?uploadStatusCallback} [statusCallback=null] - Optionally, a callback that is executed on upload progress updates.
     * @returns {Promise<UserFile>}
     * @throws {Error}
     */
    uploadFile(source: string | object, targetPath?: string | null, statusCallback?: (percentCompleted: number) => any): Promise<import("./userfile")>;
    /**
     * Opens a (existing or non-existing) file without reading any information or creating a new file at the back-end.
     *
     * @async
     * @param {string} path - Path to the file, relative to the user workspace.
     * @returns {Promise<UserFile>} A file.
     * @throws {Error}
     */
    getFile(path: string): Promise<import("./userfile")>;
    /**
     * Takes a UserProcess, BuilderNode or a plain object containing process nodes
     * and converts it to an API compliant object.
     *
     * @param {UserProcess|BuilderNode|object} process - Process to be normalized.
     * @param {object} additional - Additional properties to be merged with the resulting object.
     * @returns {object}
     * @protected
     */
    protected _normalizeUserProcess(process: import("./userprocess") | import("./builder/node") | object, additional?: object): object;
    /**
     * Validates a user-defined process at the back-end.
     *
     * @async
     * @param {object} process - User-defined process to validate.
     * @returns {Promise<object[]>} errors - A list of API compatible error objects. A valid process returns an empty list.
     * @throws {Error}
     */
    validateProcess(process: object): Promise<object[]>;
    /**
     * Lists all user-defined processes of the authenticated user.
     *
     * @async
     * @returns {Promise<UserProcess[]>} A list of user-defined processes.
     * @throws {Error}
     */
    listUserProcesses(): Promise<import("./userprocess")[]>;
    /**
     * Creates a new stored user-defined process at the back-end.
     *
     * @async
     * @param {string} id - Unique identifier for the process.
     * @param {object} process - A user-defined process.
     * @returns {Promise<UserProcess>} The new user-defined process.
     * @throws {Error}
     */
    setUserProcess(id: string, process: object): Promise<import("./userprocess")>;
    /**
     * Get all information about a user-defined process.
     *
     * @async
     * @param {string} id - Identifier of the user-defined process.
     * @returns {Promise<UserProcess>} The user-defined process.
     * @throws {Error}
     */
    getUserProcess(id: string): Promise<import("./userprocess")>;
    /**
     * @typedef SyncResult
     * @type {object}
     * @property {Stream.Readable|Blob} data The data as `Stream` in NodeJS environments or as `Blob` in browsers.
     * @property {?number} costs The costs for the request in the currency exposed by the back-end.
     * @property {object[]} logs Array of log entries as specified in the API.
     */
    /**
     * Executes a process synchronously and returns the result as the response.
     *
     * Please note that requests can take a very long time of several minutes or even hours.
     *
     * @async
     * @param {object} process - A user-defined process.
     * @param {string} [plan=null] - The billing plan to use for this computation.
     * @param {number} [budget=null] - The maximum budget allowed to spend for this computation.
     * @returns {Promise<SyncResult>} - An object with the data and some metadata.
     */
    computeResult(process: object, plan?: string, budget?: number): Promise<{
        /**
         * The data as `Stream` in NodeJS environments or as `Blob` in browsers.
         */
        data: import("stream").Readable | Blob;
        /**
         * The costs for the request in the currency exposed by the back-end.
         */
        costs: number | null;
        /**
         * Array of log entries as specified in the API.
         */
        logs: object[];
    }>;
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
     * @param {object} process - A user-defined process.
     * @param {string} targetPath - The target, see method description for details.
     * @param {string} [plan=null] - The billing plan to use for this computation.
     * @param {number} [budget=null] - The maximum budget allowed to spend for this computation.
     * @throws {Error}
     */
    downloadResult(process: object, targetPath: string, plan?: string, budget?: number): Promise<void>;
    /**
     * Lists all batch jobs of the authenticated user.
     *
     * @async
     * @returns {Promise<Job[]>} A list of jobs.
     * @throws {Error}
     */
    listJobs(): Promise<import("./job")[]>;
    /**
     * Creates a new batch job at the back-end.
     *
     * @async
     * @param {object} process - A user-define process to execute.
     * @param {string} [title=null] - A title for the batch job.
     * @param {string} [description=null] - A description for the batch job.
     * @param {string} [plan=null] - The billing plan to use for this batch job.
     * @param {number} [budget=null] - The maximum budget allowed to spend for this batch job.
     * @param {object} [additional={}] - Proprietary parameters to pass for the batch job.
     * @returns {Promise<Job>} The stored batch job.
     * @throws {Error}
     */
    createJob(process: object, title?: string, description?: string, plan?: string, budget?: number, additional?: object): Promise<import("./job")>;
    /**
     * Get all information about a batch job.
     *
     * @async
     * @param {string} id - Batch Job ID.
     * @returns {Promise<Job>} The batch job.
     * @throws {Error}
     */
    getJob(id: string): Promise<import("./job")>;
    /**
     * Lists all secondary web services of the authenticated user.
     *
     * @async
     * @returns {Promise<Job[]>} A list of services.
     * @throws {Error}
     */
    listServices(): Promise<import("./job")[]>;
    /**
     * Creates a new secondary web service at the back-end.
     *
     * @async
     * @param {object} process - A user-defined process.
     * @param {string} type - The type of service to be created (see `Connection.listServiceTypes()`).
     * @param {string} [title=null] - A title for the service.
     * @param {string} [description=null] - A description for the service.
     * @param {boolean} [enabled=true] - Enable the service (`true`, default) or not (`false`).
     * @param {object} [configuration={}] - Configuration parameters to pass to the service.
     * @param {string} [plan=null] - The billing plan to use for this service.
     * @param {number} [budget=null] - The maximum budget allowed to spend for this service.
     * @param {object} [additional={}] - Proprietary parameters to pass for the batch job.
     * @returns {Promise<Service>} The stored service.
     * @throws {Error}
     */
    createService(process: object, type: string, title?: string, description?: string, enabled?: boolean, configuration?: object, plan?: string, budget?: number, additional?: object): Promise<import("./service")>;
    /**
     * Get all information about a secondary web service.
     *
     * @async
     * @param {string} id - Service ID.
     * @returns {Promise<Service>} The service.
     * @throws {Error}
     */
    getService(id: string): Promise<import("./service")>;
    /**
     * Response for a HTTP request.
     *
     * @typedef AxiosResponse
     *
     * @type {object}
     * @property {any} data
     * @property {number} status
     * @property {string} statusText
     * @property {*} headers
     * @property {object} config
     * @property {?any} request
     */
    /**
     * Sends a GET request.
     *
     * @async
     * @param {string} path
     * @param {object} query
     * @param {string} responseType - Response type according to axios, defaults to `json`.
     * @returns {Promise<AxiosResponse>}
     * @throws {Error}
     * @see https://github.com/axios/axios#request-config
     */
    _get(path: string, query: object, responseType: string): Promise<{
        data: any;
        status: number;
        statusText: string;
        headers: any;
        config: object;
        request: any | null;
    }>;
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
    _post(path: string, body: any, responseType: string): Promise<{
        data: any;
        status: number;
        statusText: string;
        headers: any;
        config: object;
        request: any | null;
    }>;
    /**
     * Sends a PUT request.
     *
     * @async
     * @param {string} path
     * @param {*} body
     * @returns {Promise<AxiosResponse>}
     * @throws {Error}
     */
    _put(path: string, body: any): Promise<{
        data: any;
        status: number;
        statusText: string;
        headers: any;
        config: object;
        request: any | null;
    }>;
    /**
     * Sends a PATCH request.
     *
     * @async
     * @param {string} path
     * @param {*} body
     * @returns {Promise<AxiosResponse>}
     * @throws {Error}
     */
    _patch(path: string, body: any): Promise<{
        data: any;
        status: number;
        statusText: string;
        headers: any;
        config: object;
        request: any | null;
    }>;
    /**
     * Sends a DELETE request.
     *
     * @async
     * @param {string} path
     * @returns {Promise<AxiosResponse>}
     * @throws {Error}
     */
    _delete(path: string): Promise<{
        data: any;
        status: number;
        statusText: string;
        headers: any;
        config: object;
        request: any | null;
    }>;
    /**
     * Downloads data from a URL.
     *
     * May include authorization details where required.
     *
     * @param {string} url - An absolute or relative URL to download data from.
     * @param {boolean} authorize - Send authorization details (`true`) or not (`false`).
     * @returns {Promise<Stream.Readable|Blob>} - Returns the data as `Stream` in NodeJS environments or as `Blob` in browsers
     * @throws {Error}
     */
    download(url: string, authorize: boolean): Promise<import("stream").Readable | Blob>;
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
     * @param {object} options
     * @returns {Promise<AxiosResponse>}
     * @throws {Error}
     * @see https://github.com/axios/axios
     */
    _send(options: object): Promise<{
        data: any;
        status: number;
        statusText: string;
        headers: any;
        config: object;
        request: any | null;
    }>;
}
