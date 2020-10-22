export = Parameter;
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
declare class Parameter {
    /**
     * Creates a new parameter instance, but proxies calls to it
     * so that array access is possible (see class description).
     *
     * @static
     * @param {Builder} builder
     * @param {string} parameterName
     * @returns {Proxy<Parameter>}
     */
    static create(builder: import('./builder'), parameterName: string): ProxyConstructor;
    /**
     * Creates a new process parameter.
     *
     * @param {string} name - Name of the parameter.
     * @param {object|string} schema - The schema for the parameter. Can be either an object compliant to JSON Schema or a string with a JSON Schema compliant data type, e.g. `string`.
     * @param {string} description - A description for the parameter
     * @param {*} defaultValue - An optional default Value for the parameter. If set, make the parameter optional. If not set, the parameter is required. Defaults to `undefined`.
     */
    constructor(name: string, schema?: object | string, description?: string, defaultValue?: any);
    name: string;
    spec: {
        name: string;
        schema: object;
        description: string;
    };
    /**
     * Returns a JSON serializable representation of the data that is API compliant.
     *
     * @returns {object}
     */
    toJSON(): any;
    /**
     * Reference to a parameter.
     *
     * @typedef FromParameter
     * @type {object}
     * @property {string} from_parameter - The name of the parameter.
     */
    /**
     * Returns the reference object for this parameter.
     *
     * @returns {FromParameter}
     */
    ref(): {
        /**
         * - The name of the parameter.
         */
        from_parameter: string;
    };
}
