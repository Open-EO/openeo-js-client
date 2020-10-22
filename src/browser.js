const Connection = require('./connection'); // eslint-disable-line no-unused-vars

/**
 * Platform dependant utilities for the openEO JS Client.
 * 
 * Browser implementation, don't use in other environments.
 * 
 * @hideconstructor
 */
class Environment {

	/**
	 * Returns the name of the Environment, here `Browser`.
	 * 
	 * @returns {string}
	 * @static
	 */
	static getName() {
		return 'Browser';
	}

	/**
	 * Handles errors from the API that are returned as Blobs.
	 * 
	 * @ignore
	 * @static
	 * @param {Blob} error 
	 * @returns {Promise<void>}
	 */
	static handleErrorResponse(error) {
		return new Promise((_, reject) => {
			let fileReader = new FileReader();
			fileReader.onerror = event => {
				fileReader.abort();
				reject(event.target.error);
			};
			fileReader.onload = () => {
				// ArrayBuffer to String conversion is from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
				let res = fileReader.result instanceof ArrayBuffer ? String.fromCharCode.apply(null, new Uint16Array(fileReader.result)) : fileReader.result;
				let obj = typeof res === 'string' ? JSON.parse(res) : res;
				reject(obj);
			};
			fileReader.readAsText(error.response.data);
		});
	}

	/**
	 * Returns how binary responses from the servers are returned (`stream` or `blob`).
	 * 
	 * @returns {string}
	 * @static
	 */
	static getResponseType() {
		return 'blob';
	}

	/**
	 * Encodes a string into Base64 encoding.
	 * 
	 * @static
	 * @param {string} str - String to encode.
	 * @returns {string} String encoded in Base64.
	 */
	static base64encode(str) {
		// btoa is JS's ugly name for encodeBase64
		return btoa(str);
	}

	/**
	 * Detect the file name for the given data source.
	 * 
	 * @ignore
	 * @static
	 * @param {*} source - An object from a file upload form.
	 * @returns {string}
	 */
	static fileNameForUpload(source) {
		return source.name.split(/(\\|\/)/g).pop();
	}

	/**
	 * Get the data from the source that should be uploaded.
	 * 
	 * @ignore
	 * @static
	 * @param {*} source - An object from a file upload form.
	 * @returns {*}
	 */
	static dataForUpload(source) {
		return source;
	}

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
	static async downloadResults(con, assets, targetFolder) { // eslint-disable-line no-unused-vars
		throw new Error("downloadResults is not supported in a browser environment.");
	}

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
	static saveToFile(data, filename) {
		/* istanbul ignore next */
		return new Promise((resolve, reject) => {
			try {
				if (!(data instanceof Blob)) {
					data = new Blob([data], {type: 'application/octet-stream'});
				}
				let blobURL = window.URL.createObjectURL(data);
				let tempLink = document.createElement('a');
				tempLink.style.display = 'none';
				tempLink.href = blobURL;
				tempLink.setAttribute('download', filename || 'download');
				if (typeof tempLink.download === 'undefined') {
					tempLink.setAttribute('target', '_blank');
				}
				document.body.appendChild(tempLink);
				tempLink.click();
				document.body.removeChild(tempLink);
				window.URL.revokeObjectURL(blobURL);
				resolve();
			} catch (error) {
				console.error(error);
				reject(error);
			}
		});
	}
}

module.exports = Environment;
