const Utils = require("@openeo/js-commons/src/utils");
const Parameter = require("./parameter");

/**
 * A class that represents a process node and also a result from a process.
 */
class BuilderNode {

	/**
	 * Creates a new process node for the builder.
	 * 
	 * @param {Builder} parent
	 * @param {string} processId 
	 * @param {object.<string, *>} [processArgs={}]
	 * @param {?string} [processDescription=null]
	 */
	constructor(parent, processId, processArgs = {}, processDescription = null) {
		/**
		 * The parent builder.
		 * @type {Builder}
		 */
		this.parent = parent;

		/**
		 * The specification of the process associated with this node.
		 * @type {Process}
		 * @readonly
		 */
		this.spec = this.parent.spec(processId);
		if (!Utils.isObject(this.spec)) {
			throw new Error("Process doesn't exist: " + processId);
		}

		/**
		 * The unique identifier for the node (not the process ID!).
		 * @type {string}
		 */
		this.id = parent.generateId(processId);
		/**
		 * The arguments for the process.
		 * @type {object.<string, *>}
		 */
		this.arguments = Array.isArray(processArgs) ? this.namedArguments(processArgs) : processArgs;
		/**
		 * @ignore
		 */
		this._description = processDescription;
		/**
		 * Is this the result node?
		 * @type {boolean}
		 */
		this.result = false;

		this.addParametersToProcess(this.arguments);
	}

	/**
	 * Converts a sorted array of arguments to an object with the respective parameter names.
	 * 
	 * @param {Array} processArgs 
	 * @returns {object.<string, *>}
	 * @throws {Error}
	 */
	namedArguments(processArgs) {
		if (processArgs.length > (this.spec.parameters || []).length) {
			throw new Error("More arguments specified than parameters available.");
		}
		let obj = {};
		if (Array.isArray(this.spec.parameters)) {
			for(let i = 0; i < this.spec.parameters.length; i++) {
				obj[this.spec.parameters[i].name] = processArgs[i];
			}
		}
		return obj;
	}

	/**
	 * Checks the arguments given for parameters and add them to the process.
	 * 
	 * @param {object.<string, *>|Array} processArgs 
	 */
	addParametersToProcess(processArgs) {
		for(let key in processArgs) {
			let arg = processArgs[key];
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
	 * You can also "replace" the function (not supported in TypeScript!),
	 * then it acts as normal property and the function is not available any longer:
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

	/**
	 * Converts the given argument into something serializable...
	 * 
	 * @protected
	 * @param {*} arg - Argument
	 * @param {string} name - Parameter name
	 * @returns {*}
	 */
	exportArgument(arg, name) {
		const Formula = require('./formula');
		if (Utils.isObject(arg)) {
			if (arg instanceof BuilderNode || arg instanceof Parameter) {
				return arg.ref();
			}
			else if (arg instanceof Formula) {
				let builder = this.createBuilder(this, name);
				arg.setBuilder(builder);
				arg.generate();
				return builder.toJSON();
			}
			else if (arg instanceof Date) {
				return arg.toISOString();
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

	/**
	 * Creates a new Builder, usually for a callback.
	 * 
	 * @protected
	 * @param {?BuilderNode} [parentNode=null]
	 * @param {?string} parentParameter
	 * @returns {BuilderNode}
	 */
	createBuilder(parentNode = null, parentParameter = null) {
		const Builder = require('./builder');
		let builder = new Builder(this.parent.processes, this.parent);
		if (parentNode !== null && parentParameter !== null) {
			builder.setParent(parentNode, parentParameter);
		}
		return builder;
	}

	/**
	 * Returns the serializable process for the callback function given.
	 * 
	 * @protected
	 * @param {Function} arg - callback function
	 * @param {string} name - Parameter name
	 * @returns {object.<string, *>}
	 * @throws {Error}
	 */
	exportCallback(arg, name) {
		let builder = this.createBuilder(this, name);
		let params = builder.getParentCallbackParameters();
		// Bind builder to this, so that this.xxx can be used for processes
		// Also pass builder as last parameter so that we can grab it in arrow functions
		let node = arg.bind(builder)(...params, builder);
		if (node instanceof BuilderNode) {
			node.result = true;
			return builder.toJSON();
		}
		else {
			throw new Error("Callback must return BuilderNode");
		}
	}

	/**
	 * Returns a JSON serializable representation of the data that is API compliant.
	 * 
	 * @returns {object.<string, *>}
	 */
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

	/**
	 * Returns the reference object for this node.
	 * 
	 * @returns {FromNode}
	 */
	ref() {
		return { from_node: this.id };
	}

}

module.exports = BuilderNode;
