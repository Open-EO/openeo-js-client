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
	
	init: function() {
		OpenEO.API.baseUrl = 'http://localhost:8080/';
		OpenEO.API.driver = 'openeo-sentinelhub-driver';

		OpenEO.Data.get().then(this.setDiscoveredData);
		OpenEO.Processes.get().then(this.setDiscoveredProcesses);

		document.getElementById('setServer').addEventListener('click', this.setServer);
		document.getElementById('runScript').addEventListener('click', this._runScript);

		this.initEnvironment();
		
		this.Map.init();
	},
	
	initEnvironment: function() {
		var options = Object.create(this.DefaultEditorOptions);
		options.value = `// Create the process graph
OpenEO.Editor.ProcessGraph = OpenEO.ImageCollection.create('Sentinel2A-L1C')
	.filter_daterange("2018-01-01","2018-01-31")
	.NDI(3,8)
	.max_time();

// Apply a custom visualization to the results
OpenEO.Editor.Visualization = {
	function: OpenEO.Visualizations.rampColors,
	args: {
		band: 0,
		valMin: 0,
		valMax: 255,
		clrMin: [240, 220, 150, 255],
		clrMax: [ 10,  70, 230, 255],
	}
};`;
		this.Environment = CodeMirror(document.getElementById('editor'), options);
	},
	
	setServer: function() {
		var server = prompt("URL of the OpenEO compatible server to query", OpenEO.API.baseUrl);
		if (server && server != OpenEO.API.baseUrl) {
			alert("Changing servers on the fly not implemented yet.\r\n" + server);
		}
	},
	
	setDiscoveredData: function(data) {
		var dataSelect = document.getElementById('data');
		for (var i in data) {
			OpenEO.Editor._makeOption(dataSelect, data[i].product_id, data[i].description);
		}
		document.getElementById('insertData').addEventListener('click', OpenEO.Editor._insertToEditor);
	},
	
	setDiscoveredProcesses: function(data) {
		var processSelect = document.getElementById('processes');
		for (var i in data) {
			OpenEO.Editor._makeOption(processSelect, data[i].process_id, data[i].description);
		}
		document.getElementById('insertProcesses').addEventListener('click', OpenEO.Editor._insertToEditor);
	},

	_makeOption: function(select, name, description) {
		var option = document.createElement("option");
		var text = document.createTextNode(name);
		option.appendChild(text);
		option.value = name;
		option.title = description;
		select.appendChild(option);
	},

	_insertToEditor: function(evt) {
		var select = null;
		if (evt.target.id === 'insertData') {
			select = document.getElementById('data');
		}
		else if (evt.target.id === 'insertProcesses') {
			select = document.getElementById('processes');
		}
		if (select) {
			OpenEO.Editor.Environment.replaceSelection(select.value);
		}
	},

	_runScript: function () {
		OpenEO.Editor.ProcessGraph = {};
		OpenEO.Editor.Visualization = null;
		OpenEO.Editor.script = OpenEO.Editor.Environment.getValue();
		eval(OpenEO.Editor.script);
		OpenEO.Jobs.create(OpenEO.Editor.ProcessGraph)
			.then(data => {
				OpenEO.Editor.Map.tiles.setUrl(OpenEO.Jobs.getWcsPath(data.job_id), false);
				OpenEO.Editor.Map.tiles.recolor();
			}).catch(errorCode => {
				alert('Sorry, could not create an OpenEO job. (' + errorCode + ')');
			});
		
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
		if (!tile.originalImage || !OpenEO.Editor.Visualization || typeof OpenEO.Editor.Visualization.function !== 'function') {
			return;
		}
		const ctx = tile.getContext('2d');
		const tgtData = ctx.getImageData(0, 0, tile.width, tile.height);
		
		var args = OpenEO.Editor.Visualization.args || {};

		for (var i = 0; i < tgtData.data.length; i += 4) {
			const input = tile.originalImage.data.slice(i, i + 4);
			const es = OpenEO.Editor.Visualization.function(input, args);
			tgtData.data.set(es, i);
		}
		ctx.putImageData(tgtData, 0, 0);
	}

};

OpenEO.Visualizations = {
	
	rampColors: function(input, o) {
		const m = (input[o.band] - o.valMin) / (o.valMax - o.valMin);
		return o.clrMin.map((elMin, i) => m * o.clrMax[i] + (1 - m) * elMin);
	}
	
};

OpenEO.Editor.init();