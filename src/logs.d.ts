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
     * @returns {Promise<Array.<Log>>}
     */
    nextLogs(limit?: number): Promise<Log[]>;
    /**
     * @typedef LogsAPI
     * @type {object}
     * @property {Array.<Log>} logs
     * @property {Array.<Link>} links
     */
    /**
     * Retrieves the next log entries since the last request.
     *
     * Retrieves the full response compliant to the API, including log entries and links.
     *
     * @async
     * @param {number} limit - The number of log entries to retrieve per request, as integer.
     * @returns {Promise<LogsAPI>}
     */
    next(limit?: number): Promise<{
        logs: Log[];
        links: Link[];
    }>;
}
