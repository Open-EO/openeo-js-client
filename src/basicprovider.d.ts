import {AuthProvider} from "./authprovider";
import {Connection} from "./connection";

/**
 * The Authentication Provider for HTTP Basic.
 *
 * @augments AuthProvider
 */
export declare class BasicProvider extends AuthProvider {
    /**
     * Creates a new BasicProvider instance to authenticate using HTTP Basic.
     *
     * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
     */
    constructor(connection: Connection);
}
