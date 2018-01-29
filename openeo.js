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

		baseUrl: 'http://localhost/api/v0',

		get: function (path, query, responseType) {
			return this.send({
				method: 'get',
				responseType: responseType,
				url: path,
				params: query
			});
		},

		post: function (path, body, responseType) {
			return this.send({
				method: 'post',
				responseType: responseType,
				url: path,
				data: body,
				// ToDo: Remove this hack, only the sentinel driver needs a plain text header instead of json.
				headers: {
					'Content-Type': 'text/plain'
				}
			});
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
		getWcsPath: function (job_id) {
			return OpenEOClient.API.baseUrl + '/download/' + job_id + '/wcs';
		},

		create: function (processGraph) {
			return OpenEOClient.API.post('/jobs', {
				process_graph: processGraph
			});
		},

	},

	Auth: {

		username: null,
		password: null,
		userId: null,

		hasCredentials: function () {
			return (this.username && this.password);
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

		DefaultOptions: {
			qname: null,
			qgeom: null,
			qstartdate: null,
			qenddate: null
		},

		OpenSearchOptions: {
			// ToDo
		},

		get: function (options) {
			var opts = options || OpenEOClient.Data.DefaultOptions;
			return OpenEOClient.API.get('/data/'); // ToDo: Remove trailing slash, it's just for the R backend for now
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
			return OpenEOClient.API.get('/processes/', query);
		},

		getById: function (id) {
			return OpenEOClient.API.get('/processes/' + id);
		}

	}

};

if (typeof module !== 'undefined' && module.exports) {
	module.exports.OpenEOClient = OpenEOClient;
}