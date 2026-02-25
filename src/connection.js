const Environment = require('./env');
const Utils = require('./utils');
const ProcessRegistry = require('@openeo/js-commons/src/processRegistry');
const axios = require('axios');
const StacMigrate = require('@radiantearth/stac-migrate');

const AuthProvider = require('./authprovider');
const BasicProvider = require('./basicprovider');
const OidcProvider = require('./oidcprovider');

const FileTypes = require('./filetypes');
const UserFile = require('./userfile');
const Job = require('./job');
const UserProcess = require('./userprocess');
const Service = require('./service');

const Builder = require('./builder/builder');
const BuilderNode = require('./builder/node');
const { CollectionPages, ItemPages, JobPages, ProcessPages, ServicePages, UserFilePages } = require('./pages');

/**
 * A connection to an openEO back-end.
 */
class Connection {

	/**
	 * Creates a new Connection.
	 * 
	 * @param {string} baseUrl - The versioned URL or the back-end instance.
	 * @param {Options} [options={}] - Additional options for the connection.
	 * @param {?string} [url=null] - User-provided URL of the backend connected to.
	 */
	constructor(baseUrl, options = {}, url = null) {
		/**
		 * User-provided URL of the backend connected to.
		 * 
		 * `null` if not given and the connection was directly made to a versioned instance of the back-end.
		 * 
		 * @protected
		 * @type {string | null}
		 */
		this.url = url;
		/**
		 * The versioned URL or the back-end instance.
		 * 
		 * @protected
		 * @type {string}
		 */
		this.baseUrl = Utils.normalizeUrl(baseUrl);
		/**
		 * Auth Provider cache
		 * 
		 * @protected
		 * @type {Array.<AuthProvider> | null}
		 */
		this.authProviderList = null;
		/**
		 * Current auth provider
		 * 
		 * @protected
		 * @type {AuthProvider | null}
		 */
		this.authProvider = null;
		/**
		 * Capability cache
		 * 
		 * @protected
		 * @type {Capabilities | null}
		 */
		this.capabilitiesObject = null;
		/**
		 * Listeners for events.
		 * 
		 * @protected
		 * @type {object.<string|Function>}
		 */
		this.listeners = {};
		/**
		 * Additional options for the connection.
		 * 
		 * @protected
		 * @type {Options}
		 */
		this.options = options;
		/**
		 * Process cache
		 * 
		 * @protected
		 * @type {ProcessRegistry}
		 */
		this.processes = new ProcessRegistry([], Boolean(options.addNamespaceToProcess));
		this.processes.listeners.push((...args) => this.emit('processesChanged', ...args));
	}

	/**
	 * Refresh the cache for processes.
	 * 
	 * @async
	 * @protected
	 * @returns {Promise}
	 */
	async refreshProcessCache() {
		if (this.processes.count() === 0) {
			return;
		}
		const promises = this.processes.namespaces().map(namespace => {
			let fn = () => Promise.resolve();
			if (namespace === 'user') {
				const userProcesses = this.processes.namespace('user');
				if (!this.isAuthenticated()) {
					fn = () => (this.processes.remove(null, 'user') ? Promise.resolve() : Promise.reject(new Error("Can't clear user processes")));
				}
				else if (this.capabilities().hasFeature('listUserProcesses')) {
					fn = () => this.listUserProcesses(userProcesses);
				}
			}
			else if (this.capabilities().hasFeature('listProcesses')) {
				fn = () => this.listProcesses(namespace);
			}
			return fn().catch(error => console.warn(`Could not update processes for namespace '${namespace}' due to an error: ${error.message}`));
		});
		return await Promise.all(promises);
	}

	/**
	 * Returns the URL of the versioned back-end instance currently connected to.
	 * 
	 * @returns {string} The versioned URL or the back-end instance.
	 */
	getBaseUrl() {
		return this.baseUrl;
	}

	/**
	 * Returns the user-provided URL of the back-end currently connected to.
	 * 
	 * @returns {string} The URL or the back-end.
	 */
	getUrl() {
		return this.url || this.baseUrl;
	}

	/**
	 * Returns the capabilities of the back-end.
	 * 
	 * @returns {Capabilities} Capabilities
	 */
	capabilities() {
		return this.capabilitiesObject;
	}

	/**
	 * List the supported output file formats.
	 * 
	 * @async
	 * @returns {Promise<FileTypes>} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listFileTypes() {
		const response = await this._get('/file_formats');
		return new FileTypes(response.data);
	}

	/**
	 * List the supported output file formats.
	 * 
	 * @async
	 * @returns {Promise<ProcessingParameters>} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listProcessingParameters() {
		const response = await this._get('/processing_parameters');
		return response.data;
	}

	/**
	 * List the supported secondary service types.
	 * 
	 * @async
	 * @returns {Promise<object.<string, ServiceType>>} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listServiceTypes() {
		const response = await this._get('/service_types');
		return response.data;
	}

	/**
	 * List the supported UDF runtimes.
	 * 
	 * @async
	 * @returns {Promise<object.<string, UdfRuntime>>} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listUdfRuntimes() {
		const response = await this._get('/udf_runtimes');
		return response.data;
	}

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
	async listCollections() {
		const pages = this.paginateCollections(null);
		return await pages.nextPage([], false);
	}

	/**
	 * Paginate through the collections available on the back-end.
	 * 
	 * The collections returned always comply to the latest STAC version (currently 1.0.0).
	 * 
	 * @param {?number} [limit=50] - The number of collections per request/page as integer. If `null`, requests all collections.
	 * @returns {CollectionPages} A paged list of collections.
	 */
	paginateCollections(limit = 50) {
		return new CollectionPages(this, limit);
	}

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
	async describeCollection(collectionId) {
		const response = await this._get('/collections/' + collectionId);
		if (response.data.stac_version) {
			return StacMigrate.collection(response.data);
		}
		else {
			return response.data;
		}
	}

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
	listCollectionItems(collectionId, spatialExtent = null, temporalExtent = null, limit = null) {
		let params = {};
		if (Array.isArray(spatialExtent)) {
			params.bbox = spatialExtent.join(',');
		}
		if (Array.isArray(temporalExtent)) {
			params.datetime = temporalExtent
				.map(e => {
					if (e instanceof Date) {
						return e.toISOString();
					}
					else if (typeof e === 'string') {
						return e;
					}
					return '..'; // Open date range
				})
				.join('/');
		}
		if (limit > 0) {
			params.limit = limit;
		}
		return new ItemPages(this, collectionId, params, limit);
	}

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
	normalizeNamespace(namespace) {
		// The pattern in https://github.com/Open-EO/openeo-api/pull/348 doesn't include the double colon yet - the regexp may change in the future
		const matches = namespace.match( /^https?:\/\/.*\/processes\/(@?[\w\-.~:]+)\/?/i);
		return matches && matches.length > 1 ? matches[1] : namespace;
	}

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
	async listProcesses(namespace = null) {
		const pages = this.paginateProcesses(namespace);
		return await pages.nextPage([], false);
	}

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
	paginateProcesses(namespace = null, limit = 50) {
		return new ProcessPages(this, limit, namespace);
	}

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
	async describeProcess(processId, namespace = null) {
		if (!namespace) {
			namespace = 'backend';
		}
		if (namespace === 'backend') {
			await this.listProcesses();
		}
		else {
			const response = await this._get(`/processes/${this.normalizeNamespace(namespace)}/${processId}`);
			if (!Utils.isObject(response.data) || typeof response.data.id !== 'string') {
				throw new Error('Invalid response received for process');
			}
			this.processes.add(response.data, namespace);
		}
		return this.processes.get(processId, namespace);
	}

	/**
	 * Returns an object to simply build user-defined processes based upon pre-defined processes.
	 * 
	 * @async
	 * @param {string} id - A name for the process.
	 * @returns {Promise<Builder>}
	 * @throws {Error}
	 * @see Connection#listProcesses
	 */
	async buildProcess(id) {
		await this.listProcesses();
		return new Builder(this.processes, null, id);
	}

	/**
	 * List all authentication methods supported by the back-end.
	 * 
	 * @async
	 * @returns {Promise<Array.<AuthProvider>>} An array containing all supported AuthProviders (including all OIDC providers and HTTP Basic).
	 * @throws {Error}
	 * @see AuthProvider
	 */
	async listAuthProviders() {
		if (this.authProviderList !== null) {
			return this.authProviderList;
		}

		this.authProviderList = [];
		const cap = this.capabilities();

		// Add OIDC providers
		if (cap.hasFeature('authenticateOIDC')) {
			const res = await this._get('/credentials/oidc');
			const oidcFactory = this.getOidcProviderFactory();
			if (Utils.isObject(res.data) && Array.isArray(res.data.providers) && typeof oidcFactory === 'function') {
				for(let i in res.data.providers) {
					const obj = oidcFactory(res.data.providers[i]);
					if (obj instanceof AuthProvider) {
						this.authProviderList.push(obj);
					}
				}
			}
		}
		
		// Add Basic provider
		if (cap.hasFeature('authenticateBasic')) {
			this.authProviderList.push(new BasicProvider(this));
		}

		return this.authProviderList;
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
	setOidcProviderFactory(providerFactoryFunc) {
		this.oidcProviderFactory = providerFactoryFunc;
	}

	/**
	 * Get the OpenID Connect provider factory.
	 * 
	 * Returns `null` if OIDC is not supported by the client or an instance
	 * can't be created for whatever reason.
	 * 
	 * @returns {oidcProviderFactoryFunction | null}
	 * @see AuthProvider
	 */
	getOidcProviderFactory() {
		if (typeof this.oidcProviderFactory === 'function') {
			return this.oidcProviderFactory;
		}
		else {
			if (OidcProvider.isSupported()) {
				return providerInfo => new OidcProvider(this, providerInfo);
			}
			else {
				return null;
			}
		}
	}

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
	async authenticateBasic(username, password) {
		const basic = new BasicProvider(this);
		await basic.login(username, password);
	}

	/**
	 * Returns whether the user is authenticated (logged in) at the back-end or not.
	 * 
	 * @returns {boolean} `true` if authenticated, `false` if not.
	 */
	isAuthenticated() {
		return (this.authProvider !== null);
	}

	/**
	 * Emits the given event.
	 * 
	 * @protected
	 * @param {string} event 
	 * @param {...*} args
	 */
	emit(event, ...args) {
		if (typeof this.listeners[event] === 'function') {
			this.listeners[event](...args);
		}
	}

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
	on(event, callback) {
		this.listeners[event] = callback;
	}

	/**
	 * Removes a listener from the given event.
	 * 
	 * @param {string} event 
	 */
	off(event) {
		delete this.listeners[event];
	}

	/**
	 * Returns the AuthProvider.
	 * 
	 * @returns {AuthProvider | null} 
	 */
	getAuthProvider() {
		return this.authProvider;
	}

	/**
	 * Sets the AuthProvider.
	 * 
	 * @param {AuthProvider} provider
	 */
	setAuthProvider(provider) {
		if (provider === this.authProvider) {
			return;
		}
		if (provider instanceof AuthProvider) {
			this.authProvider = provider;
		}
		else {
			this.authProvider = null;
		}
		this.emit('authProviderChanged', this.authProvider);
		// Update process cache on auth changes: https://github.com/Open-EO/openeo-js-client/issues/55
		this.refreshProcessCache();
	}

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
	setAuthToken(type, providerId, token) {
		const provider = new AuthProvider(type, this, {
			id: providerId,
			title: "Custom",
			description: ""
		});
		provider.setToken(token);
		this.setAuthProvider(provider);
		return provider;
	}

	/**
	 * Get information about the authenticated user.
	 * 
	 * Updates the User ID if available.
	 * 
	 * @async
	 * @returns {Promise<UserAccount>} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async describeAccount() {
		const response = await this._get('/me');
		return response.data;
	}

	/**
	 * List all files from the user workspace. 
	 * 
	 * @async
	 * @returns {Promise<ResponseArray.<UserFile>>} A list of files.
	 * @throws {Error}
	 */
	async listFiles() {
		const pages = this.paginateFiles(null);
		return await pages.nextPage();
	}

	/**
	 * Paginate through the files from the user workspace. 
	 * 
	 * @param {?number} [limit=50] - The number of files per request/page as integer. If `null`, requests all files.
	 * @returns {ServicePages} A paged list of files.
	 */
	paginateFiles(limit = 50) {
		return new UserFilePages(this, limit);
	}

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
	async uploadFile(source, targetPath = null, statusCallback = null, abortController = null) {
		if (targetPath === null) {
			targetPath = Environment.fileNameForUpload(source);
		}
		const file = await this.getFile(targetPath);
		return await file.uploadFile(source, statusCallback, abortController);
	}

	/**
	 * Opens a (existing or non-existing) file without reading any information or creating a new file at the back-end. 
	 * 
	 * @async
	 * @param {string} path - Path to the file, relative to the user workspace.
	 * @returns {Promise<UserFile>} A file.
	 * @throws {Error}
	 */
	async getFile(path) {
		return new UserFile(this, path);
	}

	/**
	 * Takes a UserProcess, BuilderNode or a plain object containing process nodes
	 * and converts it to an API compliant object.
	 * 
	 * @param {UserProcess|BuilderNode|object.<string, *>} process - Process to be normalized.
	 * @param {object.<string, *>} additional - Additional properties to be merged with the resulting object.
	 * @returns {object.<string, *>}
	 * @protected
	 */
	_normalizeUserProcess(process, additional = {}) {
		if (process instanceof UserProcess) {
			process = process.toJSON();
		}
		else if (process instanceof BuilderNode) {
			process.result = true;
			process = process.parent.toJSON();
		}
		else if (Utils.isObject(process) && !Utils.isObject(process.process_graph)) {
			process = {
				process_graph: process
			};
		}
		return Object.assign({}, additional, {process: process});
	}

	/**
	 * Validates a user-defined process at the back-end.
	 * 
	 * @async
	 * @param {Process} process - User-defined process to validate.
	 * @returns {Promise<ValidationResult>} errors - A list of API compatible error objects. A valid process returns an empty list.
	 * @throws {Error}
	 */
	async validateProcess(process) {
		const response = await this._post('/validation', this._normalizeUserProcess(process).process);
		if (Array.isArray(response.data.errors)) {
			const errors = response.data.errors;
			errors['federation:backends'] = Array.isArray(response.data['federation:backends']) ? response.data['federation:backends'] : [];
			return errors;
		}
		else {
			throw new Error("Invalid validation response received.");
		}
	}

	/**
	 * List all user-defined processes of the authenticated user.
	 * 
	 * @async
	 * @param {Array.<UserProcess>} [oldProcesses=[]] - A list of existing user-defined processes to update.
	 * @returns {Promise<ResponseArray.<UserProcess>>} A list of user-defined processes.
	 * @throws {Error}
	 */
	async listUserProcesses(oldProcesses = []) {
		const pages = this.paginateUserProcesses(null);
		return await pages.nextPage(oldProcesses);
	}

	/**
	 * Paginates through the user-defined processes of the authenticated user.
	 * 
	 * @param {?number} [limit=50] - The number of processes per request/page as integer. If `null`, requests all processes.
	 * @returns {ProcessPages} A paged list of user-defined processes.
	 */
	paginateUserProcesses(limit = 50) {
		return this.paginateProcesses('user', limit);
	}

	/**
	 * Creates a new stored user-defined process at the back-end.
	 * 
	 * @async
	 * @param {string} id - Unique identifier for the process.
	 * @param {Process} process - A user-defined process.
	 * @returns {Promise<UserProcess>} The new user-defined process.
	 * @throws {Error}
	 */
	async setUserProcess(id, process) {
		const pg = new UserProcess(this, id);
		return await pg.replaceUserProcess(process);
	}

	/**
	 * Get all information about a user-defined process.
	 * 
	 * @async
	 * @param {string} id - Identifier of the user-defined process. 
	 * @returns {Promise<UserProcess>} The user-defined process.
	 * @throws {Error}
	 */
	async getUserProcess(id) {
		const pg = new UserProcess(this, id);
		return await pg.describeUserProcess();
	}

	/**
	 * Executes a process synchronously and returns the result as the response.
	 * 
	 * Please note that requests can take a very long time of several minutes or even hours.
	 * 
	 * @async
	 * @param {Process} process - A user-defined process.
	 * @param {?AbortController} [abortController=null] - An AbortController object that can be used to cancel the processing request.
	 * @param {object.<string, *>} [additional={}] - Other parameters to pass for processing, e.g. `plan`, `budget`, and `log_level`.
	 * @returns {Promise<SyncResult>} - An object with the data and some metadata.
	 */
	async computeResult(process, abortController = null, additional = {}) {
		const requestBody = this._normalizeUserProcess(
			process,
			Object.assign({}, additional)
		);
		const response = await this._post('/result', requestBody, Environment.getResponseType(), abortController);
		const syncResult = {
			data: response.data,
			costs: null,
			type: null,
			logs: []
		};
		
		if (typeof response.headers['openeo-costs'] === 'number') {
			syncResult.costs = response.headers['openeo-costs'];
		}
		
		if (typeof response.headers['content-type'] === 'string') {
			syncResult.type = response.headers['content-type'];
		}

		const links = Array.isArray(response.headers.link) ? response.headers.link : [response.headers.link];
		for(let link of links) {
			if (typeof link !== 'string') {
				continue;
			}
			const logs = link.match(/^<([^>]+)>;\s?rel="monitor"/i);
			if (Array.isArray(logs) && logs.length > 1) {
				try {
					const logsResponse = await this._get(logs[1]);
					if (Utils.isObject(logsResponse.data) && Array.isArray(logsResponse.data.logs)) {
						syncResult.logs = logsResponse.data.logs;
					}
				} catch(error) {
					console.warn(error);
				}
			}
		}

		return syncResult;
	}

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
	 * @param {?AbortController} [abortController=null] - An AbortController object that can be used to cancel the processing request.
	 * @param {object.<string, *>} [additional={}] - Other parameters to pass for processing, e.g. `plan`, `budget`, and `log_level`.
	 * @throws {Error}
	 */
	async downloadResult(process, targetPath, abortController = null, additional = {}) {
		const response = await this.computeResult(process, abortController, additional);
		// @ts-ignore
		await Environment.saveToFile(response.data, targetPath);
	}

	/**
	 * List all batch jobs of the authenticated user.
	 * 
	 * @async
	 * @param {Array.<Job>} [oldJobs=[]] - A list of existing jobs to update.
	 * @returns {Promise<ResponseArray.<Job>>} A list of jobs.
	 * @throws {Error}
	 */
	async listJobs(oldJobs = []) {
		const pages = this.paginateJobs(null);
		const firstPage = await pages.nextPage(oldJobs);
		return firstPage;
	}

	/**
	 * Paginate through the batch jobs of the authenticated user.
	 * 
	 * @param {?number} [limit=50] - The number of jobs per request/page as integer. If `null`, requests all jobs.
	 * @returns {JobPages} A paged list of jobs.
	 */
	paginateJobs(limit = 50) {
		return new JobPages(this, limit);
	}

	/**
	 * Creates a new batch job at the back-end.
	 * 
	 * @async
	 * @param {Process} process - A user-define process to execute.
	 * @param {?string} [title=null] - A title for the batch job.
	 * @param {?string} [description=null] - A description for the batch job.
	 * @param {object.<string, *>} [additional={}] - Other parameters to pass for the batch job, e.g. `plan`, `budget`, and `log_level`.
	 * @returns {Promise<Job>} The stored batch job.
	 * @throws {Error}
	 */
	async createJob(process, title = null, description = null, additional = {}) {
		additional = Object.assign({}, additional, {
			title: title,
			description: description
		});
		const requestBody = this._normalizeUserProcess(process, additional);
		const response = await this._post('/jobs', requestBody);
		if (typeof response.headers['openeo-identifier'] !== 'string') {
			throw new Error("Response did not contain a Job ID. Job has likely been created, but may not show up yet.");
		}
		const job = new Job(this, response.headers['openeo-identifier']).setAll(requestBody);
		if (this.capabilities().hasFeature('describeJob')) {
			return await job.describeJob();
		}
		else {
			return job;
		}
	}

	/**
	 * Get all information about a batch job.
	 * 
	 * @async
	 * @param {string} id - Batch Job ID. 
	 * @returns {Promise<Job>} The batch job.
	 * @throws {Error}
	 */
	async getJob(id) {
		const job = new Job(this, id);
		return await job.describeJob();
	}

	/**
	 * List all secondary web services of the authenticated user.
	 * 
	 * @async
	 * @param {Array.<Service>} [oldServices=[]] - A list of existing services to update.
	 * @returns {Promise<ResponseArray.<Service>>} A list of services.
	 * @throws {Error}
	 */
	async listServices(oldServices = []) {
		const pages = this.paginateServices(null);
		return await pages.nextPage(oldServices);
	}

	/**
	 * Paginate through the secondary web services of the authenticated user.
	 * 
	 * @param {?number} [limit=50] - The number of services per request/page as integer. If `null` (default), requests all services.
	 * @returns {ServicePages} A paged list of services.
	 */
	paginateServices(limit = 50) {
		return new ServicePages(this, limit);
	}

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
	 * @param {object.<string, *>} [additional={}] - Other parameters to pass for the web service, e.g. `plan`, `budget`, and `log_level`.
	 * @returns {Promise<Service>} The stored service.
	 * @throws {Error}
	 */
	async createService(process, type, title = null, description = null, enabled = true, configuration = {}, additional = {}) {
		const requestBody = this._normalizeUserProcess(process, Object.assign({
			title: title,
			description: description,
			type: type,
			enabled: enabled,
			configuration: configuration,
		}, additional));
		const response = await this._post('/services', requestBody);
		if (typeof response.headers['openeo-identifier'] !== 'string') {
			throw new Error("Response did not contain a Service ID. Service has likely been created, but may not show up yet.");
		}
		const service = new Service(this, response.headers['openeo-identifier']).setAll(requestBody);
		if (this.capabilities().hasFeature('describeService')) {
			return service.describeService();
		}
		else {
			return service;
		}
	}

	/**
	 * Get all information about a secondary web service.
	 * 
	 * @async
	 * @param {string} id - Service ID. 
	 * @returns {Promise<Service>} The service.
	 * @throws {Error}
	 */
	async getService(id) {
		const service = new Service(this, id);
		return await service.describeService();
	}

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
	_toResponseArray(arr, response) {
		arr.links = Array.isArray(response.links) ? response.links : [];
		arr['federation:missing'] = Array.isArray(response['federation:missing']) ? response['federation:missing'] : [];
		return arr;
	}

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
	async _get(path, query, responseType, abortController = null) {
		return await this._send({
			method: 'get',
			responseType: responseType,
			url: path,
			// Timeout for capabilities requests as they are used for a quick first discovery to check whether the server is a openEO back-end.
			// Without timeout connecting with a wrong server url may take forever.
			timeout: path === '/' ? 5000 : 0,
			params: query
		}, abortController);
	}

	/**
	 * Sends a POST request.
	 * 
	 * @protected
	 * @async
	 * @param {string} path 
	 * @param {*} body 
	 * @param {string} responseType - Response type according to axios, defaults to `json`.
	 * @param {?AbortController} [abortController=null] - An AbortController object that can be used to cancel the request.
	 * @param {Array.<object.<string, string>>} [headers={}] - Headers
	 * @returns {Promise<AxiosResponse>}
	 * @throws {Error}
	 * @see https://github.com/axios/axios#request-config
	 */
	async _post(path, body, responseType, abortController = null, headers = {}) {
		const options = {
			method: 'post',
			responseType,
			url: path,
			data: body,
			headers
		};
		return await this._send(options, abortController);
	}

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
	async _put(path, body) {
		return await this._send({
			method: 'put',
			url: path,
			data: body
		});
	}

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
	async _patch(path, body) {
		return await this._send({
			method: 'patch',
			url: path,
			data: body
		});
	}

	/**
	 * Sends a DELETE request.
	 * 
	 * @protected
	 * @async
	 * @param {string} path 
	 * @returns {Promise<AxiosResponse>}
	 * @throws {Error}
	 */
	async _delete(path) {
		return await this._send({
			method: 'delete',
			url: path
		});
	}

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
	async download(url, authorize) {
		const result = await this._send({
			method: 'get',
			responseType: Environment.getResponseType(),
			url: url,
			authorization: authorize
		});
		return result.data;
	}

	/**
	 * Get the authorization header for requests.
	 * 
	 * @protected
	 * @returns {object.<string, string>}
	 */
	_getAuthHeaders() {
		const headers = {};
		if (this.isAuthenticated()) {
			headers.Authorization = 'Bearer ' + this.authProvider.getToken();
		}
		return headers;
	}

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
	async _send(options, abortController = null) {
		options.baseURL = this.baseUrl;
		if (typeof options.authorization === 'undefined' || options.authorization === true) {
			if (!options.headers) {
				options.headers = {};
			}
			Object.assign(options.headers, this._getAuthHeaders());
		}
		if (!options.responseType) {
			options.responseType = 'json';
		}
		if (abortController) {
			options.signal = abortController.signal;
		}

		try {
			let response = await axios(options);
			response = this._migrate(response);
			return response;
		} catch(error) {
			if (axios.isCancel(error)) {
				throw error;
			}
			const checkContentType = type => (typeof type === 'string' && type.indexOf('/json') !== -1);
			const enrichError = (origin, response) => {
				if (typeof response.message === 'string') {
					origin.message = response.message;
				}
				origin.code = typeof response.code === 'string' ? response.code : "";
				origin.id = response.id;
				origin.links = Array.isArray(response.links) ? response.links : [];
				return origin;
			};
			if (Utils.isObject(error.response) && Utils.isObject(error.response.data) && (checkContentType(error.response.data.type) || (Utils.isObject(error.response.headers) && checkContentType(error.response.headers['content-type'])))) {
				// JSON error responses are Blobs and streams if responseType is set as such, so convert to JSON if required.
				// See: https://github.com/axios/axios/issues/815
				if (options.responseType === Environment.getResponseType()) {
					try {
						const errorResponse = await Environment.handleErrorResponse(error);
						throw enrichError(error, errorResponse);
					} catch (error2) {
						console.error(error2);
					}
				}
				else {
					throw enrichError(error, error.response.data);
				}
			}
			throw error;
		}
	}

	/**
	 * Applies some common migrations to the response.
	 * 
	 * For example to update between versions or API flavours.
	 * 
	 * @param {AxiosResponse} response 
	 * @returns {AxiosResponse}
	 */
	_migrate(response) {
		return response;
	}
}

module.exports = Connection;
