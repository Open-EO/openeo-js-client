import {Builder} from "./builder";

/**
 * A class that represents a process node and also a result from a process.
 */
export declare class BuilderNode {
    /**
     * Creates a new process node for the builder.
     *
     * @param {Builder} parent
     * @param {string} processId
     * @param {object.<string, *>} [processArgs={}]
     * @param {?string} [processDescription=null]
     */
    constructor(parent: Builder, processId: string, processArgs?: any, processDescription?: string | null);
    /**
     * The parent builder.
     * @type {Builder}
     */
    parent: Builder;
    /**
     * The specification of the process associated with this node.
     * @type {Process}
     * @readonly
     */
    readonly spec: any;
    /**
     * The unique identifier for the node (not the process ID!).
     * @type {string}
     */
    id: string;
    /**
     * The arguments for the process.
     * @type {object.<string, *>}
     */
    arguments: any;
    /**
     * @ignore
     */
    _description: string;
    /**
     * Is this the result node?
     * @type {boolean}
     */
    result: boolean;
    /**
     * Converts a sorted array of arguments to an object with the respective parameter names.
     *
     * @param {Array} processArgs
     * @returns {object.<string, *>}
     * @throws {Error}
     */
    namedArguments(processArgs: any[]): any;
    /**
     * Checks the arguments given for parameters and add them to the process.
     *
     * @param {object.<string, *>|Array} processArgs
     */
    addParametersToProcess(processArgs: any | any[]): void;
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
    description(description: string | undefined): string | BuilderNode;
    /**
     * Converts the given argument into something serializable...
     *
     * @protected
     * @param {*} arg - Argument
     * @param {string} name - Parameter name
     * @returns {*}
     */
    protected exportArgument(arg: any, name: string): any;
    /**
     * Creates a new Builder, usually for a callback.
     *
     * @protected
     * @param {?BuilderNode} [parentNode=null]
     * @param {?string} parentParameter
     * @returns {BuilderNode}
     */
    protected createBuilder(parentNode?: BuilderNode | null, parentParameter?: string | null): BuilderNode;
    /**
     * Returns the serializable process for the callback function given.
     *
     * @protected
     * @param {Function} arg - callback function
     * @param {string} name - Parameter name
     * @returns {object.<string, *>}
     * @throws {Error}
     */
    protected exportCallback(arg: Function, name: string): any;
    /**
     * Returns a JSON serializable representation of the data that is API compliant.
     *
     * @returns {object.<string, *>}
     */
    toJSON(): any;
    /**
     * Reference to a parameter.
     *
     * @typedef FromNode
     * @type {object}
     * @property {string} from_node - The node identifier.
     */
    /**
     * Returns the reference object for this node.
     *
     * @returns {FromNode}
     */
    ref(): {
        /**
         * - The node identifier.
         */
        from_node: string;
    };
}
