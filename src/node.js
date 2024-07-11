const fs = require('fs');
const url = require("url");
const path = require("path");
const Stream = require('stream');
const axios = require('axios/dist/node/axios.cjs');

/**
 * Platform dependant utilities for the openEO JS Client.
 * 
 * Node.js implementation, don't use in other environments.
 * 
 * @hideconstructor
 */
class Environment {

	/**
	 * Returns the name of the Environment, here `Node`.
	 * 
	 * @returns {string}
	 * @static
	 */
	static getName() {
		return 'Node';
	}

	/**
	 * Returns the axios client.
	 * 
	 * @returns {axios}
	 * @static
	 */
	static axios() {
		return axios;
	}

	/**
	 * Returns the URL of the server instance.
	 * 
	 * @returns {string}
	 * @static
	 */
	static getUrl() {
		return Environment.url;
	}

	/**
	 * Sets the URL of the server instance.
	 * 
	 * @param {string} uri
	 * @static
	 */
	static setUrl(uri) {
		Environment.url = uri;
	}

	/**
	 * Handles errors from the API that are returned as Streams.
	 * 
	 * @ignore
	 * @static
	 * @param {Stream.Readable} error 
	 * @returns {Promise<void>}
	 */
	static handleErrorResponse(error) {
		return new Promise((resolve, reject) => {
			let chunks = [];
			error.response.data.on("data", chunk => chunks.push(chunk));
			error.response.data.on("error", streamError => reject(streamError));
			error.response.data.on("end", () => resolve(JSON.parse(Buffer.concat(chunks).toString())));
		});
	}

	/**
	 * Returns how binary responses from the servers are returned (`stream` or `blob`).
	 * 
	 * @returns {string}
	 * @static
	 */
	static getResponseType() {
		return 'stream';
	}

	/**
	 * Encodes a string into Base64 encoding.
	 * 
	 * @static
	 * @param {string|Buffer} str - String to encode.
	 * @returns {string} String encoded in Base64.
	 */
	static base64encode(str) {
		let buffer;
		if (str instanceof Buffer) {
			buffer = str;
		} else {
			buffer = Buffer.from(str.toString(), 'binary');
		}
		return buffer.toString('base64');
	}

	/**
	 * Detect the file name for the given data source.
	 * 
	 * @ignore
	 * @static
	 * @param {string} source - A path to a file as string.
	 * @returns {string}
	 */
	static fileNameForUpload(source) {
		return path.basename(source);
	}

	/**
	 * Get the data from the source that should be uploaded.
	 * 
	 * @ignore
	 * @static
	 * @param {string} source - A path to a file as string.
	 * @returns {Stream.Readable}
	 */
	static dataForUpload(source) {
		return fs.createReadStream(source);
	}

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
	static async downloadResults(con, assets, targetFolder) {
		let files = [];
		const promises = assets.map(async (link) => {
			let parsedUrl = url.parse(link.href);
			let targetPath = path.join(targetFolder, path.basename(parsedUrl.pathname));
			let data = await con.download(link.href, false);
			if (data instanceof Stream.Readable) {
				await Environment.saveToFile(data, targetPath);
				files.push(targetPath);
			}
			else {
				throw new Error("Data retrieved is not a Stream");
			}
		});

		await Promise.all(promises);
		return files;
	}

	/**
	 * Streams data into a file.
	 *
	 * @static
	 * @async
	 * @param {Stream.Readable} data - Data stream to read from.
	 * @param {string} filename - File path to store the data at.
	 * @returns {Promise<void>}
	 * @throws {Error}
	 */
	static saveToFile(data, filename) {
		return new Promise((resolve, reject) => {
			let writeStream = fs.createWriteStream(filename);
			writeStream.on('close', (err) => {
				if (err) {
					return reject(err);
				}
				resolve();
			});
			data.pipe(writeStream);
		});
	}
}

Environment.url = '';

module.exports = Environment;
