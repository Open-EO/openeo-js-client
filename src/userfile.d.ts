/// <reference types="node" />
export = UserFile;
declare const UserFile_base: typeof import("./baseentity");
/**
 * A File on the user workspace.
 *
 * @augments BaseEntity
 */
declare class UserFile extends UserFile_base {
    /**
     * Creates an object representing a file on the user workspace.
     *
     * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
     * @param {string} path - The path to the file, relative to the user workspace and without user ID.
     */
    constructor(connection: import("./connection"), path: string);
    /**
     * Path to the file, relative to the user's directory.
     * @readonly
     * @public
     * @type {string}
     */
    public readonly path: string;
    /**
     * File size in bytes as integer.
     * @readonly
     * @public
     * @type {number}
     */
    public readonly size: number;
    /**
     * Date and time the file has lastly been modified, formatted as a RFC 3339 date-time.
     * @readonly
     * @public
     * @type {string}
     */
    public readonly modified: string;
    /**
     * Downloads a file from the user workspace into memory.
     *
     * This method has different behaviour depending on the environment.
     * Returns a stream in a NodeJS environment or a Blob in a browser environment.
     *
     * @async
     * @returns {Promise<Stream.Readable|Blob>} - Return value depends on the target and environment, see method description for details.
     * @throws {Error}
     */
    retrieveFile(): Promise<import("stream").Readable | Blob>;
    /**
     * Downloads a file from the user workspace and saves it.
     *
     * This method has different behaviour depending on the environment.
     * In a NodeJS environment writes the downloaded file to the target location on the file system.
     * In a browser environment offers the file for downloading using the specified name (folders are not supported).
     *
     * @async
     * @param {string} target - The target, see method description for details.
     * @returns {Promise<string[]|void>} - Return value depends on the target and environment, see method description for details.
     * @throws {Error}
     */
    downloadFile(target: string): Promise<string[] | void>;
    /**
     * A callback that is executed on upload progress updates.
     *
     * @callback uploadStatusCallback
     * @param {number} percentCompleted - The percent (0-100) completed.
     * @param {UserFile} file - The file object corresponding to the callback.
     */
    /**
     * Uploads a file to the user workspace.
     * If a file with the name exists, overwrites it.
     *
     * This method has different behaviour depending on the environment.
     * In a nodeJS environment the source must be a path to a file as string.
     * In a browser environment the source must be an object from a file upload form.
     *
     * @async
     * @param {string|object} source - The source, see method description for details.
     * @param {?uploadStatusCallback} statusCallback - Optionally, a callback that is executed on upload progress updates.
     * @returns {Promise<UserFile>}
     * @throws {Error}
     */
    uploadFile(source: string | object, statusCallback?: (percentCompleted: number, file: UserFile) => any): Promise<UserFile>;
    /**
     * Deletes the file from the user workspace.
     *
     * @async
     * @throws {Error}
     */
    deleteFile(): Promise<void>;
}
