const Utils = require('@openeo/js-commons/src/utils');

module.exports = class FileTypes {

	constructor(data) {
		this.data = {
			input: {},
			output: {}
		};
		if  (!Utils.isObject(data)) {
			return;
		}
		for(let io of ['input', 'output']) {
			for(let type in data[io]) {
				if  (!Utils.isObject(data[io])) {
					continue;
				}
				this.data[io][type.toUpperCase()] = data[io][type];
			}
		}
	}

	/**
	 * Returns the capabilities response as a plain object.
	 * 
	 * @returns {object} - A reference to the capabilities response.
	 */
	toJSON() {
		return this.data;
	}

	getInputTypes() {
		return this.data.input;
	}

	getOutputTypes() {
		return this.data.output;
	}

	getInputType(type) {
		return this._findType(type, 'input');
	}

	getOutputType(type) {
		return this._findType(type, 'output');
	}

	_findType(type, io) {
		type = type.toUpperCase();
		if (type in this.data[io]) {
			return this.data[io][type];
		}
		return null;
	}

};
