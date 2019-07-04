// CODE TO GENERATE PROCESS GRAPH
test('Process graph builder Sample', () => {

	const { ProcessGraphBuilder } = require('../openeo-builder.js');

	var b = new ProcessGraphBuilder();
	var collection = b.process("load_collection", {id: "Sentinel-2"});
	// filter_temporal
	var dateFilter1 = b.process("filter_temporal", {data: collection, from: "2017-01-01", to: "2017-01-31"});
	var dateFilter2 = b.process("filter_temporal", {data: collection, from: "2018-01-01", to: "2018-01-31"});
	var merge = b.process("merge_collections", {data1: dateFilter1, data2: dateFilter2});
	b.process("export", {data: merge, format: 'png'});
	// minimum time
	var minTime = b.process("reduce", {
		data: merge,
		dimension: "temporal",
		reducer: (builder, params) => builder.process("min", {data: params.dimension_data, dimension: params.dimension})
	});
	var bandFilter = b.process("filter_bands", {data: minTime, bands: ["nir", "red"]});
	// NDVI (manually)
	var ndvi = b.process("reduce", {
		data: bandFilter,
		dimension: "spectral",
		reducer: (builder, params) => {
			var result = builder.process("divide", {
				x: builder.process("substract", {data: params.dimension_data}),
				y: builder.process("sum", {data: params.dimension_data})
			});
			builder.process('output', {data: result});
			return result;
		}
	});
	var result = b.process("export", {data: ndvi, format: 'png'});

	var createdProcessGraph = b.generate(result);
	var expectedProcessGraph = require('./data/builder.sample.example.json');
	expect(createdProcessGraph).toEqual(expectedProcessGraph);
});