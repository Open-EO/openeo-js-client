/**
 * A link to another resource.
 * 
 * @typedef Link
 * @type {object}
 * @property {string} href The URL to the resource.
 * @property {string} rel Relation type
 * @property {string} type Media type
 * @property {string} title Human-readable title
 */

/**
 * An openEO processing chain.
 * 
 * @typedef Process
 * @type {object.<string, *>} 
 */

/**
 * An error.
 * 
 * @typedef ApiError
 * @type {object}
 * @property {string} id 
 * @property {string} code 
 * @property {string} message 
 * @property {Array.<Link>} links 
 */

/**
 * A log entry.
 * 
 * @typedef Log
 * @type {object}
 * @property {string} id 
 * @property {string} code 
 * @property {string} level
 * @property {string} message 
 * @property {*} data
 * @property {Array.<object.<string, ?string>>} path
 * @property {Array.<Link>} links 
 */

/**
 * Authentication Provider details.
 * 
 * @typedef AuthProviderMeta
 * @type {object}
 * @property {?string} id Provider identifier, may not be used for all authentication methods. 
 * @property {string} title Title for the authentication method.
 * @property {string} description Description for the authentication method.
 */