export = Builder;
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
 */
declare class Builder {
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
    static fromVersion(version?: string | null): Promise<Builder>;
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
    static fromURL(url: string | null): Promise<Builder>;
    /**
     * Creates a Builder instance.
     *
     * Each process passed to the constructor is made available as object method.
     *
     * @param {Array|object} processes - Either an array containing processes or an object compatible with `GET /processes` of the API.
     * @param {?Builder} parent - The parent builder, usually only used by the Builder itself.
     * @param {string} id - A unique identifier for the process.
     */
    constructor(processes: any[] | object, parent?: Builder | null, id?: string);
    processes: any;
    /**
     * The parent builder.
     * @type {?Builder}
     */
    parent: Builder | null;
    /**
     * The parent node.
     * @type {?BuilderNode}
     */
    parentNode: import("./node") | null;
    /**
     * The parent parameter name.
     * @type {?string}
     */
    parentParameter: string | null;
    nodes: {};
    idCounter: {};
    callbackParameterCache: {};
    parameters: any;
    /**
     * A unique identifier for the process.
     * @public
     * @type {string}
     */
    public id: string;
    /**
     * Sets the parent for this Builder.
     *
     * @param {BuilderNode} node
     * @param {string} parameterName
     */
    setParent(node: import("./node"), parameterName: string): void;
    /**
     * Creates a callback parameter with the given name.
     *
     * @protected
     * @param {string} parameterName
     * @returns {Proxy<Parameter>}
     */
    protected createCallbackParameter(parameterName: string): ProxyConstructor;
    /**
     * Gets the callback parameter specifics from the parent process.
     *
     * @returns {Array}
     * @todo Should this also pass callback parameters from parents until root is reached?
     */
    getParentCallbackParameters(): any[];
    /**
     * Adds a parameter to the list of process parameters.
     *
     * Doesn't add the parameter if it has the same name as a callback parameter.
     *
     * @param {object} parameter - The parameter spec to add, must comply to the API.
     * @param {boolean} [root=true] - Adds the parameter to the root process if set to `true`, otherwise to the process constructed by this builder. Usually you want to add it to the root.
     */
    addParameter(parameter: object, root?: boolean): void;
    /**
     * Returns the process specification for the given process identifier.
     *
     * @param {string} id
     * @returns {object}
     */
    spec(id: string): object;
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
    math(formula: string): import("./node");
    /**
     * Adds another process call to the process chain.
     *
     * @param {string} processId - The id of the process to call.
     * @param {object|Array} args - The arguments as key-value pairs or as array. For objects, they keys must be the parameter names and the values must be the arguments. For arrays, arguments must be specified in the same order as in the corresponding process.
     * @param {?string} description - An optional description for the process call.
     * @returns {BuilderNode}
     */
    process(processId: string, args?: object | any[], description?: string | null): import("./node");
    /**
     * Returns a JSON serializable representation of the data that is API compliant.
     *
     * @returns {object}
     */
    toJSON(): any;
    /**
     * Generates a unique identifier for the process nodes.
     *
     * A prefix can be given to make the identifiers more human-readable.
     * If the given name is empty, the id is simply an incrementing number.
     *
     * @param {string} [prefix=""]
     * @returns {string}
     */
    generateId(prefix?: string): string;
}
