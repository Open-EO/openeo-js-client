const { MIN_OPENEO_API_VERSION, MAX_OPENEO_API_VERSION } = require('../const');
const Utils = require('../utils');
const BaseCapabilties = require('../capabilities');
const Versions = require('@openeo/js-commons/src/versions');

const OPENEO_FEATURE_MAP = {
	// Discovery
	listFileTypes: 'get /file_formats',
	listServiceTypes: 'get /service_types',
	listUdfRuntimes: 'get /udf_runtimes',
	// Processes
	describeProcess: 'get /processes',
	// Account
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
	// Sync Processing
	computeResult: 'post /result',
	// Web services
	listServices: 'get /services',
	createService: 'post /services',
	describeService: 'get /services/{}',
	getService: 'get /services/{}',
	updateService: 'patch /services/{}',
	deleteService: 'delete /services/{}',
	debugService: 'get /services/{}/logs',
};

/**
 * Capabilities of a back-end from an openEO API compatible JSON response.
 */
class Capabilities extends BaseCapabilties {

	/**
	 * Creates a new Capabilities object from an API-compatible JSON response.
	 * 
	 * @param {object.<string, *>} data - A capabilities response compatible to the API specification for `GET /`.
	 * @throws {Error}
	 */
	constructor(data) {
		super(data);

		/**
		 * @private
		 * @ignore
		 * @type {object.<string, string>}
		 */
		Object.assign(this.featureMap, OPENEO_FEATURE_MAP);

		/**
		 * @private
		 * @type {Array.<string>}
		 */
		this.features = Capabilities.endpointsToFeatures(this.data.endpoints);
	}

	/**
	 * Flatten features and simplify variables to be compatible with the feature map.
	 * 
	 * @param {Array.<object>} endpoints 
	 * @returns {Array.<string>}
	 */
	static endpointsToFeatures(endpoints) {
		return endpoints
			.map(e => e.methods.map(method => {
				const path = e.path.replace(/\{[^}]+\}/g, '{}');
				return `${method} ${path}`.toLowerCase();
			}))
			.flat(1);
	}

	/**
	 * Returns the API type.
	 * 
	 * Either `openeo` or `ogcapi`.
	 * 
	 * @returns {string} API type
	 */
	apiType() {
		return 'openeo';
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
	 * Checks whether the back-end supports the required API version for this client.
	 * 
	 * @throws {Error} If the back-end does not support the required API version.
	 */
	checkVersion() {
		const apiVersion = this.apiVersion();
		if (apiVersion && (Versions.compare(apiVersion, MIN_OPENEO_API_VERSION, "<") || Versions.compare(apiVersion, MAX_OPENEO_API_VERSION, ">"))) {
			throw new Error("Client only supports the API versions between " + MIN_OPENEO_API_VERSION + " and " + MAX_OPENEO_API_VERSION);
		}
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
	 * Is the back-end suitable for use in production?
	 * 
	 * @returns {boolean} true = stable/production, false = unstable
	 */
	isStable() {
		return this.data.production === true;
	}
	/**
	 * Returns list of backends in the federation.
	 * 
	 * @returns {Array.<FederationBackend>} Array of backends
	 */
	listFederation() {
		let federation = [];
		if (Utils.isObject(this.data.federation)) {
			// convert to array and add keys as `id` property
			for(const [key, backend] of Object.entries(this.data.federation)) {
				// fresh object to avoid `id` showing up in this.data.federation
				federation.push({ id: key, ...backend });
			}
		}
		return federation;
	}

	/**
	 * Given just the string ID of a backend within the federation, returns that backend's full details as a FederationBackend object.
	 * 
	 * @param {string} backendId - The ID of a backend within the federation
	 * @returns {FederationBackend} The full details of the backend
	 */
	getFederationBackend(backendId) {
		// Add `id` property to make it a proper FederationBackend object
		// If backendId doesn't exist in this.data.federation, will contain just the `id` field (intended behaviour)
		return { id: backendId, ...this.data.federation[backendId] };
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

	// @todo Generate conformance classes in getConformanceClasses() method
	// according to https://github.com/Open-EO/openeo-api/issues/506

}

module.exports = Capabilities;
