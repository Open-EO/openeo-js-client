/* eslint-disable max-classes-per-file */

const Job = require('./job.js');
const Service = require('./service.js');
const UserFile = require('./userfile.js');
const UserProcess = require('./userprocess.js');
const Utils = require('@openeo/js-commons/src/utils');
const StacMigrate = require('@radiantearth/stac-migrate');

const FED_MISSING = 'federation:missing';

/**
 * A class to handle pagination of resources.
 * 
 * @abstract
 */
class Pages {
  /**
   * Creates an instance of Pages.
   *
   * @param {Connection} connection
   * @param {string} endpoint
   * @param {string} key
   * @param {Constructor} cls
   * @param {object} [params={}]
   * @param {string} primaryKey
   */
  constructor(connection, endpoint, key, cls, params = {}, primaryKey = "id") {
    this.connection = connection;
		this.nextUrl = endpoint;
    this.key = key;
    this.primaryKey = primaryKey;
    this.cls = cls;
    if (!(params.limit > 0)) {
      delete params.limit;
    }
    this.params = params;
  }

  /**
   * Returns true if there are more pages to fetch.
   *
   * @returns {boolean}
   */
  hasNextPage() {
    return this.nextUrl !== null;
  }

  /**
   * Returns the next page of resources.
   * 
   * @async
   * @param {Array.<object>} oldObjects - Existing objects to update, if any.
   * @param {boolean} [toArray=true] - Whether to return the objects as a simplified array or as an object with all information.
   * @returns {Array.<object>}
   * @throws {Error}
   */
  async nextPage(oldObjects = [], toArray = true) {
    // Request data from server
    const response = await this.connection._get(this.nextUrl, this.params);

    let data = response.data;
    // Check response
    if (!Utils.isObject(data)) {
      throw new Error(`Response is invalid, is not an object`);
    }
    if (!Array.isArray(data[this.key])) {
      throw new Error(`Response is invalid, '${this.key}' property is not an array`);
    }

    // Update existing objects if needed
    let newObjects = data[this.key].map(updated => {
      let resource = oldObjects.find(old => old[this.primaryKey] === updated[this.primaryKey]);
      if (resource) {
        resource.setAll(updated);
      }
      else {
        resource = this._createObject(updated);
      }
      return resource;
    });

    // Store objects in cache if needed
    newObjects = this._cache(newObjects);

    // Add self link if missing
    data.links = this._ensureArray(data.links);
    const selfLink = this.connection._getLinkHref(data.links, 'self');
    if (!selfLink) {
      data.links.push({rel: 'self', href: this.nextUrl});
    }

    // Check whether a next page is available
    this.nextUrl = this._getNextLink(response);
    // Don't append initial params to the next URL
    this.params = null;

    // Either return as ResponseArray or full API response body
    if (toArray) {
      newObjects.links = data.links;
      newObjects[FED_MISSING] = this._ensureArray(data[FED_MISSING]);
      return newObjects;
    }
    else {
      data[this.key] = newObjects;
      return data;
    }
  }

  /**
   * Ensures a variable is an array.
   * 
   * @protected
   * @param {*} x 
   * @returns {Array}
   */
  _ensureArray(x) {
    return Array.isArray(x) ? x : [];
  }

  /**
   * Creates a facade for the object, if needed.
   *
   * @protected
   * @param {object} obj 
   * @returns {object}
   */
  _createObject(obj) {
    if (this.cls) {
      const cls = this.cls;
      const newObj = new cls(this.connection, obj[this.primaryKey]);
      newObj.setAll(obj);
      return newObj;
    }
    else {
      return obj;
    }
  }

  /**
   * Caches the plain objects if needed.
   * 
   * @param {Array.<object>} objects
   * @returns {Array.<object>}
   */
  _cache(objects) {
    return objects;
  }
  
  /**
   * Get the URL of the next page from a response.
   * 
   * @protected
   * @param {AxiosResponse} response 
   * @returns {string | null}
   */
  _getNextLink(response) {
    const links = this.connection.makeLinksAbsolute(response.data.links, response);
    return this.connection._getLinkHref(links, 'next');
  }
  
  /**
   * Makes this class asynchronously iterable.
   *
   * @returns {AsyncIterator}
   */
  [Symbol.asyncIterator]() {
    return {
      self: this,
      /**
       * Get the next page of resources.
       *
       * @async
       * @returns {{done: boolean, value: Array.<object>}}
       */
      async next() {
        const done = !this.self.hasNextPage();
        let value;
        if (!done) {
          value = await this.self.nextPage();
        }
        return { done, value };
      }
    }
  }

}

/**
 * Paginate through jobs.
 */
class JobPages extends Pages {
  /**
   * Paginate through jobs.
   *
   * @param {Connection} connection
   * @param {?number} limit
   */
  constructor(connection, limit = null) {
    super(connection, "/jobs", "jobs", Job, {limit});
  }
}

/**
 * Paginate through services.
 */
class ServicePages extends Pages {
  /**
   * Paginate through services.
   *
   * @param {Connection} connection
   * @param {?number} limit
   */
  constructor(connection, limit = null) {
    super(connection, "/services", "services", Service, {limit});
  }
}

/**
 * Paginate through user files.
 */
class UserFilePages extends Pages {
  /**
   * Paginate through user files.
   *
   * @param {Connection} connection
   * @param {?number} limit
   */
  constructor(connection, limit = null) {
    super(connection, "/files", "files", UserFile, {limit}, "path");
  }
}

/**
 * Paginate through processes.
 */
class ProcessPages extends Pages {
  /**
   * Paginate through processes.
   *
   * @param {Connection} connection
   * @param {?number} limit
   * @param {?string} namespace
   */
  constructor(connection, limit = null, namespace = null) {
    if (!namespace) {
			namespace = 'backend';
		}
    let endpoint;
    let cls = null
    if (namespace === 'user') {
      endpoint = '/process_graphs';
      cls = UserProcess;
    }
    else {
      endpoint = '/processes';
      if (namespace !== 'backend') {
        const normalized = connection.normalizeNamespace(namespace);
        endpoint += `/${normalized}`;
      }
    }
    super(connection, endpoint, "processes", cls, {limit});
    this.namespace = namespace;
  }

  /**
   * Caches the objects to the ProcessRegistry.
   * 
   * @param {Array.<object>} objects
   * @returns {Array.<object>}
   */
  _cache(objects) {
    const plainObjects = objects.map(p => (typeof p.toJSON === 'function' ? p.toJSON() : p));
    this.connection.processes.addAll(plainObjects, this.namespace);
    if (!this.cls) {
      for (let i in objects) {
        objects[i] = this.connection.processes.get(objects[i].id, this.namespace);
      }
    }
    return objects;
  }
}

/**
 * Paginate through collections.
 */
class CollectionPages extends Pages {
  /**
   * Paginate through collections.
   *
   * @param {Connection} connection
   * @param {?number} limit
   */
  constructor(connection, limit = null) {
    super(connection, "/collections", "collections", null, {limit});
  }

  /**
   * Migrates the STAC collection to the latest version.
   * 
   * @param {object} obj 
   * @returns {Collection}
   */
  _createObject(obj) {
    if (obj.stac_version) {
      return StacMigrate.collection(obj);
    }
    return obj;
  }
}

/**
 * Paginate through collection items.
 */
class ItemPages extends Pages {
  /**
   * Paginate through collection items.
   *
   * @param {Connection} connection
   * @param {string} collectionId
   * @param {object} params
   */
  constructor(connection, collectionId, params) {
    super(connection, `/collections/${collectionId}/items`, "features", null, params);
  }

  /**
   * Migrates the STAC item to the latest version.
   * 
   * @param {object} obj 
   * @returns {Item}
   */
  _createObject(obj) {
    if (obj.stac_version) {
      return StacMigrate.item(obj);
    }
    return obj;
  }
}

module.exports = {
  Pages,
  CollectionPages,
  ItemPages,
  JobPages,
  ProcessPages,
  ServicePages,
  UserFilePages
}
