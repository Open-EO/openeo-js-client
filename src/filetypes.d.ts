export = FileTypes;
/**
 * Manages the files types supported by the back-end.
 */
declare class FileTypes {
    /**
     * Creates a new FileTypes object from an API-compatible JSON response.
     *
     * @param {object} data - A capabilities response compatible to the API specification for `GET /file_formats`.
     */
    constructor(data: object);
    data: {
        input: {};
        output: {};
    };
    /**
     * Returns the file types response as a JSON serializable representation of the data that is API compliant.
     *
     * @returns {object} - A reference to the capabilities response.
     */
    toJSON(): object;
    /**
     * Returns the input file formats.
     *
     * @returns {object}
     */
    getInputTypes(): object;
    /**
     * Returns the output file formats.
     *
     * @returns {object}
     */
    getOutputTypes(): object;
    /**
     * Returns a single input file format for a given identifier.
     *
     * Returns null if no input file format was found for the given identifier.
     *
     * @param {string} type - Case-insensitive file format identifier
     * @returns {?object}
     */
    getInputType(type: string): object | null;
    /**
     * Returns a single output file format for a given identifier.
     *
     * Returns null if no output file format was found for the given identifier.
     *
     * @param {string} type - Case-insensitive file format identifier
     * @returns {?object}
     */
    getOutputType(type: string): object | null;
    /**
     * Get a file type object from the list of input or output file formats.
     *
     * @param {string} type - Identifier of the file type
     * @param {string} io - Either `input` or `output`
     * @returns {?object}
     * @protected
     */
    protected _findType(type: string, io: string): object | null;
}
