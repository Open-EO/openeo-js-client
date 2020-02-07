import axios from 'axios';
import { UserManager } from 'oidc-client';
import { Utils, Versions } from '@openeo/js-commons';
import Environment from '@openeo/js-environment';


/**
 * Main class to start with openEO. Allows to connect to a server.
 * 
 * @class
 * @hideconstructor
 */
export class OpenEO {

	/**
	 * Connect to a back-end with version discovery (recommended).
	 * 
	 * Includes version discovery (request to `GET /well-known/openeo`) and connects to the most suitable version compatible to this JS client version.
	 * Requests the capabilities and authenticates where required.
	 * 
	 * Please note that support for OpenID Connect is EXPERIMENTAL!
	 * Also note that the User ID may not be initialized correctly after authenticating with OpenID Connect.
	 * Therefore requests to endpoints requiring the user ID (e.g file management) may fail.
	 * Users should always request the user details using descibeAccount() directly after authentication.
	 * 
	 * @async
	 * @param {string} url - The server URL to connect to.
	 * @param {string} [authType=null] - Authentication type, either `basic` for HTTP Basic, `oidc` for OpenID Connect (Browser only, experimental) or `null` to disable authentication.
	 * @param {object} [authOptions={}] - Object with authentication options.
	 * @param {string} [authOptions.username] - HTTP Basic only: Username
	 * @param {string} [authOptions.password] - HTTP Basic only: Password
	 * @param {string} [authOptions.client_id] - OpenID Connect only: Your client application's identifier as registered with the OIDC provider
	 * @param {string} [authOptions.redirect_uri] - OpenID Connect only: The redirect URI of your client application to receive a response from the OIDC provider.
	 * @param {string} [authOptions.scope=openid] - OpenID Connect only: The scope being requested from the OIDC provider. Defaults to `openid`.
	 * @param {boolean} [authOptions.uiMethod=redirect] - OpenID Connect only: Method how to load and show the authentication process. Either `popup` (opens a popup window) or `redirect` (HTTP redirects, default).
	 * @returns {Connection}
	 * @throws {Error}
	 * @static
	 */
	static async connect(url, authType = null, authOptions = {}) {
		let wellKnownUrl = Utils.normalizeUrl(url, '/.well-known/openeo');
		let response;
		try {
			response = await axios.get(wellKnownUrl);

			if (!Utils.isObject(response.data) || !Array.isArray(response.data.versions)) {
				throw new Error("Well-Known Document doesn't list any version.");
			}
	
			let compatibility = Versions.findLatest(response.data.versions, true, "1.0.x", "1.0.x");
			if (compatibility.length > 0) {
				url = compatibility[0].url;
			}
			else {
				throw new Error("Server doesn't support API version 0.4.x.");
			}
		} catch(error) {
			/** @todo We should replace the fallback in a 1.0 or so. */
			console.warn("DEPRECATED: Can't read well-known document, connecting directly to the specified URL as fallback mechanism.", error);
		}

		return await OpenEO.connectDirect(url, authType, authOptions);
	}

	/**
	 * Connects directly to a back-end instance, without version discovery (NOT recommended).
	 * 
	 * Doesn't do version discovery, therefore a URL of a versioned API must be specified. Requests the capabilities and authenticates where required.
	 * 
	 * Please note that support for OpenID Connect is EXPERIMENTAL!
	 * Also note that the User ID may not be initialized correctly after authenticating with OpenID Connect.
	 * Therefore requests to endpoints requiring the user ID (e.g file management) may fail.
	 * Users should always request the user details using descibeAccount() directly after authentication.
	 * 
	 * @async
	 * @param {string} url - The server URL to connect to.
	 * @param {string} [authType=null] - Authentication type, either `basic` for HTTP Basic, `oidc` for OpenID Connect (Browser only, experimental) or `null` to disable authentication.
	 * @param {object} [authOptions={}] - Object with authentication options.
	 * @param {string} [authOptions.username] - HTTP Basic only: Username
	 * @param {string} [authOptions.password] - HTTP Basic only: Password
	 * @param {string} [authOptions.client_id] - OpenID Connect only: Your client application's identifier as registered with the OIDC provider
	 * @param {string} [authOptions.redirect_uri] - OpenID Connect only: The redirect URI of your client application to receive a response from the OIDC provider.
	 * @param {string} [authOptions.scope=openid] - OpenID Connect only: The scope being requested from the OIDC provider. Defaults to `openid`.
	 * @param {boolean} [authOptions.uiMethod=redirect] - OpenID Connect only: Method how to load and show the authentication process. Either `popup` (opens a popup window) or `redirect` (HTTP redirects, default).
	 * @returns {Connection}
	 * @throws {Error}
	 * @static
	 */
	static async connectDirect(versionedUrl, authType = null, authOptions = {}) {
		let connection = new Connection(versionedUrl);

		// Check whether back-end is accessible and supports a compatible version.
		let capabilities = await connection.init();
		if (!capabilities.apiVersion().startsWith("0.4.")) {
			throw new Error("Server instance doesn't support API version 0.4.x.");
		}

		if(authType !== null) {
			switch(authType) {
				case 'basic':
					await connection.authenticateBasic(authOptions.username, authOptions.password);
					break;
				case 'oidc':
					await connection.authenticateOIDC(authOptions);
					break;
				default:
					throw new Error("Unknown authentication type.");
			}
		}

		return connection;
	}

	/**
	 * Returns the version number of the client.
	 * 
	 * Not to confuse with the API version(s) supported by the client.
	 * 
	 * @returns {string} Version number (according to SemVer).
	 */
	static clientVersion() {
		return "1.0.0-alpha.1";
	}

	/**
	 * Finishes the OpenID Connect signin (authentication) worflow - EXPERIMENTAL!
	 * 
	 * Must be called in the page that OpenID Connect redirects to after logging in.
	 * 
	 * @async
	 * @param {boolean} [uiMethod=redirect] - Method how to load and show the signin/authentication process. Either `popup` (opens a popup window) or `redirect` (HTTP redirects, default).
	 * @returns {User} For uiMethod = 'redirect' only: OIDC User (to be assigned to the Connection via setUserOIDC). 
	 */
	static async signinCallbackOIDC(uiMethod = 'redirect') {
		try {
			var oidc = new UserManager();
			if (uiMethod === 'popup') {
				await oidc.signinPopupCallback();
			}
			else {
				return await oidc.signinRedirectCallback();
			}
		} catch (e) {}
	}

}

/**
 * A connection to a back-end.
 * 
 * @class
 */
export class Connection {

	/**
	 * Creates a new Connection.
	 * 
	 * @param {string} baseUrl - URL to the back-end
	 * @constructor
	 */
	constructor(baseUrl) {
		this.baseUrl = Utils.normalizeUrl(baseUrl);
		this.userId = null;
		this.accessToken = null;
		this.oidc = null;
		this.oidcUser = null;
		this.capabilitiesObject = null;
	}

	/**
	 * Initializes the connection by requesting the capabilities.
	 * 
	 * @async
	 * @returns {Capabilities} Capabilities
	 */
	async init() {
		let response = await this._get('/');
		this.capabilitiesObject = new Capabilities(response.data);
		return this.capabilitiesObject;
	}

	/**
	 * Returns the URL of the back-end currently connected to.
	 * 
	 * @returns {string} The URL or the back-end.
	 */
	getBaseUrl() {
		return this.baseUrl;
	}

	/**
	 * Returns the identifier of the user that is currently authenticated at the back-end.
	 * 
	 * @returns {string} ID of the authenticated user.
	 */
	getUserId() {
		return this.userId;
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
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listFileTypes() {
		let response = await this._get('/output_formats');
		return response.data;
	}

	/**
	 * List the supported secondary service types.
	 * 
	 * @async
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listServiceTypes() {
		let response = await this._get('/service_types');
		return response.data;
	}

	/**
	 * List the supported UDF runtimes.
	 * 
	 * @async
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listUdfRuntimes() {
		let response = await this._get('/udf_runtimes');
		return response.data;
	}

	/**
	 * List all collections available on the back-end.
	 * 
	 * @async
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listCollections() {
		let response = await this._get('/collections');
		return response.data;
	}

	/**
	 * Get further information about a single collection.
	 * 
	 * @async
	 * @param {string} collectionId - Collection ID to request further metadata for.
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async describeCollection(collectionId) {
		let response = await this._get('/collections/' + collectionId);
		return response.data;
	}

	/**
	 * List all processes available on the back-end.
	 * 
	 * @async
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async listProcesses() {
		let response = await this._get('/processes');
		return response.data;
	}

	/**
	 * Sets the OIDC User.
	 * 
	 * @see https://github.com/IdentityModel/oidc-client-js/wiki#user
	 * @param {User} user - The OIDC User returned by OpenEO.signinCallbackOIDC(). Passing `null` resets OIDC authentication details.
	 */
	setUserOIDC(user) {
		if (!user) {
			this.oidcUser = null;
			this.userId = null;
			this.accessToken = null;
		}
		else {
			if (!user.profile) {
				throw "Retrieved token is invalid.";
			}
			this.oidcUser = user;
			if (user.profile.sub) {
				// The sub is not necessarily the correct userId.
				// After authentication describeAccount() should be called to get a safe userId.
				this.userId = user.profile.sub;
			}
			this.accessToken = user.id_token;
		}
	}

	/**
	 * Authenticate with OpenID Connect (OIDC) - EXPERIMENTAL!
	 * 
	 * Supported only in Browser environments.
	 * 
	 * Not required to be called explicitly if specified in `OpenEO.connect`.
	 * 
	 * Please note that the User ID may not be initialized correctly after authenticating with OpenID Connect.
	 * Therefore requests to endpoints requiring the user ID (e.g file management) may fail.
	 * Users should always request the user details using descibeAccount() directly after authentication.
	 * 
	 * @param {object} [authOptions={}] - Object with authentication options. See https://github.com/IdentityModel/oidc-client-js/wiki#other-optional-settings for further options.
	 * @param {string} [authOptions.client_id] - Your client application's identifier as registered with the OIDC provider
	 * @param {string} [authOptions.redirect_uri] - The redirect URI of your client application to receive a response from the OIDC provider.
	 * @param {string} [authOptions.scope=openid] - The scope being requested from the OIDC provider. Defaults to `openid`.
	 * @param {boolean} [authOptions.uiMethod=redirect] - Method how to load and show the authentication process. Either `popup` (opens a popup window) or `redirect` (HTTP redirects, default).
	 * @throws {Error}
	 * @todo Fully implement OpenID Connect authentication {@link https://github.com/Open-EO/openeo-js-client/issues/11}
	 */
	async authenticateOIDC(authOptions) {
		Environment.checkOidcSupport();

		var response = await this._send({
			method: 'get',
			url: '/credentials/oidc',
			maxRedirects: 0 // Disallow redirects
		});
		var responseUrl = response.request.responseURL; // Would be response.request.res.responseUrl in Node
		if (typeof responseUrl !== 'string') {
			throw "No URL available for OpenID Connect Discovery";
		}
		this.oidc = new UserManager(Object.assign({
			authority: responseUrl.replace('/.well-known/openid-configuration', ''),
			response_type: 'token id_token',
			scope: 'openid'
		}, authOptions));
		if (authOptions.uiMethod === 'popup') {
			this.setUserOIDC(await this.oidc.signinPopup());
		}
		else {
			await this.oidc.signinRedirect();
		}
	}

	/**
	 * Authenticate with HTTP Basic.
	 * 
	 * Not required to be called explicitly if specified in `OpenEO.connect`.
	 * 
	 * @async
	 * @param {object} options - Options for Basic authentication.
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async authenticateBasic(username, password) {
		let response = await this._send({
			method: 'get',
			responseType: 'json',
			url: '/credentials/basic',
			headers: {'Authorization': 'Basic ' + Environment.base64encode(username + ':' + password)}
		});
		if (!response.data.user_id) {
			throw new Error("No user_id returned.");
		}
		if (!response.data.access_token) {
			throw new Error("No access_token returned.");
		}
		this.userId = response.data.user_id;
		this.accessToken = response.data.access_token;
		return response.data;
	}

	/**
	 * Logout from the established session - EXPERIMENTAL!
	 * 
	 * @async
	 */
	async logout() {
		if (this.oidc !== null) {
			await this.oidc.signoutRedirect();
			this.oidc = null;
			this.oidcUser = null;
		}
		this.userId = null;
		this.accessToken = null;
	}

	/**
	 * Get information about the authenticated user.
	 * 
	 * Updates the User ID if available.
	 * 
	 * @async
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async describeAccount() {
		let response = await this._get('/me');
		if (response.data && typeof response.data === 'object' && response.data.user_id) {
			this.userId = response.data.user_id;
		}
		return response.data;
	}

	/**
	 * Lists all files from the user workspace. 
	 * 
	 * @async
	 * @param {string} [userId=null] - User ID, defaults to authenticated user.
	 * @returns {File[]} A list of files.
	 * @throws {Error}
	 */
	async listFiles(userId = null) {
		userId = this._resolveUserId(userId);
		let response = await this._get('/files/' + userId);
		return response.data.files.map(
			f => new File(this, userId, f.path).setAll(f)
		);
	}

	/**
	 * Opens a (existing or non-existing) file without reading any information or creating a new file at the back-end. 
	 * 
	 * @param {string} path - Path to the file, relative to the user workspace.
	 * @param {string} [userId=null] - User ID, defaults to authenticated user.
	 * @returns {File} A file.
	 * @throws {Error}
	 */
	openFile(path, userId = null) {
		return new File(this, this._resolveUserId(userId), path);
	}

	/**
	 * Validates a process graph at the back-end.
	 * 
	 * @async
	 * @param {object} processGraph - Process graph to validate.
	 * @retrurns {Object[]} errors - A list of API compatible error objects. A valid process graph returns an empty list.
	 * @throws {Error}
	 */
	async validateProcessGraph(processGraph) {
		let response = await this._post('/validation', {process_graph: processGraph});
		if (Array.isArray(response.data.errors)) {
			return response.data.errors;
		}
		else {
			throw new Error("Invalid validation response received.");
		}
	}

	/**
	 * Lists all process graphs of the authenticated user.
	 * 
	 * @async
	 * @returns {ProcessGraph[]} A list of stored process graphs.
	 * @throws {Error}
	 */
	async listProcessGraphs() {
		let response = await this._get('/process_graphs');
		return response.data.process_graphs.map(
			pg => new ProcessGraph(this, pg.id).setAll(pg)
		);
	}

	/**
	 * Creates a new stored process graph at the back-end.
	 * 
	 * @async
	 * @param {object} processGraph - A process graph (JSON).
	 * @param {string} [title=null] - A title for the stored process graph.
	 * @param {string} [description=null] - A description for the stored process graph.
	 * @returns {ProcessGraph} The new stored process graph.
	 * @throws {Error}
	 */
	async createProcessGraph(processGraph, title = null, description = null) {
		let requestBody = {title: title, description: description, process_graph: processGraph};
		let response = await this._post('/process_graphs', requestBody);
		let obj = new ProcessGraph(this, response.headers['openeo-identifier']).setAll(requestBody);
		if (await this.capabilitiesObject.hasFeature('describeProcessGraph')) {
			return obj.describeProcessGraph();
		}
		else {
			return obj;
		}
	}

	/**
	 * Get all information about a stored process graph.
	 * 
	 * @async
	 * @param {string} id - Process graph ID. 
	 * @returns {ProcessGraph} The stored process graph.
	 * @throws {Error}
	 */
	async getProcessGraphById(id) {
		let pg = new ProcessGraph(this, id);
		return await pg.describeProcessGraph();
	}

	/**
	 * Executes a process graph synchronously and returns the result as the response.
	 * 
	 * Please note that requests can take a very long time of several minutes or even hours.
	 * 
	 * @async
	 * @param {object} processGraph - A process graph (JSON).
	 * @param {string} [plan=null] - The billing plan to use for this computation.
	 * @param {number} [budget=null] - The maximum budget allowed to spend for this computation.
	 * @returns {Stream|Blob} - Returns the data as `Stream` in NodeJS environments or as `Blob` in browsers.
	 */
	async computeResult(processGraph, plan = null, budget = null) {
		let requestBody = {
			process_graph: processGraph,
			plan: plan,
			budget: budget
		};
		let response = await this._post('/result', requestBody, Environment.getResponseType());
		return response.data;
	}

	/**
	 * Lists all batch jobs of the authenticated user.
	 * 
	 * @async
	 * @returns {Job[]} A list of jobs.
	 * @throws {Error}
	 */
	async listJobs() {
		let response = await this._get('/jobs');
		return response.data.jobs.map(
			j => new Job(this, j.id).setAll(j)
		);
	}

	/**
	 * Creates a new batch job at the back-end.
	 * 
	 * @async
	 * @param {object} processGraph - A process graph (JSON).
	 * @param {string} [title=null] - A title for the batch job.
	 * @param {string} [description=null] - A description for the batch job.
	 * @param {string} [plan=null] - The billing plan to use for this batch job.
	 * @param {number} [budget=null] - The maximum budget allowed to spend for this batch job.
	 * @param {object} [additional={}] - Proprietary parameters to pass for the batch job.
	 * @returns {Job} The stored batch job.
	 * @throws {Error}
	 */
	async createJob(processGraph, title = null, description = null, plan = null, budget = null, additional = {}) {
		let requestBody = Object.assign({}, additional, {
			title: title,
			description: description,
			process_graph: processGraph,
			plan: plan,
			budget: budget
		});
		let response = await this._post('/jobs', requestBody);
		let job = new Job(this, response.headers['openeo-identifier']).setAll(requestBody);
		if (this.capabilitiesObject.hasFeature('describeJob')) {
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
	 * @returns {Job} The batch job.
	 * @throws {Error}
	 */
	async getJobById(id) {
		let job = new Job(this, id);
		return await job.describeJob();
	}

	/**
	 * Lists all secondary web services of the authenticated user.
	 * 
	 * @async
	 * @returns {Job[]} A list of services.
	 * @throws {Error}
	 */
	async listServices() {
		let response = await this._get('/services');
		return response.data.services.map(
			s => new Service(this, s.id).setAll(s)
		);
	}

	/**
	 * Creates a new secondary web service at the back-end. 
	 * 
	 * @async
	 * @param {object} processGraph - A process graph (JSON).
	 * @param {string} type - The type of service to be created (see `Connection.listServiceTypes()`).
	 * @param {string} [title=null] - A title for the service.
	 * @param {string} [description=null] - A description for the service.
	 * @param {boolean} [enabled=true] - Enable the service (`true`, default) or not (`false`).
	 * @param {object} [parameters={}] - Parameters to pass to the service.
	 * @param {string} [plan=null] - The billing plan to use for this service.
	 * @param {number} [budget=null] - The maximum budget allowed to spend for this service.
	 * @returns {Service} The stored service.
	 * @throws {Error}
	 */
	async createService(processGraph, type, title = null, description = null, enabled = true, parameters = {}, plan = null, budget = null) {
		let requestBody = {
			title: title,
			description: description,
			process_graph: processGraph,
			type: type,
			enabled: enabled,
			parameters: parameters,
			plan: plan,
			budget: budget
		};
		let response = await this._post('/services', requestBody);
		let service = new Service(this, response.headers['openeo-identifier']).setAll(requestBody);
		if (this.capabilitiesObject.hasFeature('describeService')) {
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
	 * @returns {Job} The service.
	 * @throws {Error}
	 */
	async getServiceById(id) {
		let service = new Service(this, id);
		return await service.describeService();
	}

	async _get(path, query, responseType) {
		return await this._send({
			method: 'get',
			responseType: responseType,
			url: path,
			// Timeout for capabilities requests as they are used for a quick first discovery to check whether the server is a openEO back-end.
			// Without timeout connecting with a wrong server url may take forever.
			timeout: path === '/' ? 3000 : 0,
			params: query
		});
	}

	async _post(path, body, responseType) {
		return await this._send({
			method: 'post',
			responseType: responseType,
			url: path,
			data: body
		});
	}

	async _patch(path, body) {
		return await this._send({
			method: 'patch',
			url: path,
			data: body
		});
	}

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
	 * @returns {Stream|Blob} - Returns the data as `Stream` in NodeJS environments or as `Blob` in browsers
	 */
	async download(url, authorize) {
		return await this._send({
			method: 'get',
			responseType: Environment.getResponseType(),
			url: url,
			withCredentials: authorize
		});
	}

	async _send(options) {
		options.baseURL = this.baseUrl;
		if (this.isLoggedIn() && (typeof options.withCredentials === 'undefined' || options.withCredentials === true)) {
			options.withCredentials = true;
			if (!options.headers) {
				options.headers = {};
			}
			options.headers.Authorization = 'Bearer ' + this.accessToken;
		}
		if (!options.responseType) {
			options.responseType = 'json';
		}

		try {
			return await axios(options);
		} catch(error) {
			if (Utils.isObject(error.response) && Utils.isObject(error.response.data) && ((typeof error.response.data.type === 'string' && error.response.data.type.indexOf('/json') !== -1) || (Utils.isObject(error.response.data.headers) && typeof error.response.data.headers['content-type'] === 'string' && error.response.data.headers['content-type'].indexOf('/json') !== -1))) {
				if (options.responseType === Environment.getResponseType()) {
					// JSON error responses are Blobs and streams if responseType is set as such, so convert to JSON if required.
					// See: https://github.com/axios/axios/issues/815
					return Environment.handleErrorResponse(error);
				}
			}
			// Re-throw error if it was not handled yet.
			throw error;
		}
	}

	_resolveUserId(userId = null) {
		if(userId === null) {
			if(this.userId === null) {
				throw new Error("Parameter 'userId' not specified and no default value available because user is not logged in.");
			}
			else {
				userId = this.userId;
			}
		}
		return userId;
	}

	/**
	 * Returns whether the user is authenticated (logged in) at the back-end or not.
	 * 
	 * @returns {boolean} `true` if authenticated, `false` if not.
	 */
	isLoggedIn() {
		return (this.accessToken !== null);
	}
}

/**
 * Capabilities of a back-end.
 * 
 * @class
 */
export class Capabilities {

	/**
	 * Creates a new Capabilities object from an API-compatible JSON response.
	 * 
	 * @param {object} data - A capabilities response compatible to the API specification.
	 * @throws {Error}
	 * @constructor
	 */
	constructor(data) {
		if(!Utils.isObject(data)) {
			throw new Error("No capabilities retrieved.");
		}
		if(!data.api_version) {
			throw new Error("Invalid capabilities: No API version retrieved");
		}
		if(!Array.isArray(data.endpoints)) {
			throw new Error("Invalid capabilities: No endpoints retrieved");
		}

		this.data = data;

		// Flatten features to be compatible with the feature map.
		this.features = this.data.endpoints
			.map(e => e.methods.map(method => (method + ' ' + e.path).toLowerCase()))
			.flat(1);

		this.featureMap = {
			capabilities: 'get /',
			listFileTypes: 'get /output_formats',
			listServiceTypes: 'get /service_types',
			listUdfRuntimes: 'get /udf_runtimes',
			listCollections: 'get /collections',
			describeCollection: 'get /collections/{collection_id}',
			listProcesses: 'get /processes',
			authenticateOIDC: 'get /credentials/oidc',
			authenticateBasic: 'get /credentials/basic',
			describeAccount: 'get /me',
			listFiles: 'get /files/{user_id}',
			validateProcessGraph: 'post /validation',
			createProcessGraph: 'post /process_graphs',
			listProcessGraphs: 'get /process_graphs',
			computeResult: 'post /result',
			listJobs: 'get /jobs',
			createJob: 'post /jobs',
			listServices: 'get /services',
			createService: 'post /services',
			downloadFile: 'get /files/{user_id}/{path}',
			openFile: 'put /files/{user_id}/{path}',
			uploadFile: 'put /files/{user_id}/{path}',
			deleteFile: 'delete /files/{user_id}/{path}',
			getJobById: 'get /jobs/{job_id}',
			describeJob: 'get /jobs/{job_id}',
			updateJob: 'patch /jobs/{job_id}',
			deleteJob: 'delete /jobs/{job_id}',
			estimateJob: 'get /jobs/{job_id}/estimate',
			startJob: 'post /jobs/{job_id}/results',
			stopJob: 'delete /jobs/{job_id}/results',
			listResults: 'get /jobs/{job_id}/results',
			downloadResults: 'get /jobs/{job_id}/results',
			describeProcessGraph: 'get /process_graphs/{process_graph_id}',
			getProcessGraphById: 'get /process_graphs/{process_graph_id}',
			updateProcessGraph: 'patch /process_graphs/{process_graph_id}',
			deleteProcessGraph: 'delete /process_graphs/{process_graph_id}',
			describeService: 'get /services/{service_id}',
			getServiceById: 'get /services/{service_id}',
			updateService: 'patch /services/{service_id}',
			deleteService: 'delete /services/{service_id}'
		};
	}

	/**
	 * Returns the capabilities response as a plain object.
	 * 
	 * @returns {object} - A reference to the capabilities response.
	 */
	toPlainObject() {
		return this.data;
	}

	/**
	 * Returns the openEO API version implemented by the back-end.
	 * 
	 * @returns {string} openEO API version number.
	 */
	apiVersion() {
		return this.data.api_version;
	}

	/**
	 * Returns the back-end version number.
	 * 
	 * @returns {string} openEO back-end version number.
	 */
	backendVersion() {
		return this.data.backend_version;
	}

	/**
	 * Returns the back-end title.
	 * 
	 * @returns {string} Title
	 */
	title() {
		return this.data.title || "";
	}

	/**
	 * Returns the back-end description.
	 * 
	 * @returns {string} Description
	 */
	description() {
		return this.data.description || "";
	}

	/**
	 * Lists all supported features.
	 * 
	 * @returns {string[]} An array of supported features.
	 */
	listFeatures() {
		let features = [];
		for(let feature in this.featureMap) {
			if (this.features.includes(this.featureMap[feature])) {
				features.push(feature);
			}
		}
		return features;
	}

	/**
	 * Check whether a feature is supported by the back-end.
	 * 
	 * @param {string} methodName - A feature name (corresponds to the JS client method names, see also the feature map for allowed values).
	 * @returns {boolean} `true` if the feature is supported, otherwise `false`.
	 */
	hasFeature(methodName) {
		return this.features.some(e => e === this.featureMap[methodName]);
	}

	/**
	 * Get the billing currency.
	 * 
	 * @returns {string|null} The billing currency or `null` if not available.
	 */
	currency() {
		return (this.data.billing && typeof this.data.billing.currency === 'string' ? this.data.billing.currency : null);
	}

	/**
	 * @typedef BillingPlan
	 * @type {Object}
	 * @property {string} name - Name of the billing plan.
	 * @property {string} description - A description of the billing plan, may include CommonMark syntax.
	 * @property {boolean} paid - `true` if it is a paid plan, otherwise `false`.
	 * @property {string} url - A URL pointing to a page describing the billing plan.
	 * @property {boolean} default - `true` if it is the default plan of the back-end, otherwise `false`.
	 */

	/**
	 * List all billing plans.
	 * 
	 * @returns {BillingPlan[]} Billing plans
	 */
	listPlans() {
		if (this.data.billing && Array.isArray(this.data.billing.plans)) {
			let plans = this.data.billing.plans;
			return plans.map(plan => {
				plan.default = (typeof this.data.billing.default_plan === 'string' && this.data.billing.default_plan.toLowerCase() === plan.name.toLowerCase());
				return plan;
			});
		}
		else {
			return [];
		}
	}
}


/**
 * The base class for entities such as Job, Process Graph, Service etc.
 * 
 * @class
 * @abstract
 */
class BaseEntity {

	/**
	 * Creates an instance of this object.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {object} properties 
	 * @constructor
	 */
	constructor(connection, properties = []) {
		this.connection = connection;
		this.clientNames = {};
		this.backendNames = {};
		this.extra = {};
		for(let i in properties) {
			let backend, client;
			if (Array.isArray(properties[i])) {
				backend = properties[i][0];
				client = properties[i][1];
			}
			else {
				backend = properties[i];
				client = properties[i];
			}
			this.clientNames[backend] = client;
			this.backendNames[client] = backend;
			if (typeof this[client] === 'undefined') {
				this[client] = null;
			}
		}
	}

	/**
	 * Converts the data from an API response into data suitable for our JS client models.
	 * 
	 * @param {object} metadata - JSON object originating from an API response.
	 * @returns {this} Returns the object itself.
	 */
	setAll(metadata) {
		for(let name in metadata) {
			if (typeof this.backendNames[name] === 'undefined') {
				this.extra[name] = metadata[name];
			}
			else {
				this[this.clientNames[name]] = metadata[name];
			}
		}
		return this;
	}

	/**
	 * Returns all data in the model.
	 * 
	 * @returns {object}
	 */
	getAll() {
		let obj = {};
		for(let backend in this.clientNames) {
			let client = this.clientNames[backend];
			obj[client] = this[client];
		}
		return Object.assign(obj, this.extra);
	}

	/**
	 * Get a value from the additional data that is not part of the core model, i.e. from proprietary extensions.
	 * 
	 * @param {string} name - Name of the property.
	 * @returns {*} The value, which could be of any type.
	 */
	get(name) {
		return typeof this.extra[name] !== 'undefined' ? this.extra[name] : null;
	}

	_convertToRequest(parameters) {
		let request = {};
		for(let key in parameters) {
			if (typeof this.backendNames[key] === 'undefined') {
				request[key] = parameters[key];
			}
			else {
				request[this.backendNames[key]] = parameters[key];
			}
		}
		return request;
	}

	_supports(feature) {
		return this.connection.capabilities().hasFeature(feature);
	}

}

/**
 * A File on the user workspace.
 * 
 * @class
 * @extends BaseEntity
 */
export class File extends BaseEntity {

	/**
	 * Creates an object representing a file on the user workspace.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {string} userId - The user ID.
	 * @param {string} path - The path to the file, relative to the user workspace and without user ID.
	 * @constructor
	 */
	constructor(connection, userId, path) {
		super(connection, ["path", "size", "modified"]);
		this.userId = userId;
		this.path = path;
	}

	/**
	 * Downloads a file from the user workspace.
	 * 
	 * This method has different behaviour depending on the environment.
	 * If the target is set to `null`, returns a stream in a NodeJS environment or a Blob in a browser environment.
	 * If a target is specified, writes the downloaded file to the target location on the file system in a NodeJS environment.
	 * In a browser environment offers the file for downloading using the specified name (paths not supported).
	 * 
	 * @async
	 * @param {string|null} target - The target, see method description for details.
	 * @returns {Stream|Blob|void} - Return value depends on the target and environment, see method description for details.
	 * @throws {Error}
	 */
	async downloadFile(target = null) {
		let response = await this.connection.download('/files/' + this.userId + '/' + this.path, true);
		if (target === null) {
			return response.data;
		}
		else {
			return await Environment.saveToFile(response.data, target);
		}
	}

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
	 * @param {uploadStatusCallback|null} statusCallback - Optionally, a callback that is executed on upload progress updates.
	 * @returns {File}
	 * @throws {Error}
	 */
	async uploadFile(source, statusCallback = null) {
		let options = {
			method: 'put',
			url: '/files/' + this.userId + '/' + this.path,
			data: Environment.dataForUpload(source),
			headers: {
				'Content-Type': 'application/octet-stream'
			}
		};
		if (typeof statusCallback === 'function') {
			options.onUploadProgress = (progressEvent) => {
				let percentCompleted = Math.round( (progressEvent.loaded * 100) / progressEvent.total );
				statusCallback(percentCompleted, this);
			};
		}

		let response = await this.connection._send(options);
		return this.setAll(response.data);
	}

	/**
	 * Deletes the file from the user workspace.
	 * 
	 * @async
	 * @throws {Error}
	 */
	async deleteFile() {
		await this.connection._delete('/files/' + this.userId + '/' + this.path);
	}
}

/**
 * A Batch Job.
 * 
 * @class
 * @extends BaseEntity
 */
export class Job extends BaseEntity {

	/**
	 * Creates an object representing a batch job stored at the back-end.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {string} jobId - The batch job ID.
	 * @constructor
	 */
	constructor(connection, jobId) {
		super(connection, ["id", "title", "description", ["process_graph", "processGraph"], "status", "progress", "error", "submitted", "updated", "plan", "costs", "budget"]);
		this.jobId = jobId;
	}

	/**
	 * Updates the batch job data stored in this object by requesting the metadata from the back-end.
	 * 
	 * @async
	 * @returns {Job} The update job object (this).
	 * @throws {Error}
	 */
	async describeJob() {
		let response = await this.connection._get('/jobs/' + this.jobId);
		return this.setAll(response.data);
	}

	/**
	 * Modifies the batch job at the back-end and afterwards updates this object, too.
	 * 
	 * @async
	 * @param {object} parameters - An object with properties to update, each of them is optional, but at least one of them must be specified. Additional properties can be set if the server supports them.
	 * @param {object} parameters.processGraph - A new process graph.
	 * @param {string} parameters.title - A new title.
	 * @param {string} parameters.description - A new description.
	 * @param {string} parameters.plan - A new plan.
	 * @param {number} parameters.budget - A new budget.
	 * @returns {Job} The updated job object (this).
	 * @throws {Error}
	 */
	async updateJob(parameters) {
		await this.connection._patch('/jobs/' + this.jobId, this._convertToRequest(parameters));
		if (this._supports('describeJob')) {
			return await this.describeJob();
		}
		else {
			return this.setAll(parameters);
		}
	}

	/**
	 * Deletes the batch job from the back-end.
	 * 
	 * @async
	 * @throws {Error}
	 */
	async deleteJob() {
		await this.connection._delete('/jobs/' + this.jobId);
	}

	/**
	 * Calculate an estimate (potentially time/costs/volume) for a batch job.
	 * 
	 * @async
	 * @returns {object} A response compatible to the API specification.
	 * @throws {Error}
	 */
	async estimateJob() {
		let response = await this.connection._get('/jobs/' + this.jobId + '/estimate');
		return response.data;
	}

	/**
	 * Starts / queues the batch job for processing at the back-end.
	 * 
	 * @async
	 * @returns {Job} The updated job object (this).
	 * @throws {Error}
	 */
	async startJob() {
		await this.connection._post('/jobs/' + this.jobId + '/results', {});
		if (this._supports('describeJob')) {
			return await this.describeJob();
		}
		return this;
	}

	/**
	 * Stops / cancels the batch job processing at the back-end.
	 * 
	 * @async
	 * @returns {Job} The updated job object (this).
	 * @throws {Error}
	 */
	async stopJob() {
		await this.connection._delete('/jobs/' + this.jobId + '/results');
		if (this._supports('describeJob')) {
			return await this.describeJob();
		}
		return this;
	}

	/**
	 * Retrieves download links and additional information about the batch job.
	 * 
	 * NOTE: Requesting metalink XML files is currently not supported by the JS client.
	 * 
	 * @async
	 * @returns {object} The JSON-based response compatible to the API specification, but also including `costs` and `expires` properties as received in the headers (or `null` if not present).
	 * @throws {Error}
	 */
	async listResults() {
		let response = await this.connection._get('/jobs/' + this.jobId + '/results');
		// Returning null for missing headers is not strictly following the spec
		let headerData = {
			costs: response.headers['openeo-costs'] || null,
			expires: response.headers.expires || null
		};
		return Object.assign(headerData, response.data);
	}

	/**
	 * Downloads the results to the specified target folder. The specified target folder must already exist!
	 * 
	 * NOTE: This method is only supported in a NodeJS environment. In a browser environment this method throws an exception!
	 * 
	 * @async
	 * @param {string} targetFolder - A target folder to store the file to, which must already exist.
	 * @returns {string[]} A list of file paths of the newly created files.
	 * @throws {Error}
	 */
	async downloadResults(targetFolder) {
		let list = await this.listResults();
		return await Environment.downloadResults(list, targetFolder);
	}
}

/**
 * A Stored Process Graph.
 * 
 * @class
 * @extends BaseEntity
 */
export class ProcessGraph extends BaseEntity {

	/**
	 * Creates an object representing a process graph stored at the back-end.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {string} processGraphId - ID of a stored process graph.
	 * @constructor
	 */
	constructor(connection, processGraphId) {
		super(connection, ["id", "title", "description", ["process_graph", "processGraph"]]);
		this.connection = connection;
		this.processGraphId = processGraphId;
	}

	/**
	 * Updates the data stored in this object by requesting the process graph metadata from the back-end.
	 * 
	 * @async
	 * @returns {ProcessGraph} The updated process graph object (this).
	 * @throws {Error}
	 */
	async describeProcessGraph() {
		let response = await this.connection._get('/process_graphs/' + this.processGraphId);
		return this.setAll(response.data);
	}

	/**
	 * Modifies the stored process graph at the back-end and afterwards updates this object, too.
	 * 
	 * @async
	 * @param {object} parameters - An object with properties to update, each of them is optional, but at least one of them must be specified. Additional properties can be set if the server supports them.
	 * @param {object} parameters.processGraph - A new process graph.
	 * @param {string} parameters.title - A new title.
	 * @param {string} parameters.description - A new description.
	 * @returns {ProcessGraph} The updated process graph object (this).
	 * @throws {Error}
	 */
	async updateProcessGraph(parameters) {
		await this.connection._patch('/process_graphs/' + this.processGraphId, this._convertToRequest(parameters));
		if (this._supports('describeProcessGraph')) {
			return this.describeProcessGraph();
		}
		else {
			return this.setAll(parameters);
		}
	}

	/**
	 * Deletes the stored process graph from the back-end.
	 * 
	 * @async
	 * @throws {Error}
	 */
	async deleteProcessGraph() {
		await this.connection._delete('/process_graphs/' + this.processGraphId);
	}
}

/**
 * A Secondary Web Service.
 * 
 * @class
 * @extends BaseEntity
 */
export class Service extends BaseEntity {

	/**
	 * Creates an object representing a secondary web service stored at the back-end.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {string} serviceId - The service ID.
	 * @constructor
	 */
	constructor(connection, serviceId) {
		super(connection, ["id", "title", "description", ["process_graph", "processGraph"], "url", "type", "enabled", "parameters", "attributes", "submitted", "plan", "costs", "budget"]);
		this.serviceId = serviceId;
	}

	/**
	 * Updates the data stored in this object by requesting the secondary web service metadata from the back-end.
	 * 
	 * @async
	 * @returns {Service} The updates service object (this).
	 * @throws {Error}
	 */
	async describeService() {
		let response = await this.connection._get('/services/' + this.serviceId);
		return this.setAll(response.data);
	}

	/**
	 * Modifies the secondary web service at the back-end and afterwards updates this object, too.
	 * 
	 * @async
	 * @param {object} parameters - An object with properties to update, each of them is optional, but at least one of them must be specified. Additional properties can be set if the server supports them.
	 * @param {object} parameters.processGraph - A new process graph.
	 * @param {string} parameters.title - A new title.
	 * @param {string} parameters.description - A new description.
	 * @param {boolean} parameters.enabled - Enables (`true`) or disables (`false`) the service.
	 * @param {object} parameters.parameters - A new set of parameters to set for the service.
	 * @param {string} parameters.plan - A new plan.
	 * @param {number} parameters.budget - A new budget.
	 * @returns {Service} The updated service object (this).
	 * @throws {Error}
	 */
	async updateService(parameters) {
		await this.connection._patch('/services/' + this.serviceId, this._convertToRequest(parameters));
		if (this._supports('describeService')) {
			return await this.describeService();
		}
		else {
			return this.setAll(parameters);
		}
	}

	/**
	 * Deletes the secondary web service from the back-end.
	 * 
	 * @async
	 * @throws {Error}
	 */
	async deleteService() {
		await this.connection._delete('/services/' + this.serviceId);
	}
}
