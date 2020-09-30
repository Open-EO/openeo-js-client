const fs = require('fs');
const url = require("url");
const path = require("path");
const Stream = require('stream');
const Connection = require('./connection'); // jshint ignore:line

/**
 * Platform dependant utilities for the openEO JS Client.
 * 
 * Node.js implementation, don't use in other environments.
 * 
 * @class
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

	static handleErrorResponse(error) {
		return new Promise((_, reject) => {
			let chunks = [];
			error.response.data.on("data", chunk => chunks.push(chunk));
			error.response.data.on("error", error => reject(error));
			error.response.data.on("end", () => reject(JSON.parse(Buffer.concat(chunks).toString())));
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

	static fileNameForUpload(source) {
		return path.basename(source);
	}

	static dataForUpload(source) {
		return fs.createReadStream(source);
	}

	/**
	 * Downloads files to local storage and returns a list of file paths.
	 * 
	 * @static
	 * @param {Connection} con 
	 * @param {object[]} assets 
	 * @param {string} targetFolder 
	 * @returns {Promise<string[]>}
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
	 * @returns {Promise}
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

module.exports = Environment;
