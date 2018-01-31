class ImageCollectionNode {
	constructor() { }

	filter_daterange(startT, endT) {
		return new ProcessNode('filter_daterange', {
			collections: [this],
			from: startT,
			to: endT
		});
	}

	filter_bbox(box, crs = 'EPSG:4326') {
		return new ProcessNode('filter_bbox', {
			collections: [this],
			srs: crs,
			bbox: box
		});
	}

	NDI(first, second) {
		return new ProcessNode('NDI', {
			collections: [this],
			band1: first,
			band2: second
		});
	}

	min_time() {
		return new ProcessNode('min_time', {
			collections: [this]
		});
	}

	max_time() {
		return new ProcessNode('max_time', {
			collections: [this]
		});
	}
}

class ProcessNode extends ImageCollectionNode {
	constructor(process_id, args) {
		super();
		this.process_id = process_id;
		this.args = args;
	}
}

class SourceDatasetNode extends ImageCollectionNode {
	constructor(srcId) {
		super();
		this.product_id = srcId;
	}
}

var OpenEOClient = {

	ImageCollection: {

		create: function (collId) {
			return new SourceDatasetNode(collId);
		}

	},

	API: {

		// The URL of the server to query for information.
		baseUrl: 'http://localhost/api/v0',
		// The driver expected to respond on the server, e.g. 'openeo-sentinelhub-driver'.
		// Currently this is only to work around specific behaviour of backends
		// during development phase.
		driver: null,

		get: function (path, query, responseType) {
			return this.send({
				method: 'get',
				responseType: responseType,
				url: path,
				params: query
			});
		},

		post: function (path, body, responseType) {
			var options = {
				method: 'post',
				responseType: responseType,
				url: path,
				data: body,
				headers: {}
			};
			// ToDo: Remove this hack, only the sentinel driver needs a plain text header instead of json.
			if (OpenEOClient.API.driver === 'openeo-sentinelhub-driver') {
				options.headers = {
					'Content-Type': 'text/plain'
				};
			}
			return this.send(options);
		},

		send: function (options) {
			options.baseURL = this.baseUrl;
			if (OpenEOClient.Auth.hasCredentials()) {
				options.withCredentials = true;
				options.auth = {
					username: OpenEOClient.Auth.username,
					password: OpenEOClient.Auth.password
				};
			}
			if (!options.responseType) {
				options.responseType = 'json';
			}
			return axios(options)
				.then(data => data.data)
				.catch(data => data.status);
		}

	},

	Jobs: {

		// ToDo: This should be temporary and be replaced with a more elegant solution
		// see: /jobs/{job_id}/download and services in API 0.0.2
		getWcsPath: function (jobId) {
			return OpenEOClient.API.baseUrl + '/download/' + jobId + '/wcs';
		},

		create: function (processGraph) {
			return OpenEOClient.API.post('/jobs', {
				process_graph: processGraph
			});
		}

	},

	Auth: {

		username: null,
		password: null,
		userId: null,

		hasCredentials: function () {
			return Boolean(this.username && this.password);
		},

		setCredentials: function (username, password) {
			this.username = username;
			this.password = password;
		},

		login: function () {
			return OpenEOClient.API.get('/auth/login');
		}

	},

	Capabilities: {

		get: function () {
			return OpenEOClient.API.get('/capabilities');
		}

	},

	Data: {

		DefaultQueryOptions: {
			qname: null,
			qgeom: null,
			qstartdate: null,
			qenddate: null
		},

		OpenSearchOptions: {
			// ToDo
		},

		get: function (options) {
			var opts = options || this.DefaultQueryOptions;
			var path = '/data';
			// ToDo: Remove this, it's just for the R backend for now
			if (OpenEOClient.API.driver === 'openeo-r-backend') {
				path += '/';
			}
			return OpenEOClient.API.get(path, opts);
		},

		getById: function (id) {
			return OpenEOClient.API.get('/data/' + id);
		}

	},

	Processes: {

		get: function (name) {
			var query = {};
			if (name) {
				query.qname = name;
			}
			var path = '/processes';
			// ToDo: Remove this, it's just for the R backend for now
			if (OpenEOClient.API.driver === 'openeo-r-backend') {
				path += '/';
			}
			return OpenEOClient.API.get(path, query);
		},

		getById: function (id) {
			return OpenEOClient.API.get('/processes/' + id);
		}

	}

};

// ToDo: Export classes etc
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = OpenEOClient;
}
else {
	if (typeof define === 'function' && define.amd) {
		define([], function () {
			return OpenEOClient;
		});
	}
	else {
		window.OpenEOClient = OpenEOClient;
	}
}
