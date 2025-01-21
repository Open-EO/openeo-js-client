/**
 * Capabilities of a back-end.
 */
class Capabilities {

	/**
	 * Creates a new Capabilities object.
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
		this.featureMap = {
			capabilities: true,
			// Auth
			listAuthProviders: true,
			authenticateOIDC: 'get /credentials/oidc',
			authenticateBasic: 'get /credentials/basic',
			// Collections
			listCollections: 'get /collections',
			describeCollection: 'get /collections/{}',
			listCollectionItems: 'get /collections/{}/items',
			describeCollectionItem: 'get /collections/{}/items/{}',
			describeCollectionQueryables: 'get /collections/{}/queryables',
			// Processes
			listProcesses: 'get /processes',
			// Jobs
			listJobs: 'get /jobs',
			createJob: 'post /jobs',
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
		};

		/**
		 * @private
		 * @type {Array.<string>}
		 */
		this.features = [];
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
	 * Returns the API type.
	 * 
	 * Either `openeo` or `ogcapi`.
	 * 
	 * @returns {string} API type
	 */
	apiType() {
		return undefined;
	}

	/**
	 * Returns the openEO API version implemented by the back-end.
	 * 
	 * @returns {string} openEO API version number.
	 */
	apiVersion() {
		return undefined;
	}

	/**
	 * Checks whether the back-end supports the required API version for this client.
	 * 
	 * @throws {Error} If the back-end does not support the required API version.
	 */
	checkVersion() {}

	/**
	 * Returns the back-end version number.
	 * 
	 * @returns {string} openEO back-end version number.
	 */
	backendVersion() {
		return undefined;
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
		return true;
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
	 * Returns list of backends in the federation.
	 * 
	 * @returns {Array.<FederationBackend>} Array of backends
	 */
	listFederation() {
		return [];
	}

	/**
	 * Given just the string ID of a backend within the federation, returns that backend's full details as a FederationBackend object.
	 * 
	 * @param {string} backendId - The ID of a backend within the federation
	 * @returns {FederationBackend} The full details of the backend
	 */
	getFederationBackend(/*backendId*/) {
		return {};
	}

	/**
	 * Given a list of string IDs of backends within the federation, returns those backends' full details as FederationBackend objects.
	 * 
	 * @param {Array<string>} backendIds - The IDs of backends within the federation
	 * @returns {Array<FederationBackend>} An array in the same order as the input, containing for each position the full details of the backend
	 */
	getFederationBackends(backendIds) {
		// Let 'single case' function do the work, but pass `this` so that `this.data.federation` can be accessed in the callback context
		return backendIds.map(this.getFederationBackend, this);
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
		if (!(methodName in this.featureMap)) {
			return false;
		}
		let feature = this.featureMap[methodName];
		if (typeof feature === 'string') {
			feature = feature.toLowerCase();
		}
		return feature === true || this.features.some(e => e === feature);
	}

	/**
	 * Returns the conformance classes.
	 * 
	 * @returns {Array.<string>} An array of supported features.
	 */
	getConformanceClasses() {
		if(!Array.isArray(this.data.conformsTo)) {
			return [];
		}
		return this.data.conformsTo;
	}

	/**
	 * Check whether a conformance class is supported by the back-end.
	 * 
	 * @param {string|Array.<string>} uris - Conformance class URI(s) - one of must match.
	 * @returns {boolean} `true` if the conformance class is supported, otherwise `false`.
	 */
	hasConformance(uris) {
		if(!Array.isArray(this.data.conformsTo)) {
			return false;
		}
		if (typeof uris === 'string') {
			return this.data.conformsTo.includes(uris);
		}
		else if (Array.isArray(uris)) {
			return uris.some(uri => this.data.conformsTo.includes(uri));
		}
		else {
			return false;
		}
	}

	/**
	 * Get the billing currency.
	 * 
	 * @returns {string | null} The billing currency or `null` if not available.
	 */
	currency() {
		return null;
	}

	/**
	 * List all billing plans.
	 * 
	 * @returns {Array.<BillingPlan>} Billing plans
	 */
	listPlans() {
		return [];
	}

}

module.exports = Capabilities;
