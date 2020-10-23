import {Connection} from "./connection";
import {Readable} from "stream";

/**
 * Platform dependant utilities for the openEO JS Client.
 *
 * Node.js implementation, don't use in other environments.
 *
 * @hideconstructor
 */
export declare class Environment {
    /**
     * Returns the name of the Environment, here `Node`.
     *
     * @returns {string}
     * @static
     */
    static getName(): string;
    /**
     * Handles errors from the API that are returned as Streams.
     *
     * @ignore
     * @static
     * @param {Readable} error
     * @returns {Promise<void>}
     */
    static handleErrorResponse(error: Readable): Promise<void>;
    /**
     * Returns how binary responses from the servers are returned (`stream` or `blob`).
     *
     * @returns {string}
     * @static
     */
    static getResponseType(): string;
    /**
     * Encodes a string into Base64 encoding.
     *
     * @static
     * @param {string|Buffer} str - String to encode.
     * @returns {string} String encoded in Base64.
     */
    static base64encode(str: string | Buffer): string;
    /**
     * Detect the file name for the given data source.
     *
     * @ignore
     * @static
     * @param {string} source - A path to a file as string.
     * @returns {string}
     */
    static fileNameForUpload(source: string): string;
    /**
     * Get the data from the source that should be uploaded.
     *
     * @ignore
     * @static
     * @param {string} source - A path to a file as string.
     * @returns {Readable}
     */
    static dataForUpload(source: string): Readable;
    /**
     * Downloads files to local storage and returns a list of file paths.
     *
     * @static
     * @param {Connection} con
     * @param {Array.<object.<string, *>>} assets
     * @param {string} targetFolder
     * @returns {Promise<Array.<string>>}
     * @throws {Error}
     */
    static downloadResults(con: Connection, assets: Array<any>, targetFolder: string): Promise<Array<string>>;
    /**
     * Streams data into a file.
     *
     * @static
     * @async
     * @param {Readable} data - Data stream to read from.
     * @param {string} filename - File path to store the data at.
     * @returns {Promise<void>}
     * @throws {Error}
     */
    static saveToFile(data: Readable, filename: string): Promise<void>;
}
