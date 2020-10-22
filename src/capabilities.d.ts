export = Capabilities;
/**
 * Capabilities of a back-end.
 */
declare class Capabilities {
    /**
     * Creates a new Capabilities object from an API-compatible JSON response.
     *
     * @param {object.<string, *>} data - A capabilities response compatible to the API specification for `GET /`.
     * @throws {Error}
     */
    constructor(data: any);
    /**
     * @private
     * @type {object.<string, *>}
     */
    private data;
    /**
     * @private
     * @type {Array.<string>}
     */
    private features;
    /**
     * @private
     * @ignore
     * @type {object.<string, string>}
     */
    private featureMap;
    /**
     * Returns the capabilities response as a JSON serializable representation of the data that is API compliant.
     *
     * @returns {object.<string, *>} - A reference to the capabilities response.
     */
    toJSON(): any;
    /**
     * Returns the openEO API version implemented by the back-end.
     *
     * @returns {string} openEO API version number.
     */
    apiVersion(): string;
    /**
     * Returns the back-end version number.
     *
     * @returns {string} openEO back-end version number.
     */
    backendVersion(): string;
    /**
     * Returns the back-end title.
     *
     * @returns {string} Title
     */
    title(): string;
    /**
     * Returns the back-end description.
     *
     * @returns {string} Description
     */
    description(): string;
    /**
     * Is the back-end suitable for use in production?
     *
     * @returns {boolean} true = stable/production, false = unstable
     */
    isStable(): boolean;
    /**
     * Returns the links.
     *
     * @returns {Array.<Link>} Array of link objects (href, title, rel, type)
     */
    links(): Link[];
    /**
     * Lists all supported features.
     *
     * @returns {Array.<string>} An array of supported features.
     */
    listFeatures(): Array<string>;
    /**
     * Check whether a feature is supported by the back-end.
     *
     * @param {string} methodName - A feature name (corresponds to the JS client method names, see also the feature map for allowed values).
     * @returns {boolean} `true` if the feature is supported, otherwise `false`.
     */
    hasFeature(methodName: string): boolean;
    /**
     * Get the billing currency.
     *
     * @returns {?string} The billing currency or `null` if not available.
     */
    currency(): string | null;
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
     * List all billing plans.
     *
     * @returns {Array.<BillingPlan>} Billing plans
     */
    listPlans(): {
        /**
         * Name of the billing plan.
         */
        name: string;
        /**
         * A description of the billing plan, may include CommonMark syntax.
         */
        description: string;
        /**
         * `true` if it is a paid plan, otherwise `false`.
         */
        paid: boolean;
        /**
         * A URL pointing to a page describing the billing plan.
         */
        url: string;
        /**
         * `true` if it is the default plan of the back-end, otherwise `false`.
         */
        default: boolean;
    }[];
}
