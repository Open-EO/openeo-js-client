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
 * @property {Array.<string>} ["federation:missing"] A list of backends from the federation that are missing in the response data.
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
 * @typedef Item
 * @type {object.<string, *>} 
 */

/**
 * @typedef ItemCollection
 * @type {object}
 * @property {Array.<Item>} features - The items in the collection.
 * @property {?Array.<Link>} links - Additional links, e.g. for pagination.
 * @property {?string} timeStamp This property indicates the time and date when the response was generated.
 * @property {?number} numberMatched The number (integer) of features of the feature type that match the selection parameters.
 * @property {?number} numberReturned The number (integer) of features in the feature collection.
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
 * Default OpenID Connect Client as returned by the API.
 * 
 * @typedef OidcClient
 * @type {object}
 * @property {string} id Client ID
 * @property {Array.<string>} grant_types Supported Grant Types
 * @property {Array.<string>} redirect_urls Allowed Redirect URLs
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
 * @property {Array.<OidcClient>} default_clients Default OpenID Connect Clients
 * @property {Array.<Link>} links Links
 */

/**
 * Connection options.
 * 
 * @typedef Options
 * @type {object}
 * @property {boolean} addNamespaceToProcess Add a namespace property to processes if set to `true`. Defaults to `false`.
 */

/**
 * @typedef Processes
 * @type {object}
 * @property {Array.<Process>} processes
 * @property {Array.<Link>} links
 * @property {?Array.<string>} namespaces EXPERIMENTAL!
 * @property {Array.<string>} ["federation:missing"] A list of backends from the federation that are missing in the response data.
 */

/**
 * An openEO processing chain.
 * 
 * @typedef Process
 * @type {object.<string, *>} 
 */

/**
 * An array of backends in the federation.
 * 
 * @typedef FederationBackend
 * @type {object}
 * @property {string} url URL to the versioned API endpoint of the back-end.
 * @property {string} title Name of the back-end.
 * @property {string} description A description of the back-end and its specifics.
 * @property {string} status Current status of the back-ends (online or offline).
 * @property {string} last_status_check The time at which the status of the back-end was checked last, formatted as a RFC 3339 date-time.
 * @property {string} last_successful_check If the `status` is `offline`: The time at which the back-end was checked and available the last time. Otherwise, this is equal to the property `last_status_check`. Formatted as a RFC 3339 date-time.
 * @property {boolean} experimental Declares the back-end to be experimental.
 * @property {boolean} deprecated Declares the back-end to be deprecated.
 */

/**
 * An array, but enriched with additional details from an openEO API response.
 * 
 * Adds two properties: `links` and `federation:missing`.
 * 
 * @typedef ResponseArray
 * @augments Array
 * @type {Array.<*>}
 * @property {Array.<Link>} links A list of related links.
 * @property {Array.<string>} ["federation:missing"] A list of backends from the federation that are missing in the response data.
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
 * @property {?string} name
 * @property {?string} default_plan
 * @property {?UserAccountStorage} storage
 * @property {?number} budget
 * @property {?Array.<Link>} links
 */

/**
 * An array, but enriched with additional details from an openEO API response.
 * 
 * Adds the property `federation:backends`.
 * 
 * @typedef ValidationResult
 * @augments Array
 * @type {Array.<ApiError>}
 * @property {Array.<string>} ["federation:backends"] The back-ends that support / do not support the process.
 */
