// CODE TO GENERATE PROCESS GRAPH
test('Process graph builder Zonal', (done) => {

	const { ProcessGraphBuilder } = require('../openeo-builder.js');

	var b = new ProcessGraphBuilder();
	var datacube = b.process("load_collection", {id: "Sentinel-2"});
	datacube = b.process("filter_bbox", {data: datacube, extent: {
		west: 16.1,
		east: 16.6,
		north: 48.6,
		south: 47.2
	}});
	datacube = b.process("filter_temporal", {data: datacube, start: "2017-01-01", end: "2017-02-01"});
	datacube = b.process("filter_bands", {data: datacube, bands: ["B8"]});
	datacube = b.process("reduce", {data: datacube, dimension: "spectral"});
	var geojson = {"type":"Polygon","coordinates":[[[16.138916,48.320647],[16.524124,48.320647],[16.524124,48.1386],[16.138916,48.1386],[16.138916,48.320647]]]};
	var zonal = b.process("aggregate_polygon", {
		data: datacube,
		polygons: geojson,
		reducer: (builder, params) => builder.process("mean", {data: params.data})
	});
	var result = b.process("export", {data: zonal, format: 'JSON'});
	var createdProcessGraph = b.generate(result);

	var expectedProcessGraph = require('./data/builder.zonal.example.json');
	expect(createdProcessGraph).toEqual(expectedProcessGraph);
	done();
});