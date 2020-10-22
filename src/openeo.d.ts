export const AuthProvider: typeof import("./authprovider");
export const BasicProvider: typeof import("./basicprovider");
export const Capabilities: typeof import("./capabilities");
export const Connection: typeof import("./connection");
export const FileTypes: typeof import("./filetypes");
export const Job: typeof import("./job");
export const Logs: typeof import("./logs");
export const OidcProvider: typeof import("./oidcprovider");
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
    static connect(url: string): Promise<import("./connection")>;
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
    static connectDirect(versionedUrl: string): Promise<import("./connection")>;
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
export const Service: typeof import("./service");
export const UserFile: typeof import("./userfile");
export const UserProcess: typeof import("./userprocess");
export const Builder: typeof import("./builder/builder");
export const BuilderNode: typeof import("./builder/node");
export const Parameter: typeof import("./builder/parameter");
export const Formula: typeof import("./builder/formula");
