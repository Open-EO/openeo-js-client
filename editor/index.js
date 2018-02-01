require('./node_modules/codemirror/lib/codemirror.css');
require('./node_modules/codemirror/addon/hint/show-hint.css');
require('./node_modules/leaflet/dist/leaflet.css');
require('./main.css');

require('./node_modules/codemirror/addon/hint/show-hint.js');
require('./node_modules/codemirror/addon/hint/javascript-hint.js');
require('./node_modules/codemirror/mode/javascript/javascript.js');
var L = require('leaflet');
var CodeMirror = require('codemirror');
var OpenEO = require('../openeo.js');

OpenEO.Editor = {
	
	DefaultEditorOptions: {
		value: '',
		mode: 'javascript',
		indentUnit: 4,
		lineNumbers: true,
		extraKeys: {
			"Ctrl-Space": "autocomplete"
		}
	},
	
	ProcessGraph: null,
	Visualization: null,

	Environment: null,

	script: null,
	scriptName: "",
	
	init: function() {
		OpenEO.API.baseUrl = 'http://localhost:8080/';
		OpenEO.API.driver = 'openeo-sentinelhub-driver';

		this.setVisualizations();
		OpenEO.Data.get().then(this.setDiscoveredData);
		OpenEO.Processes.get().then(this.setDiscoveredProcesses);

		document.getElementById('setServer').addEventListener('click', this.setServer);
		document.getElementById('newScript').addEventListener('click', this.newScript);
		document.getElementById('runScript').addEventListener('click', this.runScript);
		document.getElementById('loadScript').addEventListener('click', this.loadScript);
		document.getElementById('saveScript').addEventListener('click', this.saveScript);
		document.getElementById('downloadScript').addEventListener('click', this.downloadScript);

		this.initEnvironment();
		
		this.Map.init();
	},
	
	initEnvironment: function() {
		var options = Object.create(this.DefaultEditorOptions);
		options.value = `// Create the process graph
OpenEO.Editor.ProcessGraph = OpenEO.ImageCollection.create('Sentinel2A-L1C')
	.filter_daterange("2018-01-01","2018-01-31")
	.NDI(3,8)
	.max_time();`;
		this.Environment = CodeMirror(document.getElementById('editor'), options);
	},
	
	setServer: function() {
		var server = prompt("URL of the OpenEO compatible server to query", OpenEO.API.baseUrl);
		if (server && server != OpenEO.API.baseUrl) {
			alert("Changing servers on the fly not implemented yet.\r\n" + server);
		}
	},
	
	setDiscoveredData: function(data) {
		var select = document.getElementById('data');
		for (var i in data) {
			OpenEO.Editor._makeOption(select, null, data[i].product_id, data[i].description);
		}
		document.getElementById('insertData').addEventListener('click', OpenEO.Editor._insertToEditorFromEvent);
	},
	
	setDiscoveredProcesses: function(data) {
		var select = document.getElementById('processes');
		for (var i in data) {
			OpenEO.Editor._makeOption(select, null, data[i].process_id, data[i].description);
		}
		document.getElementById('insertProcesses').addEventListener('click', OpenEO.Editor._insertToEditorFromEvent);
	},
	
	setVisualizations: function() {
		var select = document.getElementById('visualizations');
		for (var key in OpenEO.Visualizations) {
			OpenEO.Editor._makeOption(select, key, OpenEO.Visualizations[key].name);
		}
		document.getElementById('insertVisualizations').addEventListener('click', OpenEO.Editor._insertVisualization);
	},

	_makeOption: function(select, key, title, description) {
		var option = document.createElement("option");
		var text = document.createTextNode(title);
		option.appendChild(text);
		if (!key) {
			option.value = title;
		}
		else {
			option.value = key;
		}
		if (description) {
			option.title = description;
		}
		select.appendChild(option);
	},
	
	_insertVisualization: function() {
		var select = document.getElementById('visualizations');
		var code;
		if (select.value === 'custom') {
			code = `
OpenEO.Editor.Visualization = {
	function: function(input) {
		// ToDo: Implement your custom visualization
	}
};
`;
		}
		else if (typeof OpenEO.Visualizations[select.value] !== 'undefined') {
			var argsCode = '';
			var argList = [];
			for(var key in OpenEO.Visualizations[select.value].arguments) {
				var arg = OpenEO.Visualizations[select.value].arguments[key];
				var value = prompt(arg.description, JSON.stringify(arg.defaultValue));
				if (value !== null) {
					argList.push('"' + key + '": ' + value);
				}
			}
			if (argList.length > 0) {
				argsCode = `,
	args: {
		` + argList.join(",\r\n		") + `
	}`;
			}

			code = `
OpenEO.Editor.Visualization = {
	function: OpenEO.Visualizations.` + select.value + argsCode + `
};
`;
		}
		else {
			code = '';
		}
		OpenEO.Editor._insertToEditor(code);
	},

	_insertToEditorFromEvent: function(evt) {
		var select = null;
		if (evt.target.id === 'insertData') {
			select = document.getElementById('data');
		}
		else if (evt.target.id === 'insertProcesses') {
			select = document.getElementById('processes');
		}
		if (select) {
			OpenEO.Editor._insertToEditor(select.value);
		}
	},

	_insertToEditor: function(text) {
		OpenEO.Editor.Environment.replaceSelection(text);
	},

	runScript: function () {
		OpenEO.Editor.ProcessGraph = {};
		OpenEO.Editor.Visualization = {
			function: null,
			args: {}
		};
		OpenEO.Editor.script = OpenEO.Editor.Environment.getSelection();
		if (!OpenEO.Editor.script) {
			OpenEO.Editor.script = OpenEO.Editor.Environment.getValue();
		}
		if (!OpenEO.Editor.script) {
			return;
		}
		eval(OpenEO.Editor.script);

		OpenEO.Editor.Visualization.args = OpenEO.Editor.Visualization.args || {};
		// Modify visualization when user specified a pre-defined visualization
		if (typeof OpenEO.Editor.Visualization.function === 'object') {
			var vis = OpenEO.Editor.Visualization.function;
			OpenEO.Editor.Visualization.function = vis.callback;
			// Set default arguments when not given by user
			if (typeof vis.arguments !== 'undefined') {
				for(var key in vis.arguments) {
					if (typeof OpenEO.Editor.Visualization.args[key] === 'undefined') {
						OpenEO.Editor.Visualization.args[key] = vis.arguments[key].defaultValue;
					}
				}
			}
		}

		// Execute job
		OpenEO.Jobs.create(OpenEO.Editor.ProcessGraph)
			.then(data => {
				OpenEO.Editor.Map.tiles.setUrl(OpenEO.Jobs.getWcsPath(data.job_id), false);
				OpenEO.Editor.Map.tiles.recolor();
			}).catch(errorCode => {
				alert('Sorry, could not create an OpenEO job. (' + errorCode + ')');
			});
		
	},
	
	newScript: function() {
		var confirmed = confirm("Do you really want to clear the existing script to create a new one?");
		if (confirmed) {
			OpenEO.Editor.Environment.setValue('');
			OpenEO.Editor._setScriptName('');
		}
	},
	
	loadScript: function() {
		var name = prompt("Name of the script to load:");
		if (!name) {
			return;
		}
		var code = localStorage.getItem(name);
		if (code) {
			OpenEO.Editor.Environment.setValue(code);
			OpenEO.Editor._setScriptName(name);
		}
		else {
			alert('No script with this name found.');
		}
	},
	
	saveScript: function() {
		var name = prompt("Name for the script:", OpenEO.Editor.scriptName);
		if (!name) {
			return;
		}
		localStorage.setItem(name, OpenEO.Editor.Environment.getValue());
		OpenEO.Editor._setScriptName(name);
	},
	
	downloadScript: function() {
		var downloadData = (function () {
			var a = document.createElement("a");
			document.body.appendChild(a);
			a.style = "display: none";
			return function (data, fileName) {
				var blob = new Blob([data], {type: "text/javascript"});
				var url = window.URL.createObjectURL(blob);
				a.href = url;
				a.download = fileName;
				a.click();
				window.URL.revokeObjectURL(url);
			};
		}());
		var name = OpenEO.Editor.scriptName;
		if (!name) {
			name = "openeo-script";
		}
		downloadData(OpenEO.Editor.Environment.getValue(), name + ".js");
	},
	
	_setScriptName: function(name) {
		OpenEO.Editor.scriptName = name;
		document.getElementById('scriptName').innerText = name;
	}

};

OpenEO.Editor.Map = {
	
	Options:  {
		center: [45, 15],
		zoom: 8
	},
	instance: null,
	tiles: null,
	
	init: function() {
		this.instance = new L.Map('map', this.Options);
		L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: 'Map data &copy; <a href="http://www.osm.org">OpenStreetMap</a>'
		}).addTo(this.instance);

		this.initTiles();
	},

	initTiles: function() {
		this.tiles = L.tileLayer.wms('http://localhost:8080/download/placeholder/wcs',
		{
			request: 'GetCoverage',
			service: 'WCS',
			coverage: 'CUSTOM',
			format: 'image/jpeg',
			tileSize: 256,
			minZoom: 8
		});

		this.tiles.recolor = function () {
			for (var key in this._tiles) {
				var tile = this._tiles[key];
				OpenEO.Editor.Map.recolor(tile.el);
			}
		};

		this.tiles.createTile = function (coords) {
			const tile = L.DomUtil.create('canvas', 'leaflet-tile');
			tile.width = tile.height = this.options.tileSize;

			const imageObj = new Image();
			imageObj.crossOrigin = '';
			imageObj.onload = function () {
				const ctx = tile.getContext('2d');
				ctx.drawImage(imageObj, 0, 0);
				tile.originalImage = ctx.getImageData(0, 0, tile.width, tile.height);
				OpenEO.Editor.Map.recolor(tile);
			};
			imageObj.src = this.getTileUrl(coords);
			return tile;
		};

		this.tiles.addTo(OpenEO.Editor.Map.instance);
	},

	recolor: function(tile) {
		if (!tile.originalImage || !OpenEO.Editor.Visualization || !OpenEO.Editor.Visualization.function) {
			return;
		}
		
		const ctx = tile.getContext('2d');
		const tgtData = ctx.getImageData(0, 0, tile.width, tile.height);

		for (var i = 0; i < tgtData.data.length; i += 4) {
			const input = tile.originalImage.data.slice(i, i + 4);
			const es = OpenEO.Editor.Visualization.function(input, OpenEO.Editor.Visualization.args);
			tgtData.data.set(es, i);
		}
		ctx.putImageData(tgtData, 0, 0);
	}

};

OpenEO.Visualizations = {
	
	/**
	 * Color gradient/ramp.
	 * 
	 * Parameters: band, valMin, valMax, clrMin, clrMax. Examples:	
	 * band: 0,
	 * valMin: 0,
	 * valMax: 255,
	 * clrMin: [240, 220, 150, 255],
	 * clrMax: [ 10,  70, 230, 255]
	 * 
	 * @param {type} input
	 * @param {type} o
	 * @returns {unresolved}
	 */
	
	rampColors: {
		name: "Color ramp",
		callback: function(input, o) {
			if (typeof o.clrMin === 'string') {
				o.clrMin = o.clrMin.split(',');
			}
			if (typeof o.clrMax === 'string') {
				o.clrMax = o.clrMax.split(',');
			}
			const m = (input[o.band] - o.valMin) / (o.valMax - o.valMin);
			return o.clrMin.map((elMin, i) => m * o.clrMax[i] + (1 - m) * elMin);
		},
		arguments: {
			band: {
				description: 'The band to use',
				defaultValue: 0
			},
			valMin: {
				description: 'Minimum value of the band',
				defaultValue: 0
			},
			valMax: {
				description: 'Maximum value of the band',
				defaultValue: 255
			},
			clrMin: {
				description: 'Color for the minimum value',
				defaultValue: [240, 220, 150, 255]
			},
			clrMax: {
				description: 'Color for the maximum value',
				defaultValue: [ 10,  70, 230, 255]
			}
		}
	}

};

OpenEO.Editor.init();