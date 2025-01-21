const CLIENT_VERSION = "3.0.0-alpha.1";

const MIN_OPENEO_API_VERSION = '1.0.0-rc.2';
const MAX_OPENEO_API_VERSION = '1.x.x';

const CONFORMANCE_RELS = [
	'conformance',
	'http://www.opengis.net/def/rel/ogc/1.0/conformance'
];

const DATA_RELS = [
  'data',
  'http://www.opengis.net/def/rel/ogc/1.0/data'
];

module.exports = {
  CLIENT_VERSION,
  CONFORMANCE_RELS,
  DATA_RELS,
  MIN_OPENEO_API_VERSION,
  MAX_OPENEO_API_VERSION
};