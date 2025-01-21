const Capabilities = require("../capabilities");
const OpenEOCapabilities = require("../openeo/capabilities");
const { DATA_RELS } = require("../const");
const Utils = require("../utils");

/**
 *
 */
class OgcCapabilities extends Capabilities {

	/**
	 * Creates a new Capabilities object from an OGC API compatible JSON response.
	 * 
	 * @param {object.<string, *>} data - A capabilities response compatible to the API specification for `GET /`.
	 * @throws {Error}
	 */
	constructor(data) {
		super(data);

		Object.assign(this.featureMap, {
			// OGC API
			describeProcess: 'get /processes/{}',
			// Sync Processing
			computeResult: 'post /processes/{}/execution',
		});

		const links = this.data.links;

		// Temporarily parse endpoint list for authentication
		if (Array.isArray(this.data.endpoints)) {
			this.features = OpenEOCapabilities.endpointsToFeatures(this.data.endpoints);
		}

		const hasCollections = Utils.getLinkHref(links, DATA_RELS);
		if (hasCollections) {
			this.features.push('get /collections');
			this.features.push('get /collections/{}');
		}
		
		const isFeatures = this.hasConformance([
			'http://www.opengis.net/spec/ogcapi-features-1/1.0/req/core',
			'https://api.stacspec.org/v1.0.0/ogcapi-features'
		]);
		if (isFeatures) {
			this.features.push('get /collections/{}/items');
			this.features.push('get /collections/{}/items/{}');
		}

		const isProcessApi = this.hasConformance('http://www.opengis.net/spec/ogcapi-processes-1/1.0/conf/core');
		const processLink = Utils.getLinkHref(links, 'https://www.opengis.net/def/rel/ogc/1.0/processes');
		if (isProcessApi || processLink) {
			this.features.push('get /processes');
			this.features.push('get /processes/{}');
			this.features.push('post /processes/{}/execution');

			const processJobList = this.hasConformance('http://www.opengis.net/spec/ogcapi-processes-1/1.0/req/job-list');
			const jobLink = Utils.getLinkHref(links, 'https://www.opengis.net/def/rel/ogc/1.0/job-list');
			if (processJobList || jobLink) {
				this.features.push('get /jobs');
				this.features.push('get /jobs/{}');
			}
			
			const processDismiss = this.hasConformance('http://www.opengis.net/spec/ogcapi-processes-1/1.0/conf/dismiss');
			if (processDismiss) { // @todo Is dismiss equivalent to openEO job cancellation or deletion?
				this.features.push('delete /jobs/{}');
			}
		}
	}

	/**
	 * Returns the API type.
	 * 
	 * Either `openeo` or `ogcapi`.
	 * 
	 * @returns {string} API type
	 */
	apiType() {
		return 'ogcapi';
	}
}


module.exports = OgcCapabilities;