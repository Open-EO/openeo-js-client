const Utils = require('@openeo/js-commons/src/utils');

/**
 * Manages the files types supported by the back-end.
 */
class FileTypes {

	/**
	 * @typedef FileTypesAPI
	 * @type {object}
	 * @property {object.<string, FileType>} input - File types supported to import
	 * @property {object.<string, FileType>} output - File types supported to export
	 */

	/**
	 * @typedef FileType
	 * @type {object}
	 * @property {string} title
	 * @property {string} description
	 * @property {Array.<string>} gis_data_types
	 * @property {object.<string, *>} parameters
	 * @property {Array.<Link>} links
	 */

	/**
	 * Creates a new FileTypes object from an API-compatible JSON response.
	 * 
	 * @param {FileTypesAPI} data - A capabilities response compatible to the API specification for `GET /file_formats`.
	 */
	constructor(data) {
		/**
		 * @type {FileTypesAPI}
		 */
		this.data = {
			input: {},
			output: {}
		};
		if(!Utils.isObject(data)) {
			return;
		}
		for(let io of ['input', 'output']) {
			for(let type in data[io]) {
				if(!Utils.isObject(data[io])) {
					continue;
				}
				this.data[io][type.toUpperCase()] = data[io][type];
			}
		}
	}

	/**
	 * Returns the file types response as a JSON serializable representation of the data that is API compliant.
	 * 
	 * @returns {FileTypesAPI}
	 */
	toJSON() {
		return this.data;
	}

	/**
	 * Returns the input file formats.
	 * 
	 * @returns {object.<string, FileType>}
	 */
	getInputTypes() {
		return this.data.input;
	}

	/**
	 * Returns the output file formats.
	 * 
	 * @returns {object.<string, FileType>}
	 */
	getOutputTypes() {
		return this.data.output;
	}

	/**
	 * Returns a single input file format for a given identifier.
	 * 
	 * Returns null if no input file format was found for the given identifier.
	 * 
	 * @param {string} type - Case-insensitive file format identifier
	 * @returns {?FileType}
	 */
	getInputType(type) {
		return this._findType(type, 'input');
	}

	/**
	 * Returns a single output file format for a given identifier.
	 * 
	 * Returns null if no output file format was found for the given identifier.
	 * 
	 * @param {string} type - Case-insensitive file format identifier
	 * @returns {?FileType}
	 */
	getOutputType(type) {
		return this._findType(type, 'output');
	}

	/**
	 * Get a file type object from the list of input or output file formats.
	 * 
	 * @param {string} type - Identifier of the file type
	 * @param {string} io - Either `input` or `output`
	 * @returns {?FileType}
	 * @protected
	 */
	_findType(type, io) {
		type = type.toUpperCase();
		if (type in this.data[io]) {
			return this.data[io][type];
		}
		return null;
	}

}

module.exports = FileTypes;
