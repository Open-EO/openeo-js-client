import {Connection} from "./connection";

/**
 * The base class for entities such as Job, Process Graph, Service etc.
 *
 * @abstract
 */
export declare class BaseEntity {
    /**
     * Creates an instance of this object.
     *
     * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
     * @param {Array} properties - A mapping from the API property names to the JS client property names (usually to convert between snake_case and camelCase), e.g. `["id", "title", ["process_graph", "processGraph"]]`
     */
    constructor(connection: Connection, properties?: any[]);
    /**
     * @protected
     * @type {Connection}
     */
    protected connection: Connection;
    /**
     * @protected
     * @type {object.<string, string>}
     */
    protected apiToClientNames: any;
    /**
     * @protected
     * @type {object.<string, string>}
     */
    protected clientToApiNames: any;
    /**
     * @protected
     * @type {number}
     */
    protected lastRefreshTime: number;
    /**
     * Additional (non-standardized) properties received from the API.
     *
     * @protected
     * @type {object.<string, *>}
     */
    protected extra: any;
    /**
     * Returns a JSON serializable representation of the data that is API compliant.
     *
     * @returns {object.<string, *>}
     */
    toJSON(): any;
    /**
     * Converts the data from an API response into data suitable for our JS client models.
     *
     * @param {object.<string, *>} metadata - JSON object originating from an API response.
     * @returns {BaseEntity} Returns the object itself.
     */
    setAll(metadata: any): BaseEntity;
    /**
     * Returns the age of the data in seconds.
     *
     * @returns {number} Age of the data in seconds as integer.
     */
    getDataAge(): number;
    /**
     * Returns all data in the model.
     *
     * @returns {object.<string, *>}
     */
    getAll(): any;
    /**
     * Get a value from the additional data that is not part of the core model, i.e. from proprietary extensions.
     *
     * @param {string} name - Name of the property.
     * @returns {*} The value, which could be of any type.
     */
    get(name: string): any;
    /**
     * Converts the object to a valid objects for API requests.
     *
     * @param {object.<string, *>} parameters
     * @returns {object.<string, *>}
     * @protected
     */
    protected _convertToRequest(parameters: any): any;
    /**
     * Checks whether a features is supported by the API.
     *
     * @param {string} feature
     * @returns {boolean}
     * @protected
     * @see Capabilities#hasFeature
     */
    protected _supports(feature: string): boolean;
}
