const Utils = require('@openeo/js-commons/src/utils');

const FEATURE_MAP = {
	// Discovery
	capabilities: true,
	listFileTypes: 'get /file_formats',
	listServiceTypes: 'get /service_types',
	listUdfRuntimes: 'get /udf_runtimes',
	// Collections
	listCollections: 'get /collections',
	describeCollection: 'get /collections/{}',
	listCollectionItems: 'get /collections/{}/items',
	describeCollectionItem: 'get /collections/{}/items/{}',
	describeCollectionQueryables: 'get /collections/{}/queryables',
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
	uploadFile: 'put /files/{}',
	downloadFile: 'get /files/{}',
	deleteFile: 'delete /files/{}',
	// User-Defined Processes
	validateProcess: 'post /validation',
	listUserProcesses: 'get /process_graphs',
	describeUserProcess: 'get /process_graphs/{}',
	getUserProcess: 'get /process_graphs/{}',
	setUserProcess: 'put /process_graphs/{}',
	replaceUserProcess: 'put /process_graphs/{}',
	deleteUserProcess: 'delete /process_graphs/{}',
	// Processing
	computeResult: 'post /result',
	listJobs: 'get /jobs',
	createJob: 'post /jobs',
	listServices: 'get /services',
	createService: 'post /services',
	getJob: 'get /jobs/{}',
	describeJob: 'get /jobs/{}',
	updateJob: 'patch /jobs/{}',
	deleteJob: 'delete /jobs/{}',
	estimateJob: 'get /jobs/{}/estimate',
	debugJob: 'get /jobs/{}/logs',
	startJob: 'post /jobs/{}/results',
	stopJob: 'delete /jobs/{}/results',
	listResults: 'get /jobs/{}/results',
	downloadResults: 'get /jobs/{}/results',
	// Web services
	describeService: 'get /services/{}',
	getService: 'get /services/{}',
	updateService: 'patch /services/{}',
	deleteService: 'delete /services/{}',
	debugService: 'get /services/{}/logs',
};

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

		/**
		 * @private
		 * @type {object.<string, *>}
		 */
		this.data = data;

		/**
		 * @private
		 * @ignore
		 * @type {object.<string, string>}
		 */
		this.featureMap = FEATURE_MAP;

		/**
		 * @private
		 * @type {Array.<string>}
		 */
		this.features = [];

		this.validate();
		this.init();
	}

	/**
	 * Validates the capabilities.
	 * 
	 * Throws an error in case of an issue, otherwise just passes.
	 * 
	 * @protected
	 * @throws {Error}
	 */
	validate() {
		if(!Utils.isObject(this.data)) {
			throw new Error("No capabilities retrieved.");
		}
		else if(!this.data.api_version) {
			throw new Error("Invalid capabilities: No API version retrieved");
		}
		else if(!Array.isArray(this.data.endpoints)) {
			throw new Error("Invalid capabilities: No endpoints retrieved");
		}
	}

	/**
	 * Initializes the class.
	 * 
	 * @protected
	 */
	init() {
		this.features = this.data.endpoints
			// Flatten features and simplify variables to be compatible with the feature map.
			.map(e => e.methods.map(method => {
				const path = e.path.replace(/\{[^}]+\}/g, '{}');
				return `${method} ${path}`.toLowerCase();
			}))
			.reduce((flat, next) => flat.concat(next), []); // .flat(1) once browser support for ECMAscript 10/2019 gets better
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
		let feature = this.featureMap[methodName];
		if (typeof feature === 'string') {
			feature = feature.toLowerCase();
		}
		return feature === true || this.features.some(e => e === feature);
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

	/**
	 * Migrates a response, if required.
	 * 
	 * @param {AxiosResponse} response 
	 * @protected
	 * @returns {AxiosResponse}
	 */
	migrate(response) { // eslint-disable-line no-unused-vars
		return response;
	}
}

module.exports = Capabilities;
