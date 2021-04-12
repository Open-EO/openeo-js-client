"use strict";

/**
 * A class that represents a process parameter. 
 * 
 * This is used for two things:
 * 1. You can create process parameters (placeholders) with `new Parameter()`.
 * 2. This is passed to functions for the parameters of the sub-process.
 * 
 * For the second case, you can access array elements referred to by the parameter
 * with a simplified notation: 
 * 
 * ```
 * function(data, context) {
 *     data['B1'] // Accesses the B1 element of the array by label
 *     data[1] // Accesses the second element of the array by index
 * }
 * ```
 * 
 * Those array calls create corresponding `array_element` nodes in the process. So it's
 * equivalent to
 * `this.array_element(data, undefined, 'B1')` or 
 * `this.array_element(data, 1)` respectively.
 * 
 * Simple access to numeric labels is not supported. You need to use `array_element` directly, e.g.
 * `this.array_element(data, undefined, 1)`.
 */
class Parameter {

	/**
	 * Creates a new parameter instance, but proxies calls to it
	 * so that array access is possible (see class description).
	 * 
	 * @static
	 * @param {Builder} builder 
	 * @param {string} parameterName 
	 * @returns {Proxy<Parameter>}
	 */
	static create(builder, parameterName) {
		let parameter = new Parameter(parameterName, null);
		if (typeof Proxy !== "undefined") {
			return new Proxy(parameter, {
				// @ts-ignore
				nodeCache: {},
				/**
				 * Getter for array access (see class description).
				 * 
				 * @ignore
				 * @param {object} target 
				 * @param {string|number|symbol} name 
				 * @param {?*} receiver 
				 * @returns {*}
				 */
				get(target, name, receiver) {
					if (!Reflect.has(target, name)) {
						// @ts-ignore
						if (!this.nodeCache[name]) {
							let args = {
								data: parameter
							};
							if (typeof name === 'string' && name.match(/^(0|[1-9]\d*)$/)) {
								args.index = parseInt(name, 10);
							}
							else {
								args.label = name;
							}
							// We assume array_element exists
							// @ts-ignore
							this.nodeCache[name] = builder.process("array_element", args);
						}
					
						// @ts-ignore
						return this.nodeCache[name];
					}
					return Reflect.get(target, name, receiver);
				},
				/**
				 * Setter for array access.
				 * 
				 * Usually fails as write access to arrays is not supported.
				 * 
				 * @ignore
				 * @param {object} target 
				 * @param {string|number|symbol} name 
				 * @param {*} value 
				 * @param {?*} receiver 
				 * @returns {boolean}
				 */
				set(target, name, value, receiver) {
					if (!Reflect.has(target, name)) {
						console.warn('Simplified array access is read-only');
					}
					return Reflect.set(target, name, value, receiver);
				}
			});
		}
		else {
			console.warn('Simplified array access not supported, use array_element directly');
			return parameter;
		}
	}
	
	/**
	 * Creates a new process parameter.
	 * 
	 * @param {string} name - Name of the parameter.
	 * @param {object.<string, *>|string} schema - The schema for the parameter. Can be either an object compliant to JSON Schema or a string with a JSON Schema compliant data type, e.g. `string`.
	 * @param {string} description - A description for the parameter
	 * @param {*} defaultValue - An optional default Value for the parameter. If set, make the parameter optional. If not set, the parameter is required. Defaults to `undefined`.
	 */
	constructor(name, schema = {}, description = "", defaultValue = undefined) {
		this.name = name;
		this.spec = {
			name: name,
			schema: typeof schema === 'string' ? { type: schema } : schema,
			description: description,
		};
		// No support for experimental and deprecated yet
		if (typeof defaultValue !== 'undefined') {
			this.spec.optional = true;
			this.spec.default = defaultValue;
		}
	}

	/**
	 * Returns a JSON serializable representation of the data that is API compliant.
	 * 
	 * @returns {object.<string, *>}
	 */
	toJSON() {
		return this.spec;
	}

	/**
	 * Returns the reference object for this parameter.
	 * 
	 * @returns {FromParameter}
	 */
	ref() {
		return { from_parameter: this.name };
	}

}

module.exports = Parameter;
