/**
 * A link to another resource.
 */
type Link = {
    /**
     * The URL to the resource.
     */
    href: string;
    /**
     * Relation type
     */
    rel: string;
    /**
     * Media type
     */
    type: string;
    /**
     * Human-readable title
     */
    title: string;
};
/**
 * An openEO processing chain.
 */
type Process = any;
/**
 * An error.
 */
type ApiError = {
    id: string;
    code: string;
    message: string;
    links: Array<Link>;
};
/**
 * A log entry.
 */
type Log = {
    id: string;
    code: string;
    level: string;
    message: string;
    data: any;
    path: Array<any>;
    links: Array<Link>;
};
