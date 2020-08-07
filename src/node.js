const fs = require('fs');
const url = require("url");
const path = require("path");

/**
 * Platform dependant utilities for the openEO JS Client.
 * 
 * Node implementation
 * 
 * @class
 * @hideconstructor
 */
module.exports = class Environment {

	static handleErrorResponse(error) {
		return new Promise((_, reject) => {
			let chunks = [];
			error.response.data.on("data", chunk => chunks.push(chunk));
			error.response.data.on("error", error => reject(error));
			error.response.data.on("end", () => reject(JSON.parse(Buffer.concat(chunks).toString())));
		});
	}

	static getResponseType() {
		return 'stream';
	}

	/**
	 * Encodes a string into Base64 encoding.
	 * 
	 * @static
	 * @param {string} str - String to encode.
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

	static async downloadResults(con, assets, targetFolder) {
		let files = [];
		const promises = assets.map(async (link) => {
			let parsedUrl = url.parse(link.href);
			let targetPath = path.join(targetFolder, path.basename(parsedUrl.pathname));
			let response = await con.download(link.href, false);
			await Environment.saveToFile(response.data, targetPath);
			files.push(targetPath);
		});

		await Promise.all(promises);
		return files;
	}

	/**
	 * Streams data into a file.
	 * 
	 * NOTE: Only supported in a NodeJS environment.
	 *
	 * @static
	 * @async
	 * @param {Stream} data - Data stream to read from.
	 * @param {string} filename - File path to store the data at.
	 * @throws {Error}
	 */
	static async saveToFile(data, filename) {
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
};
