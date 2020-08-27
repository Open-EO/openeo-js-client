const Environment = require('./env');
const BaseEntity = require('./baseentity');

/**
 * A File on the user workspace.
 * 
 * @class
 * @extends BaseEntity
 */
class File extends BaseEntity {

	/**
	 * Creates an object representing a file on the user workspace.
	 * 
	 * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
	 * @param {string} path - The path to the file, relative to the user workspace and without user ID.
	 * @constructor
	 */
	constructor(connection, path) {
		super(connection, ["path", "size", "modified"]);
		this.path = path;
	}

	/**
	 * Downloads a file from the user workspace.
	 * 
	 * This method has different behaviour depending on the environment.
	 * If the target is set to `null`, returns a stream in a NodeJS environment or a Blob in a browser environment.
	 * If a target is specified, writes the downloaded file to the target location on the file system in a NodeJS environment.
	 * In a browser environment offers the file for downloading using the specified name (folders are not supported).
	 * 
	 * @async
	 * @param {string|null} target - The target, see method description for details.
	 * @returns {Stream|Blob|void} - Return value depends on the target and environment, see method description for details.
	 * @throws {Error}
	 */
	async downloadFile(target = null) {
		let response = await this.connection.download('/files/' + this.path, true);
		if (target === null) {
			return response.data;
		}
		else {
			return await Environment.saveToFile(response.data, target);
		}
	}

	/**
	 * A callback that is executed on upload progress updates.
	 * 
	 * @callback uploadStatusCallback
	 * @param {number} percentCompleted - The percent (0-100) completed.
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
	 * @param {uploadStatusCallback|null} statusCallback - Optionally, a callback that is executed on upload progress updates.
	 * @returns {File}
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

module.exports = File;
