export = UserProcess;
declare const UserProcess_base: typeof import("./baseentity");
/**
 * A Stored Process Graph.
 *
 * @augments BaseEntity
 */
declare class UserProcess extends UserProcess_base {
    /**
     * Creates an object representing a process graph stored at the back-end.
     *
     * @param {Connection} connection - A Connection object representing an established connection to an openEO back-end.
     * @param {string} id - ID of a stored process graph.
     */
    constructor(connection: import("./connection"), id: string);
    /**
     * The identifier of the process.
     * @public
     * @readonly
     * @type {string}
     */
    public readonly id: string;
    /**
     * @public
     * @readonly
     * @type {?string}
     */
    public readonly summary: string | null;
    /**
     * @public
     * @readonly
     * @type {?string}
     */
    public readonly description: string | null;
    /**
     * A list of categories.
     * @public
     * @readonly
     * @type {string[]}
     */
    public readonly categories: string[];
    /**
     * A list of parameters.
     *
     * @public
     * @readonly
     * @type {string}
     */
    public readonly parameters: string;
    /**
     * Description of the data that is returned by this process.
     * @public
     * @readonly
     * @type {?object}
     */
    public readonly returns: object | null;
    /**
     * Specifies that the process or parameter is deprecated with the potential to be removed in any of the next versions.
     * @public
     * @readonly
     * @type {boolean}
     */
    public readonly deprecated: boolean;
    /**
     * Declares the process or parameter to be experimental, which means that it is likely to change or may produce unpredictable behaviour.
     * @public
     * @readonly
     * @type {boolean}
     */
    public readonly experimental: boolean;
    /**
     * Declares any exceptions (errors) that might occur during execution of this process.
     * @public
     * @readonly
     * @type {object}
     */
    public readonly exceptions: object;
    /**
     * @public
     * @readonly
     * @type {object[]}
     */
    public readonly examples: object[];
    /**
     * Links related to this process.
     * @public
     * @readonly
     * @type {object[]}
     */
    public readonly links: object[];
    /**
     * @public
     * @readonly
     * @type {object}
     */
    public readonly processGraph: object;
    /**
     * Updates the data stored in this object by requesting the process graph metadata from the back-end.
     *
     * @async
     * @returns {Promise<UserProcess>} The updated process graph object (this).
     * @throws {Error}
     */
    describeUserProcess(): Promise<UserProcess>;
    /**
     * Modifies the stored process graph at the back-end and afterwards updates this object, too.
     *
     * @async
     * @param {object} parameters - An object with properties to update, each of them is optional, but at least one of them must be specified. Additional properties can be set if the server supports them.
     * @param {object} parameters.process - A new process.
     * @param {string} parameters.title - A new title.
     * @param {string} parameters.description - A new description.
     * @returns {Promise<UserProcess>} The updated process graph object (this).
     * @throws {Error}
     */
    replaceUserProcess(parameters: {
        process: object;
        title: string;
        description: string;
    }): Promise<UserProcess>;
    /**
     * Deletes the stored process graph from the back-end.
     *
     * @async
     * @throws {Error}
     */
    deleteUserProcess(): Promise<void>;
}
