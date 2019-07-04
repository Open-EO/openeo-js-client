// CODE TO GENERATE PROCESS GRAPH
test('Process graph builder EVI', () => {

	const { ProcessGraphBuilder } = require('../openeo-builder.js');

	var b = new ProcessGraphBuilder();
	var datacube = b.process("load_collection", {id: "Sentinel-2"});
	datacube = b.process("filter_bbox", {data: datacube, extent: {
		west: 16.1,
		east: 16.6,
		north: 48.6,
		south: 47.2
	}});
	datacube = b.process("filter_temporal", {data: datacube, start: "2018-01-01", end: "2018-02-01"});
	datacube = b.process("filter_bands", {data: datacube, bands: ["B08", "B04", "B02"]});
	var evi = b.process("reduce", {
		data: datacube,
		dimension: "spectral",
		reducer: (builder, params) => {
			var nir = builder.process("array_element", {data: params.data, index: 0});
			var red = builder.process("array_element", {data: params.data, index: 1});
			var blue = builder.process("array_element", {data: params.data, index: 2});
			return builder.process("product", {
				data: [
					2.5,
					builder.process("divide", {
						data: [
							builder.process("substract", {data: [nir, red]}),
							builder.process("sum", {
								data: [
									1, 
									nir,
									builder.process("product", {
										data: [6, red]
									}),
									builder.process("product", {
										data: [-7.5, blue]
									})
								]
							})
						]
					})
				]
			});
		}
	});
	var minTime = b.process("reduce", {
		data: evi,
		dimension: "temporal",
		reducer: (builder, params) => builder.process("min", {data: params.data})
	});
	var result = b.process("export", {data: minTime, format: 'GTiff'});

	var createdProcessGraph = b.generate(result);
	var expectedProcessGraph = require('./data/builder.evi.example.json');
	expect(createdProcessGraph).toEqual(expectedProcessGraph);
});