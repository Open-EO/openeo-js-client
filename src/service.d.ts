export = Service;
declare const Service_base: typeof import("./baseentity");
/**
 * A Secondary Web Service.
 *
 * @augments BaseEntity
 */
declare class Service extends Service_base {
    /**
     * Creates an object representing a secondary web service stored at the back-end.
     *
     * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
     * @param {string} serviceId - The service ID.
     */
    constructor(connection: import("./connection"), serviceId: string);
    /**
     * The identifier of the service.
     * @public
     * @readonly
     * @type {string}
     */
    public readonly id: string;
    /**
     * @public
     * @readonly
     * @type {?string}
     */
    public readonly title: string | null;
    /**
     * @public
     * @readonly
     * @type {?string}
     */
    public readonly description: string | null;
    /**
     * The process chain to be executed.
     * @public
     * @readonly
     * @type {Process}
     */
    public readonly process: any;
    /**
     * URL at which the secondary web service is accessible
     * @public
     * @readonly
     * @type {string}
     */
    public readonly url: string;
    /**
     * Web service type (protocol / standard) that is exposed.
     * @public
     * @readonly
     * @type {string}
     */
    public readonly type: string;
    /**
     * @public
     * @readonly
     * @type {boolean}
     */
    public readonly enabled: boolean;
    /**
     * Map of configuration settings, i.e. the setting names supported by the secondary web service combined with actual values.
     * @public
     * @readonly
     * @type {object.<string, *>}
     */
    public readonly configuration: any;
    /**
     * Additional attributes of the secondary web service, e.g. available layers for a WMS based on the bands in the underlying GeoTiff.
     * @public
     * @readonly
     * @type {object.<string, *>}
     */
    public readonly attributes: any;
    /**
     * Date and time of creation, formatted as a RFC 3339 date-time.
     * @public
     * @readonly
     * @type {string}
     */
    public readonly created: string;
    /**
     * The billing plan to process and charge the service with.
     * @public
     * @readonly
     * @type {string}
     */
    public readonly plan: string;
    /**
     * An amount of money or credits in the currency specified by the back-end.
     * @public
     * @readonly
     * @type {?number}
     */
    public readonly costs: number | null;
    /**
     * Maximum amount of costs the request is allowed to produce in the currency specified by the back-end.
     * @public
     * @readonly
     * @type {?number}
     */
    public readonly budget: number | null;
    /**
     * Updates the data stored in this object by requesting the secondary web service metadata from the back-end.
     *
     * @async
     * @returns {Promise<Service>} The updates service object (this).
     * @throws {Error}
     */
    describeService(): Promise<Service>;
    /**
     * Modifies the secondary web service at the back-end and afterwards updates this object, too.
     *
     * @async
     * @param {object} parameters - An object with properties to update, each of them is optional, but at least one of them must be specified. Additional properties can be set if the server supports them.
     * @param {Process} parameters.process - A new process.
     * @param {string} parameters.title - A new title.
     * @param {string} parameters.description - A new description.
     * @param {boolean} parameters.enabled - Enables (`true`) or disables (`false`) the service.
     * @param {object.<string, *>} parameters.configuration - A new set of configuration parameters to set for the service.
     * @param {string} parameters.plan - A new plan.
     * @param {number} parameters.budget - A new budget.
     * @returns {Promise<Service>} The updated service object (this).
     * @throws {Error}
     */
    updateService(parameters: {
        process: any;
        title: string;
        description: string;
        enabled: boolean;
        configuration: any;
        plan: string;
        budget: number;
    }): Promise<Service>;
    /**
     * Deletes the secondary web service from the back-end.
     *
     * @async
     * @throws {Error}
     */
    deleteService(): Promise<void>;
    /**
     * Get logs for the secondary web service from the back-end.
     *
     * @returns {Logs}
     */
    debugService(): import("./logs");
    /**
     * Checks for new log entries every x seconds.
     *
     * On every status change (enabled/disabled) observed or on new log entries
     * (if supported by the back-end and not disabled via `requestLogs`), the
     * callback is executed. It may also be executed once at the beginning.
     * The callback receives the updated service (this object) and the logs (array) passed.
     *
     * Returns a function that can be called to stop monitoring the service manually.
     * The monitoring must be stopped manually, otherwise it runs forever.
     *
     * This is only supported if describeService is supported by the back-end.
     *
     * @param {Function} callback
     * @param {number} [interval=60] - Interval between update requests, in seconds as integer.
     * @param {boolean} [requestLogs=true] - Enables/Disables requesting logs
     * @returns {Function}
     * @throws {Error}
     */
    monitorService(callback: Function, interval?: number, requestLogs?: boolean): Function;
}
