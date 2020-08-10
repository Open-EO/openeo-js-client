const Utils = require("@openeo/js-commons/src/utils");
const Parameter = require("./parameter");

/**
 * A class that represents a process node and also a result from a process.
 * 
 * @class
 */
class BuilderNode {

	constructor(parent, processId, args = {}, description = null) {
		this.parent = parent;
		this.spec = this.parent.spec(processId);
		if (!Utils.isObject(this.spec)) {
			throw new Error("Process doesn't exist: " + processId);
		}

		this.id = parent.generateId(processId);
		this.arguments = Array.isArray(args) ? this.namedArguments(args) : args;
		this._description = description;
		this.result = false;

		this.addParametersToProcess(this.arguments);
	}

	namedArguments(args) {
		if (Object.keys(args).length > (this.spec.parameters || []).length) {
			throw new Error("More arguments specified than parameters available.");
		}
		let obj = {};
		if (Array.isArray(this.spec.parameters)) {
			for(let i = 0; i < this.spec.parameters.length; i++) {
				obj[this.spec.parameters[i].name] = args[i];
			}
		}
		return obj;
	}

	// Checks the arguments given for parameters and add them to the process
	addParametersToProcess(args) {
		for(let key in args) {
			let arg = args[key];
			if (arg instanceof Parameter) {
				if (Utils.isObject(arg.spec.schema)) {
					this.parent.addParameter(arg.spec);
				}
			}
			else if (arg instanceof BuilderNode) {
				this.addParametersToProcess(arg.arguments);
			}
			else if (Array.isArray(arg) || Utils.isObject(arg)) {
				this.addParametersToProcess(arg);
			}
		}
	}

	/**
	 * Gets/Sets a description for the node.
	 * 
	 * Can be used in a variety of ways:
	 * 
	 * By default, this is a function: 
	 * `node.description()` - Returns the description.
	 * `node.description("foo")` - Sets the description to "foo". Returns the node itself for method chaining.
	 * 
	 * You can also "replace" the function, then it acts as normal property and the function is not available any longer:
	 * `node.description = "foo"` - Sets the description to "foo".
	 * Afterwards you can call `node.description` as normal object property.
	 * 
	 * @param {string|undefined} description - Optional: If given, set the value.
	 * @returns {string|BuilderNode}
	 */
	description(description) {
		if (typeof description === 'undefined') {
			return this._description;
		}
		else {
			this._description = description;
			return this;
		}
	}

	getCallbackParameter(builder, name) {
		let params = [];
		if (!Array.isArray(this.spec.parameters)) {
			return params;
		}
		let param = this.spec.parameters.find(p => p.name === name);
		if (!param || !param.schema) {
			return params;
		}

		let schema = param.schema;
		if (Utils.isObject(schema)) {
			schema = [schema];
		}
		if (!Array.isArray(schema)) {
			return params;
		}

		schema = schema.find(s => Array.isArray(s.parameters));
		if (!schema) {
			return params;
		}
		return schema.parameters.map(param => Parameter.create(builder, param.name));
	}

	exportArgument(arg, name) {
		if (Utils.isObject(arg)) {
			if (arg instanceof BuilderNode) {
				return {
					from_node: arg.id
				};
			}
			else if (arg instanceof Parameter) {
				return {
					from_parameter: arg.name
				};
			}
			else if (typeof arg.toJSON === 'function') {
				return arg.toJSON();
			}
			else {
				let obj = {};
				for(let key in arg) {
					if (typeof arg[key] !== 'undefined') {
						obj[key] = this.exportArgument(arg[key], name);
					}
				}
				return obj;
			}
		}
		else if (Array.isArray(arg)) {
			return arg.map(element => this.exportArgument(element), name);
		}
		// export child process graph
		else if (typeof arg === 'function') {
			return this.exportCallback(arg, name);
		}
		else {
			return arg;
		}
	}

	exportCallback(arg, name) {
		const Builder = require('./builder');
		let builder = new Builder(this.parent.processes, this.parent);
		let params = this.getCallbackParameter(builder, name);
		// Bind builder to this, so that this.xxx can be used for processes
		let node = arg.bind(builder)(...params);
		if (node instanceof BuilderNode) {
			node.result = true;
			return builder.toJSON();
		}
		else {
			throw new Error("Callback must return BuilderNode");
		}
	}

	toJSON() {
		let obj = {
			process_id: this.spec.id,
			arguments: {}
		};
		for(let name in this.arguments) {
			if (typeof this.arguments[name] !== 'undefined') {
				obj.arguments[name] = this.exportArgument(this.arguments[name], name);
			}
		}
		if (typeof this.description !== 'function') {
			obj.description = this.description;
		}
		else if (typeof this._description === 'string') {
			obj.description = this._description;
		}
		if (this.result) {
			obj.result = true;
		}
		return obj;
	}

}

module.exports = BuilderNode;
