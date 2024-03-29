const Utils = require('@openeo/js-commons/src/utils');

/**
 * Capabilities of a back-end.
 */
class Capabilities {

	/**
	 * Creates a new Capabilities object from an API-compatible JSON response.
	 * 
	 * @param {object.<string, *>} data - A capabilities response compatible to the API specification for `GET /`.
	 * @throws {Error}
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

		/**
		 * @private
		 * @type {object.<string, *>}
		 */
		this.data = data;

		/**
		 * @private
		 * @type {Array.<string>}
		 */
		this.features = this.data.endpoints
			// Flatten features to be compatible with the feature map.
			.map(e => e.methods.map(method => (method + ' ' + e.path).toLowerCase()))
			.reduce((flat, next) => flat.concat(next), []); // .flat(1) once browser support for ECMAscript 10/2019 gets better

		/**
		 * @private
		 * @ignore
		 * @type {object.<string, string>}
		 */
		this.featureMap = {
			// Discovery
			capabilities: true,
			listFileTypes: 'get /file_formats',
			listServiceTypes: 'get /service_types',
			listUdfRuntimes: 'get /udf_runtimes',
			// Collections
			listCollections: 'get /collections',
			describeCollection: 'get /collections/{collection_id}',
			listCollectionItems: 'get /collections/{collection_id}/items',
			// Processes
			listProcesses: 'get /processes',
			describeProcess: 'get /processes',
			// Auth / Account
			listAuthProviders: true,
			authenticateOIDC: 'get /credentials/oidc',
			authenticateBasic: 'get /credentials/basic',
			describeAccount: 'get /me',
			// Files
			listFiles: 'get /files',
			getFile: 'get /files', // getFile is a virtual function and doesn't request an endpoint, but get /files should be available nevertheless.
			uploadFile: 'put /files/{path}',
			downloadFile: 'get /files/{path}',
			deleteFile: 'delete /files/{path}',
			// User-Defined Processes
			validateProcess: 'post /validation',
			listUserProcesses: 'get /process_graphs',
			describeUserProcess: 'get /process_graphs/{process_graph_id}',
			getUserProcess: 'get /process_graphs/{process_graph_id}',
			setUserProcess: 'put /process_graphs/{process_graph_id}',
			replaceUserProcess: 'put /process_graphs/{process_graph_id}',
			deleteUserProcess: 'delete /process_graphs/{process_graph_id}',
			// Processing
			computeResult: 'post /result',
			listJobs: 'get /jobs',
			createJob: 'post /jobs',
			listServices: 'get /services',
			createService: 'post /services',
			getJob: 'get /jobs/{job_id}',
			describeJob: 'get /jobs/{job_id}',
			updateJob: 'patch /jobs/{job_id}',
			deleteJob: 'delete /jobs/{job_id}',
			estimateJob: 'get /jobs/{job_id}/estimate',
			debugJob: 'get /jobs/{job_id}/logs',
			startJob: 'post /jobs/{job_id}/results',
			stopJob: 'delete /jobs/{job_id}/results',
			listResults: 'get /jobs/{job_id}/results',
			downloadResults: 'get /jobs/{job_id}/results',
			// Web services
			describeService: 'get /services/{service_id}',
			getService: 'get /services/{service_id}',
			updateService: 'patch /services/{service_id}',
			deleteService: 'delete /services/{service_id}',
			debugService: 'get /services/{service_id}/logs',
		};
	}

	/**
	 * Returns the capabilities response as a JSON serializable representation of the data that is API compliant.
	 * 
	 * @returns {object.<string, *>} - A reference to the capabilities response.
	 */
	toJSON() {
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
		return typeof this.data.title === 'string' ? this.data.title : "";
	}

	/**
	 * Returns the back-end description.
	 * 
	 * @returns {string} Description
	 */
	description() {
		return typeof this.data.description === 'string' ? this.data.description : "";
	}

	/**
	 * Is the back-end suitable for use in production?
	 * 
	 * @returns {boolean} true = stable/production, false = unstable
	 */
	isStable() {
		return this.data.production === true;
	}

	/**
	 * Returns the links.
	 * 
	 * @returns {Array.<Link>} Array of link objects (href, title, rel, type)
	 */
	links() {
		return Array.isArray(this.data.links) ? this.data.links : [];
	}

	/**
	 * Lists all supported features.
	 * 
	 * @returns {Array.<string>} An array of supported features.
	 */
	listFeatures() {
		let features = [];
		for(let feature in this.featureMap) {
			if (this.featureMap[feature] === true || this.features.includes(this.featureMap[feature])) {
				features.push(feature);
			}
		}
		return features.sort();
	}

	/**
	 * Check whether a feature is supported by the back-end.
	 * 
	 * @param {string} methodName - A feature name (corresponds to the JS client method names, see also the feature map for allowed values).
	 * @returns {boolean} `true` if the feature is supported, otherwise `false`.
	 */
	hasFeature(methodName) {
		return this.featureMap[methodName] === true || this.features.some(e => e === this.featureMap[methodName]);
	}

	/**
	 * Get the billing currency.
	 * 
	 * @returns {string | null} The billing currency or `null` if not available.
	 */
	currency() {
		return (Utils.isObject(this.data.billing) && typeof this.data.billing.currency === 'string' ? this.data.billing.currency : null);
	}

	/**
	 * List all billing plans.
	 * 
	 * @returns {Array.<BillingPlan>} Billing plans
	 */
	listPlans() {
		if (Utils.isObject(this.data.billing) && Array.isArray(this.data.billing.plans)) {
			let defaultPlan = typeof this.data.billing.default_plan === 'string' ? this.data.billing.default_plan.toLowerCase() : null;
			return this.data.billing.plans.map(plan => {
				let addition = {
					default: (defaultPlan === plan.name.toLowerCase())
				};
				return Object.assign({}, plan, addition);
			});
		}
		else {
			return [];
		}
	}
}

module.exports = Capabilities;
