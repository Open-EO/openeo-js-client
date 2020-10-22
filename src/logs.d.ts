export = Logs;
/**
 * Interface to loop through the logs.
 */
declare class Logs {
    /**
     * Creates a new Logs instance to retrieve logs from a back-end.
     *
     * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
     * @param {string} endpoint - The relative endpoint to request the logs from, usually `/jobs/.../logs` or `/services/.../logs` with `...` being the actual job or service id.
     */
    constructor(connection: import("./connection"), endpoint: string);
    /**
     * @protected
     * @type {Connection}
     */
    protected connection: import("./connection");
    endpoint: string;
    lastId: string;
    /**
     * Retrieves the next log entries since the last request.
     *
     * Retrieves log entries only.
     *
     * @async
     * @param {number} limit - The number of log entries to retrieve per request, as integer.
     * @returns {Promise<object[]>}
     */
    nextLogs(limit?: number): Promise<object[]>;
    /**
     * Retrieves the next log entries since the last request.
     *
     * Retrieves the full response compliant to the API, including log entries and links.
     *
     * @async
     * @param {number} limit - The number of log entries to retrieve per request, as integer.
     * @returns {Promise<object>}
     */
    next(limit?: number): Promise<object>;
}
