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
 * Authentication Provider details.
 * 
 * @typedef AuthProviderMeta
 * @type {object}
 * @property {?string} id Provider identifier, may not be used for all authentication methods. 
 * @property {string} title Title for the authentication method.
 * @property {string} description Description for the authentication method.
 */

/**
 * Response for a HTTP request.
 * 
 * @typedef AxiosResponse
 * @type {object}
 * @property {*} data
 * @property {number} status
 * @property {string} statusText
 * @property {*} headers
 * @property {object.<string, *>} config
 * @property {*} request
 */

/**
 * @typedef BillingPlan
 * @type {object}
 * @property {string} name Name of the billing plan.
 * @property {string} description A description of the billing plan, may include CommonMark syntax.
 * @property {boolean} paid `true` if it is a paid plan, otherwise `false`.
 * @property {string} url A URL pointing to a page describing the billing plan.
 * @property {boolean} default `true` if it is the default plan of the back-end, otherwise `false`.
 */

/**
 * @typedef Collections
 * @type {object}
 * @property {Array.<Collection>} collections
 * @property {Array.<Link>} links
 */

/**
 * @typedef Collection
 * @type {object.<string, *>} 
 */

/**
 * @typedef FileTypesAPI
 * @type {object}
 * @property {object.<string, FileType>} input - File types supported to import
 * @property {object.<string, FileType>} output - File types supported to export
 */

/**
 * @typedef FileType
 * @type {object}
 * @property {string} title
 * @property {string} description
 * @property {Array.<string>} gis_data_types
 * @property {object.<string, *>} parameters
 * @property {Array.<Link>} links
 */

/**
 * Reference to a parameter.
 * 
 * @typedef FromNode
 * @type {object}
 * @property {string} from_node - The node identifier.
 */

/**
 * Reference to a parameter.
 * 
 * @typedef FromParameter
 * @type {object}
 * @property {string} from_parameter - The name of the parameter.
 */

/**
 * @typedef JobEstimate
 * @type {object}
 * @property {?number} costs
 * @property {string} duration
 * @property {number} size in bytes as integer
 * @property {?number} downloads_included integer
 * @property {string} expires
 */

/**
 * A link to another resource.
 * 
 * @typedef Link
 * @type {object}
 * @property {string} href The URL to the resource.
 * @property {?string} rel Relation type
 * @property {?string} type Media type
 * @property {?string} title Human-readable title
 * @property {?Array.<string>} roles A list of roles, if link is originating from an asset.
 */

/**
 * @typedef LogsAPI
 * @type {object}
 * @property {Array.<Log>} logs
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
 * OpenID Connect Provider details as returned by the API.
 * 
 * @augments AuthProviderMeta
 * @typedef OidcProviderMeta
 * @type {object}
 * @property {string} id Provider identifier.
 * @property {string} title Title for the authentication method.
 * @property {string} description Description for the authentication method.
 * @property {string} issuer The OpenID Connect issuer location (authority).
 * @property {Array.<string>} scopes OpenID Connect Scopes
 * @property {Array.<Link>} links Links
 */

/**
 * @typedef Processes
 * @type {object}
 * @property {Array.<Process>} processes
 * @property {Array.<Link>} links
 */

/**
 * An openEO processing chain.
 * 
 * @typedef Process
 * @type {object.<string, *>} 
 */

/**
 * @typedef ServiceType
 * @type {object.<string, *>}
 */

/**
 * @typedef SyncResult
 * @type {object}
 * @property {Stream.Readable|Blob} data The data as `Stream` in NodeJS environments or as `Blob` in browsers.
 * @property {?number} costs The costs for the request in the currency exposed by the back-end.
 * @property {?string} type The content media type returned by the back-end.
 * @property {Array.<Log>} logs Array of log entries as specified in the API.
 */

/**
 * @typedef UdfRuntime
 * @type {object.<string, *>}
 */

/**
 * @typedef UserAccountStorage
 * @type {object}
 * @property {number} free in bytes as integer
 * @property {number} quota in bytes as integer
 */

/**
 * @typedef UserAccount
 * @type {object}
 * @property {string} user_id
 * @property {string} name
 * @property {UserAccountStorage} storage
 * @property {?number} budget
 * @property {Array.<Link>} links
 */