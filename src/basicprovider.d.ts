export = BasicProvider;
declare const BasicProvider_base: typeof import("./authprovider");
/**
 * The Authentication Provider for HTTP Basic.
 *
 * @augments AuthProvider
 */
declare class BasicProvider extends BasicProvider_base {
    /**
     * Creates a new BasicProvider instance to authenticate using HTTP Basic.
     *
     * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
     */
    constructor(connection: import("./connection"));
}
