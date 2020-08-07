"use strict";

module.exports = class Parameter {

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

};