/**
 * This converts a mathematical formula into a openEO process for you.
 *
 * Operators: - (subtract), + (add), / (divide), * (multiply), ^ (power)
 *
 * It supports all mathematical functions (i.e. expects a number and returns a number) the back-end implements, e.g. `sqrt(x)`.
 *
 * Only available if a builder is specified in the constructor:
 * You can refer to output from processes with a leading `#`, e.g. `#loadco1` if the node to refer to has the key `loadco1`.
 *
 * Only available if a parent node is set via `setNode()`:
 * Parameters can be accessed simply by name.
 * If the first parameter is a (labeled) array, the value for a specific index or label can be accessed by typing the numeric index or textual label with a $ in front, for example $B1 for the label B1 or $0 for the first element in the array. Numeric labels are not supported.
 *
 * An example that computes an EVI (assuming the labels for the bands are `NIR`, `RED` and `BLUE`): `2.5 * ($NIR - $RED) / (1 + $NIR + 6 * $RED + (-7.5 * $BLUE))`
 */
import {Builder} from "./builder";
import {BuilderNode} from "./node";

export declare class Formula {
    /**
     * Creates a math formula object.
     *
     * @param {string} formula - A mathematical formula to parse.y
     */
    constructor(formula: string);
    /**
     * @type {object.<string, *>}
     */
    tree: any;
    /**
     * @type {?Builder}
     */
    builder: Builder | null;
    /**
     * The builder instance to use.
     *
     * @param {Builder} builder - The builder instance to add the formula to.
     */
    setBuilder(builder: Builder): void;
    /**
     * Generates the processes for the formula specified in the constructor.
     *
     * Returns the last node that computes the result.
     *
     * @param {boolean} setResultNode - Set the `result` flag to `true`.
     * @returns {BuilderNode}
     * @throws {Error}
     */
    generate(setResultNode?: boolean): BuilderNode;
    /**
     * Walks through the tree generated by the TapDigit parser and generates process nodes.
     *
     * @protected
     * @param {object.<string, *>} tree
     * @returns {object.<string, *>}
     * @throws {Error}
     */
    protected parseTree(tree: any): any;
    /**
     * Gets the reference for a value, e.g. from_node or from_parameter.
     *
     * @protected
     * @param {*} value
     * @returns {*}
     */
    protected getRef(value: any): any;
    /**
     * Adds a process node for an operator like +, -, *, / etc.
     *
     * @param {string} operator - The operator.
     * @param {number|object.<string, *>} left - The left part for the operator.
     * @param {number|object.<string, *>} right - The right part for the operator.
     * @returns {BuilderNode}
     * @throws {Error}
     */
    addOperatorProcess(operator: string, left: number | any, right: number | any): BuilderNode;
}

export declare namespace Formula {
    const operatorMapping: any;
}
