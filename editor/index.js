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
	
let evalScript;

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
	
	processEditor: null,
	visualizationEditor: null,
	
	init: function() {
		OpenEO.API.baseUrl = 'http://localhost:8080/';
		OpenEO.API.driver = 'openeo-sentinelhub-driver';

		OpenEO.Data.get().then(this.setDiscoveredData);
		OpenEO.Processes.get().then(this.setDiscoveredProcesses);

		document.getElementById('setServer').addEventListener('click', this.setServer);
		document.getElementById('runProcessScript').addEventListener('click', this._runProcessScript);
		document.getElementById('runVisScript').addEventListener('click', this._runVisualizationScript);

		this.initProcessEditor();
		this.initVisualizationEditor();
		
		this.Map.init();
	},
	
	initProcessEditor: function() {
		var options = Object.create(this.DefaultEditorOptions);
		options.value = `return OpenEO.ImageCollection.create('Sentinel2A-L1C')
	.filter_daterange("2018-01-01","2018-01-31")
	.NDI(3,8)
	.max_time();`;
		this.processEditor = CodeMirror(document.getElementById('processEditor'), options);
	},
	
	initVisualizationEditor: function() {
		var options = Object.create(this.DefaultEditorOptions);
		options.value = `function ramp2colors(val, min, max) {
	const clrMin = [240, 220, 150, 255];
	const clrMax = [ 10,  70, 230, 255];
	const m = (val-min)/(max-min);

	return clrMin.map((elMin, i) => m * clrMax[i] + (1 - m) * elMin);
}

return ramp2colors(input[0], 0, 255);`;
		this.visualizationEditor = CodeMirror(document.getElementById('visEditor'), options);
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
	
	parseScript: function(script) {
		return eval('( () => {' + script + '})()');
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
			OpenEO.Editor.processEditor.replaceSelection(select.value);
		}
	},

	_runProcessScript: function () {
		const graph = OpenEO.Editor.parseScript(OpenEO.Editor.processEditor.getValue());
		OpenEO.Jobs.create(graph)
			.then(data => {
				OpenEO.Editor.Map.tiles.setUrl(OpenEO.Jobs.getWcsPath(data.job_id), false);
			}).catch(errorCode => {
				alert('Sorry, could not create an OpenEO job. (' + errorCode + ')');
			});
	},

	_runVisualizationScript: function () {
		evalScript = OpenEO.Editor.visualizationEditor.getValue();
		OpenEO.Editor.Map.recolorTiles();
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
		if (!tile.originalImage || !evalScript) {
			return;
		}
		const ctx = tile.getContext('2d');
		const tgtData = ctx.getImageData(0, 0, tile.width, tile.height);

		const esFun = eval('(function(input) {' + evalScript + '})');
		for (var i = 0; i < tgtData.data.length; i += 4) {
			const input = tile.originalImage.data.slice(i, i + 4);
			const es = esFun(input);
			tgtData.data.set(es, i);
		}
		ctx.putImageData(tgtData, 0, 0);
	},

	recolorTiles: function() {
		OpenEO.Editor.Map.tiles.recolor();
	}

};

OpenEO.Editor.init();