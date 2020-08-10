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
 * @class
 */
class Parameter {

	static create(builder, parameterName) {
		let parameter = new Parameter(parameterName, null);
		if (typeof Proxy !== "undefined") {
			return new Proxy(parameter, {
				nodeCache: {},
				get(target, name, receiver) {
					if (!Reflect.has(target, name)) {
						// Check whether array element for this label/index exists
						if (this.nodeCache[name]) {
							return this.nodeCache[name];
						}
					
						let args = {
							data: parameter
						};
						if (name.match(/^(0|[1-9]\d*)$/)) {
							args.index = parseInt(name, 10);
						}
						else {
							args.label = name;
						}
						return builder.process("array_element", args);
					}
					return Reflect.get(target, name, receiver);
				},
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
	 * @param {object|string} schema - The schema for the parameter. Can be either an object compliant to JSON Schema or a string with a JSON Schema compliant data type, e.g. `string`.
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

	toJSON() {
		return this.spec;
	}

}

module.exports = Parameter;
