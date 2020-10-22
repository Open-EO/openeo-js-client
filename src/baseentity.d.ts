export = BaseEntity;
/**
 * The base class for entities such as Job, Process Graph, Service etc.
 *
 * @abstract
 */
declare class BaseEntity {
    /**
     * Creates an instance of this object.
     *
     * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
     * @param {object} properties
     */
    constructor(connection: any, properties?: object);
    /**
     * @protected
     * @type {Connection}
     */
    protected connection: any;
    apiToClientNames: {};
    clientToApiNames: {};
    lastRefreshTime: number;
    extra: {};
    /**
     * Returns a JSON serializable representation of the data that is API compliant.
     *
     * @returns {object}
     */
    toJSON(): object;
    /**
     * Converts the data from an API response into data suitable for our JS client models.
     *
     * @param {object} metadata - JSON object originating from an API response.
     * @returns {BaseEntity} Returns the object itself.
     */
    setAll(metadata: object): BaseEntity;
    /**
     * Returns the age of the data in seconds.
     *
     * @returns {number} Age of the data in seconds as integer.
     */
    getDataAge(): number;
    /**
     * Returns all data in the model.
     *
     * @returns {object}
     */
    getAll(): object;
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
     * @param {object} parameters
     * @returns {object}
     * @protected
     */
    protected _convertToRequest(parameters: object): object;
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
