export = FileTypes;
/**
 * Manages the files types supported by the back-end.
 */
declare class FileTypes {
    /**
     * @typedef FileTypesAPI
     * @type {object}
     * @property {object.<string, FileType>} input - File types supported to import
     * @property {object.<string, FileType>} output - File types supported to export
     */
    /**
     * @typedef FileType
     * @type {object}
     * @property {string} title
     * @property {string} description
     * @property {Array.<string>} gis_data_types
     * @property {object.<string, *>} parameters
     * @property {Array.<Link>} links
     */
    /**
     * Creates a new FileTypes object from an API-compatible JSON response.
     *
     * @param {FileTypesAPI} data - A capabilities response compatible to the API specification for `GET /file_formats`.
     */
    constructor(data: {
        /**
         * - File types supported to import
         */
        input: any;
        /**
         * - File types supported to export
         */
        output: any;
    });
    /**
     * @type {FileTypesAPI}
     */
    data: {
        /**
         * - File types supported to import
         */
        input: any;
        /**
         * - File types supported to export
         */
        output: any;
    };
    /**
     * Returns the file types response as a JSON serializable representation of the data that is API compliant.
     *
     * @returns {FileTypesAPI}
     */
    toJSON(): {
        /**
         * - File types supported to import
         */
        input: any;
        /**
         * - File types supported to export
         */
        output: any;
    };
    /**
     * Returns the input file formats.
     *
     * @returns {object.<string, FileType>}
     */
    getInputTypes(): any;
    /**
     * Returns the output file formats.
     *
     * @returns {object.<string, FileType>}
     */
    getOutputTypes(): any;
    /**
     * Returns a single input file format for a given identifier.
     *
     * Returns null if no input file format was found for the given identifier.
     *
     * @param {string} type - Case-insensitive file format identifier
     * @returns {?FileType}
     */
    getInputType(type: string): {
        title: string;
        description: string;
        gis_data_types: Array<string>;
        parameters: any;
        links: Link[];
    };
    /**
     * Returns a single output file format for a given identifier.
     *
     * Returns null if no output file format was found for the given identifier.
     *
     * @param {string} type - Case-insensitive file format identifier
     * @returns {?FileType}
     */
    getOutputType(type: string): {
        title: string;
        description: string;
        gis_data_types: Array<string>;
        parameters: any;
        links: Link[];
    };
    /**
     * Get a file type object from the list of input or output file formats.
     *
     * @param {string} type - Identifier of the file type
     * @param {string} io - Either `input` or `output`
     * @returns {?FileType}
     * @protected
     */
    protected _findType(type: string, io: string): {
        title: string;
        description: string;
        gis_data_types: Array<string>;
        parameters: any;
        links: Link[];
    };
}
