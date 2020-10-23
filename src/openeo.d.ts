import {Connection} from "./connection";

/**
 * Main class to start with openEO. Allows to connect to a server.
 *
 * @hideconstructor
 */
export class OpenEO {
    /**
     * Connect to a back-end with version discovery (recommended).
     *
     * Includes version discovery (request to `GET /well-known/openeo`) and connects to the most suitable version compatible to this JS client version.
     * Requests the capabilities and authenticates where required.
     *
     * @async
     * @param {string} url - The server URL to connect to.
     * @returns {Promise<Connection>}
     * @throws {Error}
     * @static
     */
    static connect(url: string): Promise<Connection>;
    /**
     * Connects directly to a back-end instance, without version discovery (NOT recommended).
     *
     * Doesn't do version discovery, therefore a URL of a versioned API must be specified. Requests the capabilities and authenticates where required.
     *
     * @async
     * @param {string} versionedUrl - The server URL to connect to.
     * @returns {Promise<Connection>}
     * @throws {Error}
     * @static
     */
    static connectDirect(versionedUrl: string): Promise<Connection>;
    /**
     * Returns the version number of the client.
     *
     * Not to confuse with the API version(s) supported by the client.
     *
     * @returns {string} Version number (according to SemVer).
     */
    static clientVersion(): string;
}

export namespace OpenEO {
    const Environment: typeof import("./node") | typeof import("./browser");
}
