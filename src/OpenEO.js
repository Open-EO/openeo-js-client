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

	Core: {

		baseUrl: 'http://localhost/api/v0',

		imagecollection: function(collId) {
			return new SourceDatasetNode(collId);
		},

		createUrl: function (path, query) {
			return this.baseUrl + path + this.createQueryString(query);
		},

		createWcsUrl: function(job_id) {
			return this.createUrl('/download/' + job_id + '/wcs');
		},

		createQueryString: function (query) {
			if (!query) {
				return '';
			}

			var keys = Object.keys(query);
			if (keys.length === 0) {
				return '';
			}

			var queryString = keys.map(function (key) {
				var val = query[key];
				if (typeof val !== 'string' && typeof val !== 'number' && typeof val !== 'boolean') {
					return '';
				}
				return key + '=' + encodeURI(val);
			}).join('&');

			return queryString.length > 0 ? '?' + queryString : '';
		},

		getJSON: function (path, successCallback, errorCallback, query) {
			this.callApi("GET", "json", this.createUrl(path, query), successCallback, errorCallback);
		},

		callApi: function (method, dataType, url, successCallback, errorCallback, data) {
			// ToDo: Node implementation only, make cross platform compatible
			var options = {
				dataType: dataType,
				url: url,
				data: data,
				success: successCallback,
				options: options,
				method: method
			};
			if (OpenEOClient.Auth.hasCredentials()) {
				options.beforeSend = function (xhr) {
					xhr.setRequestHeader("Authorization", "Basic " + btoa(OpenEOClient.Auth.username + ":" + OpenEOClient.Auth.password));
				};
			}
			$.ajax(options).fail(function (jqXHR, textStatus, errorThrown) {
				if (typeof errorCallback !== 'function' && jqXHR.status !== 200) {
					errorCallback(jqXHR.status);
				}
			});
		}

	},
	
	Jobs: {
		
		create: function(processGraph) {
			// ToDo: Node implementation only, make cross platform compatible
			return fetch(OpenEOClient.Core.createUrl('/jobs'), {
				method: 'POST',
				body: JSON.stringify({
					process_graph: processGraph
				})
			})
			.then(response => response.json())
			.then(resJson => resJson.job_id);
		}
		
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

		login: function (callback, errorCallback) {
			OpenEOClient.Core.getJSON('/auth/login', callback, errorCallback);
		}

	},

	Capabilities: {

		get: function (callback) {
			OpenEOClient.Core.getJSON('/capabilities', callback);
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

		get: function (options, callback, errorCallback) {
			var opts = options || OpenEO.Data.DefaultOptions;
			OpenEOClient.Core.getJSON('/data/', callback, errorCallback);
		},

		getById: function (id, callback, errorCallback) {
			OpenEOClient.Core.getJSON('/data/' + id, callback, errorCallback);
		}

	},

	Processes: {

		get: function (name, callback, errorCallback) {
			var query = {};
			if (name) {
				query.qname = name;
			}
			OpenEOClient.Core.getJSON('/processes/', callback, errorCallback, query);
		},

		getById: function (id, callback, errorCallback) {
			OpenEOClient.Core.getJSON('/processes/' + id, callback, errorCallback);
		}

	}

};

if (typeof module !== 'undefined' && module.exports) {
	module.exports.OpenEOClient = OpenEOClient;
}