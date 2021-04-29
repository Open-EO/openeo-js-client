const BuilderNode = require('./node');
const Parameter = require('./parameter');
const axios = require('axios').default;
const Utils = require('@openeo/js-commons/src/utils');
const ProcessUtils = require("@openeo/js-commons/src/processUtils");

const PROCESS_META = [
	"id", "summary", "description", "categories", "parameters", "returns",
	"deprecated", "experimental", "exceptions", "examples", "links"
];

/**
 * A class to construct processes easily.
 * 
 * An example (`con` is a object of type `Connection`):
 * 
 * ```
 * var builder = await con.buildProcess();
 * 
 * var datacube = builder.load_collection(
 *   new Parameter("collection-id", "string", "The ID of the collection to load"), // collection-id is then a process parameter that can be specified by users.
 *   { "west": 16.1, "east": 16.6, "north": 48.6, "south": 47.2 },
 *   ["2018-01-01", "2018-02-01"],
 *   ["B02", "B04", "B08"]
 * );
 * 
 * // Alternative 1 - using the Formula class
 * var eviAlgorithm = new Formula('2.5 * (($B08 - $B04) / (1 + $B08 + 6 * $B04 + -7.5 * $B02))');
 * // Alternative 2 - "by hand"
 * var eviAlgorithm = function(data) {
 *   var nir = data["B08"]; // Array access by label, accessing label "B08" here
 *   var red = data["B04"];
 *   var blue = data["B02"];
 *   return this.multiply(
 *     2.5,
 *     this.divide(
 *       this.subtract(nir, red),
 *       this.sum([
 *         1,
 *         nir,
 *         this.multiply(6, red),
 *         this.multiply(-7.5, blue)
 *       ])
 *     )
 *   );
 * };
 * datacube = builder.reduce_dimension(datacube, eviAlgorithm, "bands")
 *                   .description("Compute the EVI. Formula: 2.5 * (NIR - RED) / (1 + NIR + 6*RED + -7.5*BLUE)");
 *                   
 * var min = function(data) { return this.min(data); };
 * datacube = builder.reduce_dimension(datacube, min, "t");
 * 
 * datacube = builder.save_result(datacube, "PNG");
 * 
 * var storedProcess = await con.setUserProcess("evi", datacube);
 * ```
 * 
 * As you can see above, the builder in callback functions is available as `this`.
 * Arrow functions do not support rebinding this and therefore the builder is passed as the last argument.
 * 
 * So a normal function can be defined as follows:
 * ```
 * let callback = function(data) {
 *   return this.mean(data);
 * }
 * ```
 * 
 * An arrow function on the other hand has to use the builder that is passed as the last parameter:
 * ```
 * let callback = (data, c, builder) => builder.mean(data);
 * ```
 * 
 * Using arrow functions is available only since JS client version 1.3.0.
 * Beforehand it was not possible to use arrow functions in this context.
 */
class Builder {

	/**
	 * Creates a Builder instance that can be used without connecting to a back-end.
	 * 
	 * It requests the processes for the version specified from processes.openeo.org.
	 * Requests the latest version if no version number is passed.
	 * 
	 * @async
	 * @static
	 * @param {?string} version 
	 * @returns {Promise<Builder>}
	 * @throws {Error}
	 */
	static async fromVersion(version = null) {
		let url = 'https://processes.openeo.org/processes.json';
		if (typeof version === 'string') {
			url = 'https://processes.openeo.org/' + version + '/processes.json';
		}
		return await Builder.fromURL(url);
	}

	/**
	 * Creates a Builder instance that can be used without connecting to a back-end.
	 * 
	 * It requests the processes for the version specified from the given URL.
	 * CORS needs to be implemented on the server-side for the URL given.
	 * 
	 * @async
	 * @static
	 * @param {?string} url 
	 * @returns {Promise<Builder>}
	 * @throws {Error}
	 */
	static async fromURL(url) {
		let response = await axios(url);
		return new Builder(response.data);
	}

	/**
	 * Creates a Builder instance.
	 * 
	 * Each process passed to the constructor is made available as object method.
	 * 
	 * @param {Array.<Process>|Processes} processes - Either an array containing processes or an object compatible with `GET /processes` of the API.
	 * @param {?Builder} parent - The parent builder, usually only used by the Builder itself.
	 * @param {string} id - A unique identifier for the process.
	 */
	constructor(processes, parent = null, id = undefined) {
		/**
		 * List of all process specifications.
		 * @type {Array.<Process>}
		 */
		this.processes = [];
		/**
		 * The parent builder.
		 * @type {?Builder}
		 */
		this.parent = parent;
		/**
		 * The parent node.
		 * @type {?BuilderNode}
		 */
		this.parentNode = null;
		/**
		 * The parent parameter name.
		 * @type {?string}
		 */
		this.parentParameter = null;
		
		this.nodes = {};
		this.idCounter = {};
		this.callbackParameterCache = {};
		this.parameters = undefined;

		/**
		 * A unique identifier for the process.
		 * @public
		 * @type {string}
		 */
		this.id = id;

		if (Utils.isObject(processes) && Array.isArray(processes.processes)) {
			processes = processes.processes;
		}
		if (Array.isArray(processes)) {
			for(let process of processes) {
				try {
					this.addProcessSpec(process);
				} catch (error) {
					console.warn(error);
				}
			}
		}
		else {
			throw new Error("Processes are invalid; must be array or object according to the API.");
		}
	}

	/**
	 * Adds a process specification to the builder so that it can be used to create a process graph.
	 * 
	 * @param {Process} process - Process specification compliant to openEO API
	 * @throws {Error}
	 */
	addProcessSpec(process) {
		if (!Utils.isObject(process)) {
			throw new Error("Process '" + process.id + "' must be an object.");
		}
		if (typeof this[process.id] === 'undefined') {
			this.processes.push(process);
			/**
			 * Implicitly calls the process with the given name on the back-end by adding it to the process.
			 * 
			 * This is a shortcut for {@link Builder#process}.
			 * 
			 * @param {...*} args - The arguments for the process.
			 * @returns {BuilderNode}
			 * @see Builder#process
			 */
			this[process.id] = function(...args) {
				// Don't use arrow functions, they don't support the arguments keyword.
				return this.process(process.id, args);
			};
		}
		else {
			throw new Error("Can't create function for process '" + process.id + "'. Already exists in Builder class.");
		}
	}

	/**
	 * Sets the parent for this Builder.
	 * 
	 * @param {BuilderNode} node 
	 * @param {string} parameterName 
	 */
	setParent(node, parameterName) {
		this.parentNode = node;
		this.parentParameter = parameterName;
	}

	/**
	 * Creates a callback parameter with the given name.
	 * 
	 * @protected
	 * @param {string} parameterName 
	 * @returns {Proxy<Parameter>}
	 */
	createCallbackParameter(parameterName) {
		if (!this.callbackParameterCache[parameterName]) {
			this.callbackParameterCache[parameterName] = Parameter.create(this, parameterName);
		}
		return this.callbackParameterCache[parameterName];
	}

	/**
	 * Gets the callback parameter specifics from the parent process.
	 * 
	 * @returns {Array}
	 * @todo Should this also pass callback parameters from parents until root is reached?
	 */
	getParentCallbackParameters() {
		let callbackParams = [];
		if (this.parentNode && this.parentParameter) {
			try {
				callbackParams = ProcessUtils.getCallbackParametersForProcess(this.parentNode.spec, this.parentParameter).map(param => this.createCallbackParameter(param.name));
			} catch(error) {
				console.warn(error);
			}
		}
		return callbackParams;
	}

	/**
	 * Adds a parameter to the list of process parameters.
	 * 
	 * Doesn't add the parameter if it has the same name as a callback parameter.
	 * 
	 * @param {object.<string, *>} parameter - The parameter spec to add, must comply to the API.
	 * @param {boolean} [root=true] - Adds the parameter to the root process if set to `true`, otherwise to the process constructed by this builder. Usually you want to add it to the root.
	 */
	addParameter(parameter, root = true) {
		if (this.getParentCallbackParameters().find(p => p.name === parameter.name) !== undefined) {
			return; // parameter refers to callback
		}

		/**
		 * @type {Builder}
		 */
		let builder = this;
		if (root) {
			while(builder.parent) {
				builder = builder.parent;
			}
		}
		if (!Array.isArray(builder.parameters)) {
			builder.parameters = [];
		}
		let existing = builder.parameters.findIndex(p => p.name === parameter.name);
		if (existing !== -1) {
			Object.assign(builder.parameters[existing], parameter); // Merge
		}
		else {
			builder.parameters.push(parameter); // Add
		}
	}

	/**
	 * Returns the process specification for the given process identifier.
	 * 
	 * @param {string} id 
	 * @returns {Process}
	 */
	spec(id) {
		return this.processes.find(process => process.id === id);
	}

	/**
	 * Adds a mathematical formula to the process.
	 * 
	 * See the {@link Formula} class for more information.
	 * 
	 * @param {string} formula 
	 * @returns {BuilderNode}
	 * @throws {Error}
	 * @see Formula
	 */
	math(formula) {
		const Formula = require('./formula');
		let math = new Formula(formula);
		math.setBuilder(this);
		return math.generate(false);
	}

	/**
	 * Adds another process call to the process chain.
	 * 
	 * @param {string} processId - The id of the process to call.
	 * @param {object.<string, *>|Array} args - The arguments as key-value pairs or as array. For objects, they keys must be the parameter names and the values must be the arguments. For arrays, arguments must be specified in the same order as in the corresponding process.
	 * @param {?string} description - An optional description for the process call.
	 * @returns {BuilderNode}
	 */
	process(processId, args = {}, description = null) {
		let node = new BuilderNode(this, processId, args, description);
		this.nodes[node.id] = node;
		return node;
	}

	/**
	 * Returns a JSON serializable representation of the data that is API compliant.
	 * 
	 * @returns {Process}
	 */
	toJSON() {
		let process = {
			process_graph: Utils.mapObjectValues(this.nodes, node => node.toJSON())
		};
		PROCESS_META.forEach(key => {
			if (typeof this[key] !== 'undefined') {
				process[key] = this[key];
			}
		});
		return process;
	}
	
	/**
	 * Generates a unique identifier for the process nodes.
	 * 
	 * A prefix can be given to make the identifiers more human-readable.
	 * If the given name is empty, the id is simply an incrementing number.
	 * 
	 * @param {string} [prefix=""]
	 * @returns {string}
	 */
	generateId(prefix = "") {
		prefix = prefix.replace("_", "").substr(0, 6);
		if (!this.idCounter[prefix]) {
			this.idCounter[prefix] = 1;
		}
		else {
			this.idCounter[prefix]++;
		}
		return prefix + this.idCounter[prefix];
	}

}

module.exports = Builder;