let Environment = null;
if (typeof window === 'undefined') {
	Environment = require('./node');
}
else {
	Environment = require('./browser');
}
/**
 * The axios instance to use for HTTP requests.
 * 
 * @type {object}
 * @static
 */
Environment.axios = require('axios');

module.exports = Environment;