const CommonUtils = require('@openeo/js-commons/src/utils');

/**
 * General utility functions.
 */
class Utils extends CommonUtils {

	/**
	 * Get the a link with the given rel type.
	 * 
	 * @protected
	 * @param {Array.<Link>} links - An array of links.
	 * @param {string|Array.<string>} rel - Relation type(s) to find.
	 * @param {Array.<string>} [types=['application/json']] - The expected types of the link.
	 * @returns {string | null}
	 * @throws {Error}
	 */
	static getLinkHref(links, rel, types = ['application/json']) {
		if (!Array.isArray(rel)) {
			rel = [rel];
		}
		if (Array.isArray(links)) {
			let link = links.find(l => Utils.isObject(l) && rel.includes(l.rel) && typeof l.href === 'string' && (!l.type || types.includes(l.type)));
			if (link) {
				return link.href;
			}
		}
		return null;
	}

	/**
	 * Makes all links in the list absolute.
	 * 
	 * @param {Array.<Link>} links - An array of links.
	 * @param {?string|AxiosResponse} [base=null] - The base url to use for relative links, or an response to derive the url from.
	 * @returns {Array.<Link>}
	 */
	static makeLinksAbsolute(links, base = null) {
		if (!Array.isArray(links)) {
			return links;
		}
		let baseUrl = '';
		if (Utils.isObject(base) && base.headers && base.config && base.request) { // AxiosResponse
			if (base.config.baseURL) {
				baseUrl = base.config.baseURL;
			}
			baseUrl += base.config.url;
		}
		else if (typeof base !== 'string') {
			baseUrl = Utils.getLinkHref(links, 'self');
		}
		else {
			baseUrl = base;
		}
		if (!baseUrl) {
			return links;
		}
		return links.map((link) => {
			if (!Utils.isObject(link) || typeof link.href !== 'string') {
				return link;
			}
			try {
				let url = new URL(link.href, baseUrl);
				return Object.assign({}, link, {href: url.toString()});
			} catch(error) {
				return link;
			}
		});
	}

}

module.exports = Utils;