//// PROCESS GRAPH CREATION ////
class ProcessGraphNode {
	constructor() { }

	filter_daterange(startT, endT, imagery = null) {
		return new ProcessNode('filter_daterange', {
			imagery: (imagery ? imagery : this),
			from: startT,
			to: endT
		});
	}

	filter_bbox(left, top, right, bottom, crs = 'EPSG:4326', imagery = null) {
		imagery = imagery ? imagery : this;
		return new ProcessNode('filter_bbox', {
			imagery: (imagery ? imagery : this),
			srs: crs,
			left: left,
			right: right,
			top: top,
			bottom: bottom
		});
	}

	filter_bands(bands, imagery = null) {
		return new ProcessNode('filter_bands', {
			imagery: (imagery ? imagery : this),
			bands: bands
		});
		// ToDo: add band names and wavelength filters
	}

	NDVI(red, nir, imagery = null) {
		return new ProcessNode('NDVI', {
			imagery: (imagery ? imagery : this),
			red: red,
			nir: nir
		});
	}

	min_time(imagery = null) {
		return new ProcessNode('min_time', {
			imagery: (imagery ? imagery : this)
		});
	}

	max_time(imagery = null) {
		return new ProcessNode('max_time', {
			imagery: (imagery ? imagery : this)
		});
	}
	
	udf(language, process_id, script, imagery = null) {
		return new UdfProcessNode(language, process_id, script, imagery);
	}
	
	zonal_statistics(regionsPath, func, imagery = null) {
		return new ProcessNode('zonal_statistics', {
			imagery: (imagery ? imagery : this),
			regions: regionsPath,
			func: func
		});
	}
	
	process(process_id, args, processParameterName, imagery = null) {
		// ToDo: Improve? Doesn't seem very tidy (changing an object from outer scope).
		// Should be solved with the new API version though
		if (processParameterName) {
			args[processParameterName] = (imagery ? imagery : this);
		}
		return new ProcessNode(process_id, args);
	}
	
	execute(output_format, output_args = {}) {
		return OpenEO.HTTP.send({
			method: 'post',
			responseType: 'blob',
			url: '/execute',
			data: {
				process_graph: this,
				output: {
					format: output_format,
					args: output_args
				}
			}
		});
	}
	
}

class ProcessNode extends ProcessGraphNode {
	constructor(process_id, args) {
		super();
		this.process_id = process_id;
		this.args = args;
	}
}

class UdfProcessNode extends ProcessNode {
	constructor(language, process_id, script, imagery = null) {
		super('udf/' + language + '/' + process_id, {
			imagery: (imagery ? imagery : this),
			script: script
		});
	}
	
}

class ImageCollectionNode extends ProcessGraphNode {
	constructor(srcId) {
		super();
		this.product_id = srcId;
	}
}

//// API SUB-COMPONENTS ////
class UserAPI {
	
	constructor(user_id) {
		this.user_id = user_id;
	}
	
	getProcessGraphs() {
		return OpenEO.HTTP.get('/users/' + encodeURIComponent(this.user_id) + '/process_graphs');
	}
	
	createProcessGraph(process_graph) {
		return OpenEO.HTTP.post('/users/' + encodeURIComponent(this.user_id) + '/process_graphs', process_graph);
	}
	
	getProcessGraphObject(process_graph_id) {
		return new UserProcessGraphAPI(this.user_id, process_graph_id);
	}
	
	getFiles() {
		return OpenEO.HTTP.get('/users/' + encodeURIComponent(this.user_id) + '/files');
	}
	
	getFileObject(path) {
		return new UserFileAPI(this.user_id, path);
	}
	
	getJobs() {
		return OpenEO.HTTP.get('/users/' + encodeURIComponent(this.user_id) + '/jobs');
	}
	
	getServices() {
		return OpenEO.HTTP.get('/users/' + encodeURIComponent(this.user_id) + '/services');
	}
	
	getCredits() {
		return OpenEO.HTTP.get('/users/' + encodeURIComponent(this.user_id) + '/credits');
	}
	
}

class UserProcessGraphAPI {
	
	constructor(user_id, process_graph_id) {
		this.user_id = user_id;
		this.process_graph_id = process_graph_id;
	}
	
	get() {
		return OpenEO.HTTP.get('/users/' + encodeURIComponent(this.user_id) + '/process_graphs/' + encodeURIComponent(this.process_graph_id));
	}
	
	replace(process_graph) {
		return OpenEO.HTTP.put('/users/' + encodeURIComponent(this.user_id) + '/process_graphs/' + encodeURIComponent(this.process_graph_id), process_graph);
	}
	
	delete() {
		return OpenEO.HTTP.delete('/users/' + encodeURIComponent(this.user_id) + '/process_graphs/' + encodeURIComponent(this.process_graph_id));
	}
	
}

class UserFileAPI {
	
	constructor(user_id, path) {
		this.user_id = user_id;
		this.path = path;
	}
	
	get() {
		return OpenEO.HTTP.get('/users/' + encodeURIComponent(this.user_id) + '/files/' + this._encodePath(this.path), null, 'blob');
	}
	
	replace(fileData, statusCallback = null) {
		var options = {
			method: 'put',
			url: '/users/' + encodeURIComponent(this.user_id) + '/files/' + this._encodePath(this.path),
			data: fileData,
			headers: {
				'Content-Type': 'application/octet-stream'
			}
		};
		if (typeof statusCallback === 'function') {
			options.onUploadProgress = function(progressEvent) {
				var percentCompleted = Math.round( (progressEvent.loaded * 100) / progressEvent.total );
				statusCallback(percentCompleted);
			};
		}
		return OpenEO.HTTP.send(options);
	}
	
	delete() {
		return OpenEO.HTTP.delete('/users/' + encodeURIComponent(this.user_id) + '/files/' + this._encodePath(this.path));
	}

	_encodePath(path) {
		// ToDo: Remove later
		if (OpenEO.API.driver === 'openeo-r-backend') {
			path = path.replace(/\./g, '_');
		}
		return encodeURIComponent(path);
	}
	
}

class JobAPI {
	
	constructor(job_id) {
		this.job_id = job_id;
	}
	
	modify(processGraph, output) {
		throw new Error('Not implemented');
	}
	
	get() {
		return OpenEO.HTTP.get('/jobs/' + encodeURIComponent(this.job_id));
	}
	
	subscribe() {
		throw new Error('Not implemented');
	}
	
	queue() {
		return OpenEO.HTTP.patch('/jobs/' + encodeURIComponent(this.job_id) + '/queue');
	}
	
	pause() {
		return OpenEO.HTTP.patch('/jobs/' + encodeURIComponent(this.job_id) + '/pause');
	}
	
	cancel() {
		return OpenEO.HTTP.patch('/jobs/' + encodeURIComponent(this.job_id) + '/cancel');
	}
	
	download(output_format = null) {
		var query = {};
		if (typeof output_format === 'string' && output_format.length > 0) {
			query.format = output_format;
		}
		return OpenEO.HTTP.get('/jobs/' + encodeURIComponent(this.job_id) + '/download', query, 'blob');
	}
	
}

class ServiceAPI {
	
	constructor(service_id) {
		this.service_id = service_id;
	}
	
	modify(service_args) {
		return OpenEO.HTTP.patch('/services/' + encodeURIComponent(this.service_id), {
			service_args: service_args
		});
	}
	
	get() {
		return OpenEO.HTTP.get('/services/' + encodeURIComponent(this.service_id));
	}
	
	delete() {
		return OpenEO.HTTP.delete('/services/' + encodeURIComponent(this.service_id));
	}
	
}

class Capabilities {
	
	constructor(response) {
		if (Array.isArray(response) && response.length > 0) {
			this.rawData = response.map(elem => elem.toLowerCase());
		}
		else {
			this.rawData = [];
		}
	}
	
	outputFormatCapabilities() {
		return this.capable('/capabilities/output_formats');
	}
	
	serviceCapabilities() {
		return this.capable('/capabilities/services');
	}
	
	data() {
		return this.capable('/data');
	}
	
	dataByOpenSearch() {
		return this.capable('/data/opensearch');
	}
	
	dataInfo() {
		return this.capable('/data/{product_id}');
	}
	
	processes() {
		return this.capable('/processes');
	}
	
	processesByOpenSearch() {
		return this.capable('/processes/opensearch');
	}
	
	processInfo() {
		return this.capable('/processes/{process_id}');
	}
	
	udfRuntimes() {
		return this.capable('/udf_runtimes');
	}
	
	udfRuntimeDescriptions() {
		return this.capable('/udf_runtimes/{lang}/{udf_type}');
	}
	
	userProcessGraphs() {
		return this.capable('/users/{user_id}/process_graphs');
	}
	
	createUserProcessGraph() {
		return this.capable('/users/{user_id}/process_graphs', 'post');
	}
	
	userProcessGraphInfo() {
		return this.capable('/users/{user_id}/process_graphs/{process_graph_id}');
	}
	
	updateUserProcessGraph() {
		return this.capable('/users/{user_id}/process_graphs/{process_graph_id}', 'put');
	}
	
	deleteUserProcessGraph() {
		return this.capable('/users/{user_id}/process_graphs/{process_graph_id}', 'delete');
	}
	
	userFiles() {
		return this.capable('/users/{user_id}/files');
	}
	
	downloadUserFile() {
		return this.capable('/users/{user_id}/files/{path}');
	}
	
	uploadUserFile() {
		return this.capable('/users/{user_id}/files/{path}', 'put');
	}
	
	deleteUserFile() {
		return this.capable('/users/{user_id}/files/{path}', 'delete');
	}
	
	userJobs() {
		return this.capable('/users/{user_id}/jobs');
	}
	
	userServices() {
		return this.capable('/users/{user_id}/services');
	}
	
	userCredits() {
		return this.capable('/users/{user_id}/credits');
	}
	
	userLogin() {
		return this.capable('/auth/login');
	}
	
	userRegister() {
		return this.capable('/auth/register', 'post');
	}
	
	executeJob() {
		return this.capable('/execute');
	}
	
	createJob() {
		return this.capable('/jobs', 'post');
	}
	
	jobInfo() {
		return this.capable('/jobs/{job_id}');
	}
	
	updateJob() {
		return this.capable('/jobs/{job_id}', 'patch');
	}
	
	queueJob() {
		return this.capable('/jobs/{job_id}/queue', 'patch');
	}
	
	pauseJob() {
		return this.capable('/jobs/{job_id}/pause', 'patch');
	}
	
	cancelJob() {
		return this.capable('/jobs/{job_id}/cancel', 'patch');
	}
	
	downloadJob() {
		return this.capable('/jobs/{job_id}/download');
	}
	
	createService() {
		return this.capable('/services', 'post');
	}

	serviceInfo() {
		return this.capable('/services/{service_id}');
	}

	updateService() {
		return this.capable('/services/{service_id}', 'patch');
	}

	deleteService() {
		return this.capable('/services/{service_id}', 'delete');
	}

	capable(path, method = 'get') {
		var path = path.replace('/', '\\/').replace(/\{\w+\}/ig, '\\{[^\\/\\{\\}]+\\}');
		var regexp = new RegExp('^' + path + '\\/?$', 'i');
		for(var i in this.rawData) {
			if (this.rawData[i].match(regexp) !== null) {
				return true;
			}
		}
		return false;
	}
	
}

//// API ////
var OpenEO = {

	API: {

		// The URL of the server to query for information.
		baseUrl: 'http://localhost/api/v0',
		// The driver expected to respond on the server, e.g. 'openeo-sentinelhub-driver'.
		// Currently this is only to work around specific behaviour of backends
		// during development phase.
		driver: null,
	
		getCapabilities() {
			return OpenEO.HTTP.get('/capabilities').then(data => new Capabilities(data));
		},
		
		getOutputFormats() {
			return OpenEO.HTTP.get('/capabilities/output_formats');
		}

	},
	
	HTTP: {

		get(path, query, responseType) {
			return this.send({
				method: 'get',
				responseType: responseType,
				url: path,
				params: query
			});
		},

		post(path, body, responseType) {
			return this.send({
				method: 'post',
				responseType: responseType,
				url: path,
				data: body
			});
		},

		patch(path, body) {
			return this.send({
				method: 'patch',
				url: path,
				data: body
			});
		},

		put(path, body) {
			return this.send({
				method: 'put',
				url: path,
				data: body
			});
		},

		delete(path) {
			return this.send({
				method: 'delete',
				url: path
			});
		},

		// authorize = true: Always authorize
		// authorize = false: Never authorize
		// authorize = null: Auto detect auhorization (authorize when url is beginning with baseUrl)
		download(url, authorize = null) {
			if (authorize === null) {
				authorize = (url.toLowerCase().indexOf(OpenEO.API.baseUrl.toLowerCase()) === 0);
			}
			return this.send({
				method: 'get',
				responseType: 'blob',
				url: url,
				withCredentials: (authorize === true)
			});
		},

		send(options) {
			options.baseURL = OpenEO.API.baseUrl;
			if (OpenEO.Auth.isLoggedIn() && (typeof options.withCredentials === 'undefined' || options.withCredentials === true)) {
				options.withCredentials = true;
				if (!options.headers) {
					options.headers = {};
				}
				options.headers['Authorization'] = 'Bearer ' + OpenEO.Auth.token;
			}
			if (!options.responseType) {
				options.responseType = 'json';
			}

			// ToDo: Remove this, it's just for the R backend for now, might need to be extended
			if (OpenEO.API.driver === 'openeo-r-backend' && options.url.match(/^\/(processes|data|jobs|services|udf_runtimes|users|execute)$/)) {
				options.url += '/';
			}
			return axios(options)
				.then(data => data.data)
				.catch(error => {
					if (error.response) {
						throw error.response.status;
					}
					else {
						throw 0;
					}
				});
		}

	},

	ImageCollection: {

		create(collId) {
			return new ImageCollectionNode(collId);
		}

	},

	Auth: {

		userId: null,
		token: null,
		
		reset() {
			this.userId = null;
			this.token = null;
		},

		isLoggedIn() {
			return (this.token !== null);
		},

		login(username, password) {
			var options = {
				method: 'get',
				url: '/auth/login',
				withCredentials: true,
				auth: {
					username: username,
					password: password
				}
			};
			return OpenEO.HTTP.send(options).then(data => {
				if (!data.user_id) {
					throw "No user_id returned.";
				}
				if (!data.token) {
					throw "No token returned.";
				}
				this.userId = data.user_id;
				this.token = data.token;
				return data;
			}).catch(error => {
				this.reset();
				throw error;
			});
		},

		register(password) {
			var body = {
				password: password
			};
			return OpenEO.HTTP.post('/auth/register', body).then(data => {
				if (!data.user_id) {
					throw "No user_id returned.";
				}
				this.userId = data.user_id;
				return data;
			});
		}

	},

	Data: {

		DefaultQueryOptions: {
			qname: null,
			qgeom: null,
			qstartdate: null,
			qenddate: null
		},

		get(options) {
			var opts = options || this.DefaultQueryOptions;
			return OpenEO.HTTP.get('/data', opts);
		},

		getById(id) {
			return OpenEO.HTTP.get('/data/' + encodeURIComponent(id));
		}

	},

	Processes: {

		get(name) {
			var query = {};
			if (name) {
				query.qname = name;
			}
			return OpenEO.HTTP.get('/processes', query);
		},

		getById(id) {
			return OpenEO.HTTP.get('/processes/' + encodeURIComponent(id));
		}

	},
	
	UDFRuntimes: {
		
		get() {
			return OpenEO.HTTP.get('/udf_runtimes');
		},
		
		getProcess(lang, udf_type) {
			return OpenEO.HTTP.get('/udf_runtimes/' + encodeURIComponent(lang) + '/' + encodeURIComponent(udf_type));
		}
		
	},

	Jobs: {

		create(processGraph, output_format = null, output_args = {}) {
			var body = {
				process_graph: processGraph
			};
			if (typeof output_format === 'string' && output_format.length > 0) {
				body.output = {
					format: output_format,
					args: output_args
				};
			}
			return OpenEO.HTTP.post('/jobs', body);
		},
		
		getObject(job_id) {
			return new JobAPI(job_id);
		}

	},
	
	Services: {
		
		create(job_id, service_type, service_args = {}) {
			return OpenEO.HTTP.post('/services', {
				job_id: job_id,
				service_type: service_type,
				service_args: service_args
			});
		},
		
		getCapabilities() {
			return OpenEO.HTTP.get('/capabilities/services').then((data) => {
				if (Array.isArray(data)) {
					return data.map(elem => elem.toLowerCase());
				}
				else {
					return [];
				}
			});
		},
		
		getObject(service_id) {
			return new ServiceAPI(service_id);
		}
		
	},
	
	Users: {
		
		getObject(user_id) {
			return new UserAPI(user_id);
		}
		
	}

};

// ToDo: Export classes etc
let toExport = {
	OpenEO: OpenEO,
	Capabilities: Capabilities
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = toExport;
}
else {
	if (typeof define === 'function' && define.amd) {
		define([], function () {
			return toExport;
		});
	}
	else {
		for (let exportObjName in toExport) {
			window[exportObjName] = toExport[exportObjName];
		}
	}
}
