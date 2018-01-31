require('./node_modules/codemirror/lib/codemirror.css');
require('./node_modules/codemirror/addon/hint/show-hint.css');
require('./node_modules/leaflet/dist/leaflet.css');
require('./main.css');

require('./node_modules/codemirror/addon/hint/show-hint.js');
require('./node_modules/codemirror/addon/hint/javascript-hint.js');
require('./node_modules/codemirror/mode/javascript/javascript.js');
var L = require('leaflet');
var CodeMirror = require('codemirror');
var OpenEOClient = require('../openeo.js');

let evalScipt;

OpenEOClient.API.baseUrl = 'http://localhost:8080/';
OpenEOClient.API.driver = 'openeo-sentinelhub-driver';

OpenEOClient.Data.get().then(discoverData);
OpenEOClient.Processes.get().then(discoverProcesses);

document.getElementById('setServer').addEventListener('click', setServer);

function setServer() {
	var server = prompt("URL of the OpenEO compatible server to query", OpenEOClient.API.baseUrl);
	if (server && server != OpenEOClient.API.baseUrl) {
		alert("Changing servers on the fly not implemented yet.\r\n" + server);
	}
}

function discoverData(data) {
	var dataSelect = document.getElementById('data');
	for (var i in data) {
		makeOption(dataSelect, data[i].product_id, data[i].description);
	}
	document.getElementById('insertData').addEventListener('click', insertToEditor);
}

function discoverProcesses(data) {
	var processSelect = document.getElementById('processes');
	for (var i in data) {
		makeOption(processSelect, data[i].process_id, data[i].description);
	}
	document.getElementById('insertProcesses').addEventListener('click', insertToEditor);
}

function makeOption(select, name, description) {
	var option = document.createElement("option");
	var text = document.createTextNode(name);
	option.appendChild(text);
	option.value = name;
	option.title = description;
	select.appendChild(option);
}

function insertToEditor(evt) {
	var select = null;
	if (evt.target.id === 'insertData') {
		select = document.getElementById('data');
	}
	else if (evt.target.id === 'insertProcesses') {
		select = document.getElementById('processes');
	}
	if (select) {
		processingScript.replaceSelection(select.value);
	}
}

function recolor(tile) {
	if (!tile.originalImage) {
		return;
	}
	const ctx = tile.getContext('2d');
	const tgtData = ctx.getImageData(0, 0, tile.width, tile.height);

	const esFun = eval('(function(input) {' + evalScipt + '})');
	for (var i = 0; i < tgtData.data.length; i += 4) {
		const input = tile.originalImage.data.slice(i, i + 4);
		const es = esFun(input);
		tgtData.data.set(es, i);
	}
	ctx.putImageData(tgtData, 0, 0);
}

var map = new L.Map('map', {center: [45, 15], zoom: 8});

var tiles = L.tileLayer.wms(
	'http://localhost:8080/download/placeholder/wcs',
	{
		request: 'GetCoverage',
		service: 'WCS',
		coverage: 'CUSTOM',
		format: 'image/jpeg',
		tileSize: 256,
		minZoom: 8
	}
);

function recolorTiles() {
	tiles.recolor();
}

tiles.recolor = function () {
	for (var key in this._tiles) {
		var tile = this._tiles[key];
		recolor(tile.el);
	}
};

tiles.createTile = function (coords) {
	const tile = L.DomUtil.create('canvas', 'leaflet-tile');
	tile.width = tile.height = this.options.tileSize;

	const imageObj = new Image();
	imageObj.crossOrigin = '';
	imageObj.onload = function () {
		const ctx = tile.getContext('2d');
		ctx.drawImage(imageObj, 0, 0);

		tile.originalImage = ctx.getImageData(0, 0, tile.width, tile.height);
		recolor(tile);
	};
	imageObj.src = this.getTileUrl(coords);
	return tile;
};

L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: 'Map data &copy; <a href="http://www.osm.org">OpenStreetMap</a>'
}).addTo(map);

tiles.addTo(map);

document.getElementById('runProsScript').addEventListener('click', runProsScript);
document.getElementById('runVisScript').addEventListener('click', runVisScript);

var editorOptions = {
	value: '',
	mode: 'javascript',
	indentUnit: 4,
	lineNumbers: true,
	extraKeys: {
		"Ctrl-Space": "autocomplete"
	}
};

editorOptions.value = `return OpenEOClient.ImageCollection.create('Sentinel2A-L1C')
    .filter_daterange("2018-01-01","2018-01-31")
    .NDI(3,8)
    .max_time();`;
const processingScript = CodeMirror(document.getElementById('proseditor'), editorOptions);

editorOptions.value = `function ramp2colors(val, min, max) {
    const clrMin = [240, 220, 150, 255];
    const clrMax = [ 10,  70, 230, 255];
    const m = (val-min)/(max-min);

    return clrMin.map((elMin, i) => m * clrMax[i] + (1 - m) * elMin);
}
  
return ramp2colors(input[0], 0, 255)`;
const visualisationScript = CodeMirror(document.getElementById('viseditor'), editorOptions);


function parseScript(script) {
	return eval('( () => {' + script + '})()');
}

function runProsScript() {
	const scriptArea = document.getElementById('firstTextArea');
	const graph = parseScript(processingScript.getValue());
	OpenEOClient.Jobs.create(graph)
		.then(data => {
			tiles.setUrl(OpenEOClient.Jobs.getWcsPath(data.job_id), false);
		}).catch(errorCode => {
			alert('Sorry, could not create an OpenEO job. (' + errorCode + ')');
		});
}

function runVisScript() {
	const scriptArea = document.getElementById('firstTextArea');
	evalScipt = visualisationScript.getValue();
	recolorTiles();
}
