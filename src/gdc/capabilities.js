const Capabilities = require("../capabilities");
const Utils = require('@openeo/js-commons/src/utils');
const Migrate = require('./migrate');

class GdcCapabilities extends Capabilities {

  constructor(data) {
    super(data);
    Object.assign(this.featureMap, {
      describeCoverage: 'get /collections/{}/coverage',
      describeCoverageDomainset: 'get /collections/{}/coverage/domainset',
      describeCoverageRangetype: 'get /collections/{}/coverage/rangetype',
      describeCoverageRangeset: 'get /collections/{}/coverage/rangeset',
      describeCoverageMetadata: 'get /collections/{}/coverage/metadata',
      executeOgcProcess: 'post /processes/{}/execution',
    });
    this.checkConformance();
  }

  getConformanceClasses() {
    if(!Array.isArray(this.data.conformsTo)) {
      return [];
    }
    return this.data.conformsTo;
  }

  hasConformance(uri) {
    if(!Array.isArray(this.data.conformsTo)) {
      return false;
    }
    return this.data.conformsTo.includes(uri);
  }

  _getLink(rel) {
		if (!Array.isArray(this.data.links)) {
			return null;
		}
		return this.data.links.find(link => link.rel === rel) || null;
  }

  checkConformance() {
    if (!Array.isArray(this.data.endpoints)) {
      this.data.endpoints = [];
    }
    const isCoverage = this.hasConformance('http://www.opengis.net/spec/ogcapi-coverages-1/0.0/conf/geodata-coverage');
    const isFeatures = this.hasConformance('http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core');
    if (isCoverage || isFeatures) {
      this.data.endpoints.push({
        "path": "/collections",
        "methods": ["GET"]
      });
      this.data.endpoints.push({
        "path": "/collections/{collection_id}",
        "methods": ["GET"]
      });
    }
    // if (isFeatures) {
    //   this.data.endpoints.push({
    //     "path": "/collections/{collection_id}/items",
    //     "methods": ["GET"]
    //   });
    //   this.data.endpoints.push({
    //     "path": "/collections/{collection_id}/items/{item_id}",
    //     "methods": ["GET"]
    //   });
    // }
    if (isCoverage) {
      this.data.endpoints.push({
        "path": "/collections/{collection_id}/coverage",
        "methods": ["GET"]
      });
      this.data.endpoints.push({
        "path": "/collections/{collection_id}/coverage",
        "methods": ["GET"]
      });
      this.data.endpoints.push({
        "path": "/collections/{collection_id}/coverage/domainset",
        "methods": ["GET"]
      });
      this.data.endpoints.push({
        "path": "/collections/{collection_id}/coverage/rangetype",
        "methods": ["GET"]
      });
      this.data.endpoints.push({
        "path": "/collections/{collection_id}/coverage/rangeset",
        "methods": ["GET"]
      });
      this.data.endpoints.push({
        "path": "/collections/{collection_id}/coverage/metadata",
        "methods": ["GET"]
      });
    }
    const isProcessApi = this.hasConformance('http://www.opengis.net/spec/ogcapi-processes-1/1.0/conf/core');
    const processDismiss = this.hasConformance('http://www.opengis.net/spec/ogcapi-processes-1/1.0/conf/dismiss');
    const processJobList = this.hasConformance('http://www.opengis.net/spec/ogcapi-processes-1/1.0/req/job-list');
    const processLink = this._getLink('https://www.opengis.net/def/rel/ogc/1.0/processes');
    if (isProcessApi || processLink) {
      this.data.endpoints.push({
        "path": "/processes",
        "methods": ["GET"]
      });
      this.data.endpoints.push({
        "path": "/processes/{processId}",
        "methods": ["GET"]
      });
      this.data.endpoints.push({
        "path": "/processes/{processId}/execution",
        "methods": ["POST"]
      });
      let jobMethods = ["GET"];
      if (processDismiss) { // @todo Is dismiss equivalent to openEO job cancellation or deletion?
        jobMethods.push("DELETE");
      }
      this.data.endpoints.push({
        "path": "/jobs/{job_id}",
        "methods": jobMethods
      });
      this.data.endpoints.push({
        "path": "/jobs/{job_id}/results",
        "methods": ["GET"]
      });
    }
    const jobLink = this._getLink('https://www.opengis.net/def/rel/ogc/1.0/job-list');
    if (processJobList || jobLink) {
      this.data.endpoints.push({
        "path": "/jobs",
        "methods": ["GET"]
      });
    }
    this.init();
  }

	/**
	 * Initializes the class.
	 * 
	 * @protected
	 */
  init() {
    if (Array.isArray(this.data.endpoints)) {
      super.init();
    }
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
  }

	/**
	 * Returns the openEO API version implemented by the back-end.
	 * 
	 * @returns {string} openEO API version number.F
	 */
	apiVersion() {
		return this.data.api_version;
	}

	/**
	 * Returns the GDC API version implemented by the back-end.
	 * 
	 * @returns {string} GDC API version number.
	 */
	gdcVersion() {
		return this.data.gdc_version || "1.0.0-beta";
	}

  isEndpoint(response, method, endpoint) {
    if (response.config.method !== method) {
      return false;
    }
    if (endpoint.includes('{}')) {
      let pattern = '^' + endpoint.replace('{}', '[^/]+') + '$';
      let regex = new RegExp(pattern);
      return regex.test(response.config.url);
    }
    return endpoint === response.config.url;
  }

	/**
	 * Migrates a response, if required.
	 * 
	 * @param {AxiosResponse} response 
	 * @protected
	 * @returns {AxiosResponse}
	 */
	migrate(response) {
    if (this.isEndpoint(response, 'get', '/collections')) {
      response.data.collections = response.data.collections.map(collection => Migrate.collection(collection, response));
    }
    else if (this.isEndpoint(response, 'get', '/collections/{}')) {
      response.data = Migrate.collection(response.data, response);
    }
    else if (this.isEndpoint(response, 'get', '/processes')) {
      response.data.processes = response.data.processes.map(process => Migrate.process(process, response));
    }
    else if (this.isEndpoint(response, 'get', '/jobs')) {
      response.data.jobs = response.data.jobs.map(job => Migrate.job(job, response));
    }
    else if (this.isEndpoint(response, 'get', '/jobs/{}')) {
      response.data = Migrate.job(response.data, response);
    }

    response = Migrate.all(response);
    
		return response;
	}
}


module.exports = GdcCapabilities;