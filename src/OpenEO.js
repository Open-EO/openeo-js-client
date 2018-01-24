var OpenEO = {

	Core: {

		baseUrl: 'http://localhost/api',

		createUrl: function (path, query) {
			return this.baseUrl + path + this.createQueryString(query);
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
			var options = {
				dataType: dataType,
				url: url,
				data: data,
				success: successCallback,
				options: options,
				method: method
			};
			if (OpenEO.Auth.hasCredentials()) {
				options.beforeSend = function (xhr) {
					xhr.setRequestHeader("Authorization", "Basic " + btoa(OpenEO.Auth.username + ":" + OpenEO.Auth.password));
				};
			}
			$.ajax(options).fail(function (jqXHR, textStatus, errorThrown) {
				if (typeof errorCallback !== 'function' && jqXHR.status !== 200) {
					errorCallback(jqXHR.status);
				}
			});
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
			OpenEO.Core.getJSON('/auth/login', callback, errorCallback);
		}

	},

	Capabilities: {

		get: function (callback) {
			OpenEO.Core.getJSON('/capabilities', callback);
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
			OpenEO.Core.getJSON('/data/', callback, errorCallback);
		},

		getById: function (id, callback, errorCallback) {
			OpenEO.Core.getJSON('/data/' + id, callback, errorCallback);
		}

	},

	Processes: {

		get: function (name, callback, errorCallback) {
			var query = {};
			if (name) {
				query.qname = name;
			}
			OpenEO.Core.getJSON('/processes/', callback, errorCallback, query);
		},

		getById: function (id, callback, errorCallback) {
			OpenEO.Core.getJSON('/processes/' + id, callback, errorCallback);
		}

	}

};