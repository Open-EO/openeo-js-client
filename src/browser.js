/**
 * Platform dependant utilities for the openEO JS Client.
 * 
 * Browser implementation
 * 
 * @class
 * @hideconstructor
 */
module.exports = class Environment {

	static checkOidcSupport() {
		if (typeof UserManager === 'undefined') {
			return false;
		}
		return true;
	}

	static handleErrorResponse(error) {
		return new Promise((_, reject) => {
			let fileReader = new FileReader();
			fileReader.onerror = event => {
				fileReader.abort();
				reject(event.target.error);
			};
			fileReader.onload = () => reject(JSON.parse(fileReader.result));
			fileReader.readAsText(error.response.data);
		});
	}

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

	static dataForUpload(source) {
		return source;
	}

	static async downloadResults(/*con, assets, targetFolder*/) {
		throw new Error("downloadResults is not supported in a browser environment.");
	}

	/**
	 * Offers data to download in the browser.
	 * 
	 * NOTE: Only supported in a browser environment.
	 * This method may fail with overly big data.
	 * 
	 * @static
	 * @param {*} data - Data to download.
	 * @param {string} filename - File name that is suggested to the user.
	 * @see https://github.com/kennethjiang/js-file-download/blob/master/file-download.js
	 */
	/* istanbul ignore next */
	static async saveToFile(data, filename) {
		return new Promise(resolve => {
			let blob = new Blob([data], {type: 'application/octet-stream'});
			let blobURL = window.URL.createObjectURL(blob);
			let tempLink = document.createElement('a');
			tempLink.style.display = 'none';
			tempLink.href = blobURL;
			tempLink.setAttribute('download', filename); 
			
			if (typeof tempLink.download === 'undefined') {
				tempLink.setAttribute('target', '_blank');
			}
			
			document.body.appendChild(tempLink);
			tempLink.click();
			document.body.removeChild(tempLink);
			window.URL.revokeObjectURL(blobURL);
			resolve();
		});
	}
};
