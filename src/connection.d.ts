import {ApiError, Link, Log} from "./typedefs";
import {AuthProvider} from "./authprovider";
import {Capabilities} from "./capabilities";
import {FileTypes} from "./filetypes";
import {Builder} from "./builder/builder";
import {UserFile} from "./userfile";
import {UserProcess} from "./userprocess";
import {BuilderNode} from "./builder/node";
import {Job} from "./job";
import {Service} from "./service";
import {Readable} from "stream";
import {AxiosResponse} from "axios";

/**
 * @typedef SyncResult
 * @type {object}
 * @property {Readable|Blob} data The data as `Stream` in NodeJS environments or as `Blob` in browsers.
 * @property {?number} costs The costs for the request in the currency exposed by the back-end.
 * @property {Array.<Log>} logs Array of log entries as specified in the API.
 */
declare class SyncResult {
    /**
     * The data as `Stream` in NodeJS environments or as `Blob` in browsers.
     */
    data: Readable | Blob;
    /**
     * The costs for the request in the currency exposed by the back-end.
     */
    costs: number | null;
    /**
     * Array of log entries as specified in the API.
     */
    logs: Log[];
}

/**
 * A connection to a back-end.
 */
export declare class Connection {
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
     * @typedef ServiceType
     * @type {object.<string, *>}
     */
    /**
     * List the supported secondary service types.
     *
     * @async
     * @returns {Promise<object.<string, ServiceType>>} A response compatible to the API specification.
     * @throws {Error}
     */
    listServiceTypes(): Promise<any>;
    /**
     * @typedef UdfRuntime
     * @type {object.<string, *>}
     */
    /**
     * List the supported UDF runtimes.
     *
     * @async
     * @returns {Promise<object.<string, UdfRuntime>>} A response compatible to the API specification.
     * @throws {Error}
     */
    listUdfRuntimes(): Promise<any>;
    /**
     * @typedef Collections
     * @type {object}
     * @property {Array.<Collection>} collections
     * @property {Array.<Link>} links
     */
    /**
     * List all collections available on the back-end.
     *
     * @async
     * @returns {Promise<Collections>} A response compatible to the API specification.
     * @throws {Error}
     */
    listCollections(): Promise<{
        collections: any[];
        links: Link[];
    }>;
    /**
     * @typedef Collection
     * @type {object.<string, *>}
     */
    /**
     * Get further information about a single collection.
     *
     * @async
     * @param {string} collectionId - Collection ID to request further metadata for.
     * @returns {Promise<Collection>} - A response compatible to the API specification.
     * @throws {Error}
     */
    describeCollection(collectionId: string): Promise<any>;
    /**
     * @typedef Processes
     * @type {object}
     * @property {Array.<Process>} processes
     * @property {Array.<Link>} links
     */
    /**
     * List all processes available on the back-end.
     *
     * Data is cached in memory.
     *
     * @async
     * @returns {Promise<Processes>} - A response compatible to the API specification.
     * @throws {Error}
     */
    listProcesses(): Promise<{
        processes: any[];
        links: Link[];
    }>;
    /**
     * Get information about a single process.
     *
     * @async
     * @param {string} processId - Collection ID to request further metadata for.
     * @returns {Promise<?Process>} - A single process as object, or `null` if none is found.
     * @throws {Error}
     * @see Connection#listProcesses
     */
    describeProcess(processId: string): Promise<any>;
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
     * @typedef AccountStorage
     * @type {object}
     * @property {number} free in bytes as integer
     * @property {number} quota in bytes as integer
     */
    /**
     * @typedef Account
     * @type {object}
     * @property {string} user_id
     * @property {string} name
     * @property {AccountStorage} storage
     * @property {?number} budget
     * @property {Array.<Link>} links
     */
    /**
     * Get information about the authenticated user.
     *
     * Updates the User ID if available.
     *
     * @async
     * @returns {Promise<Account>} A response compatible to the API specification.
     * @throws {Error}
     */
    describeAccount(): Promise<{
        user_id: string;
        name: string;
        storage: {
            /**
             * in bytes as integer
             */
            free: number;
            /**
             * in bytes as integer
             */
            quota: number;
        };
        budget: number | null;
        links: Link[];
    }>;
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
    validateProcess(process: any): Promise<ApiError[]>;
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
    setUserProcess(id: string, process: any): Promise<UserProcess>;
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
    computeResult(process: any, plan?: string | null, budget?: number | null): Promise<SyncResult>;
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
    downloadResult(process: any, targetPath: string, plan?: string | null, budget?: number | null): Promise<void>;
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
    createJob(process: any, title?: string | null, description?: string | null, plan?: string | null, budget?: number | null, additional?: any): Promise<Job>;
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
    createService(process: any, type: string, title?: string | null, description?: string | null, enabled?: boolean, configuration?: any, plan?: string | null, budget?: number | null, additional?: any): Promise<Service>;
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
