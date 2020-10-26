const Environment = require('./env');
const BaseEntity = require('./baseentity');

/**
 * A File on the user workspace.
 * 
 * @augments BaseEntity
 */
class UserFile extends BaseEntity {

	/**
	 * Creates an object representing a file on the user workspace.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {string} path - The path to the file, relative to the user workspace and without user ID.
	 */
	constructor(connection, path) {
		super(connection, ["path", "size", "modified"]);
		/**
		 * Path to the file, relative to the user's directory.
		 * @readonly
		 * @public
		 * @type {string}
		 */
		this.path = path;
		/** 
		 * File size in bytes as integer.
		 * @readonly
		 * @public
		 * @type {number}
		 */
		this.size = undefined;
		/**
		 * Date and time the file has lastly been modified, formatted as a RFC 3339 date-time.
		 * @readonly
		 * @public
		 * @type {string}
		 */
		this.modified = undefined;
	}

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
	async retrieveFile() {
		return await this.connection.download('/files/' + this.path, true);
	}

	/**
	 * Downloads a file from the user workspace and saves it.
	 * 
	 * This method has different behaviour depending on the environment.
	 * In a NodeJS environment writes the downloaded file to the target location on the file system.
	 * In a browser environment offers the file for downloading using the specified name (folders are not supported).
	 * 
	 * @async
	 * @param {string} target - The target, see method description for details.
	 * @returns {Promise<Array.<string>|void>} - Return value depends on the target and environment, see method description for details.
	 * @throws {Error}
	 */
	async downloadFile(target) {
		let data = await this.connection.download('/files/' + this.path, true);
		// @ts-ignore
		return await Environment.saveToFile(data, target);
	}

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
	 * @param {*} source - The source, see method description for details.
	 * @param {?uploadStatusCallback} statusCallback - Optionally, a callback that is executed on upload progress updates.
	 * @returns {Promise<UserFile>}
	 * @throws {Error}
	 */
	async uploadFile(source, statusCallback = null) {
		let options = {
			method: 'put',
			url: '/files/' + this.path,
			data: Environment.dataForUpload(source),
			headers: {
				'Content-Type': 'application/octet-stream'
			}
		};
		if (typeof statusCallback === 'function') {
			options.onUploadProgress = (progressEvent) => {
				let percentCompleted = Math.round( (progressEvent.loaded * 100) / progressEvent.total );
				statusCallback(percentCompleted, this);
			};
		}

		let response = await this.connection._send(options);
		return this.setAll(response.data);
	}

	/**
	 * Deletes the file from the user workspace.
	 * 
	 * @async
	 * @throws {Error}
	 */
	async deleteFile() {
		await this.connection._delete('/files/' + this.path);
	}
}

module.exports = UserFile;
