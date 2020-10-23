import {Connection} from "./connection";

/**
 * Platform dependant utilities for the openEO JS Client.
 *
 * Browser implementation, don't use in other environments.
 *
 * @hideconstructor
 */
export declare class Environment {
    /**
     * Returns the name of the Environment, here `Browser`.
     *
     * @returns {string}
     * @static
     */
    static getName(): string;
    /**
     * Handles errors from the API that are returned as Blobs.
     *
     * @ignore
     * @static
     * @param {Blob} error
     * @returns {Promise<void>}
     */
    static handleErrorResponse(error: Blob): Promise<void>;
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
     * @param {string} str - String to encode.
     * @returns {string} String encoded in Base64.
     */
    static base64encode(str: string): string;
    /**
     * Detect the file name for the given data source.
     *
     * @ignore
     * @static
     * @param {*} source - An object from a file upload form.
     * @returns {string}
     */
    static fileNameForUpload(source: any): string;
    /**
     * Get the data from the source that should be uploaded.
     *
     * @ignore
     * @static
     * @param {*} source - An object from a file upload form.
     * @returns {*}
     */
    static dataForUpload(source: any): any;
    /**
     * Downloads files to local storage and returns a list of file paths.
     *
     * Not supported in Browsers and only throws an Error!
     *
     * @static
     * @param {Connection} con
     * @param {Array.<object.<string, *>>} assets
     * @param {string} targetFolder
     * @throws {Error}
     */
    static downloadResults(con: Connection, assets: Array<any>, targetFolder: string): Promise<void>;
    /**
     * Offers data to download in the browser.
     *
     * This method may fail with overly big data.
     *
     * @async
     * @static
     * @param {*} data - Data to download.
     * @param {string} filename - File name that is suggested to the user.
     * @returns {Promise<void>}
     * @see https://github.com/kennethjiang/js-file-download/blob/master/file-download.js
     */
    static saveToFile(data: any, filename: string): Promise<void>;
}
