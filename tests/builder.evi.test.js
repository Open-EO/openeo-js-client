// @ts-nocheck
describe('Process Graph Builder (EVI)', () => {

	const { TESTBACKEND } = require('./config.js');
	const FROM_URL = TESTBACKEND + '/v1/processes';

	const { OpenEO, Connection, Builder, Parameter, Formula } = require('../src/openeo');

	var con;
	test('Connect', async () => {
		con = await OpenEO.connect(TESTBACKEND);
		expect(con instanceof Connection).toBeTruthy();
	});

	test('Processes', async () => {
		var procs = await con.listProcesses();
		expect(Array.isArray(procs.processes)).toBeTruthy();
		var ids = procs.processes.map(x => x.id);
		expect(ids).toContain('load_collection');
		expect(ids).toContain('reduce_dimension');
		expect(ids).toContain('save_result');
		expect(ids).toContain('min');
		expect(ids).toContain('divide');
		expect(ids).toContain('multiply');
		expect(ids).toContain('sum');
		expect(ids).toContain('subtract');
		expect(ids).toContain('array_element');
	});

	const expectedProcessEvi = require('./data/builder.evi.example.json');
	test('Builder', async () => {
		var builder = await con.buildProcess("evi");
		build(builder);
	});
	
	test('Builder with Math', async () => {
		var builder = await con.buildProcess("evi");
		build(builder, true);
	});

	test('Builder from URL', async () => {
		var builder = await Builder.fromURL(FROM_URL);
		builder.id = "evi";
		build(builder);
	});

	test('Builder for an openEO processes version', async () => {
		var builder = await Builder.fromVersion('1.0.0');
		builder.id = "evi";
		build(builder);
	});

	function build(builder, math = false) {
		expect(builder instanceof Builder).toBeTruthy();

		var datacube = builder.load_collection(
			new Parameter("collection-id", "string", "The ID of the collection to load"),
			{
				"west": 16.1,
				"east": 16.6,
				"north": 48.6,
				"south": 47.2
			},
			["2018-01-01", "2018-02-01"],
			["B02", "B04", "B08"]
		);
		var eviAlgorithm;
		var expectedProcess;
		if (math) {
			expectedProcess = require('./data/builder.math.evi.example.json');
			eviAlgorithm = new Formula('2.5 * (($B08 - $B04) / ($$offset + $B08 + 6 * $B04 + -7.5 * $B02))');
		}
		else {
			expectedProcess = expectedProcessEvi;
			eviAlgorithm = function(data, context) {
				var nir = data["B08"];
				var red = data["B04"];
				var blue = data["B02"];
				var blue2 = data["B02"]; // Not needed for the algorithm, but tests whether multiple calls don't result in multiple array_element nodes.
				return this.multiply(
					2.5,
					this.divide(
						this.subtract(nir, red),
						this.sum([
							context["offset"],
							nir,
							this.multiply(6, red),
							this.multiply(-7.5, blue)
						])
					)
				);
			};
		}
		var evi = builder.reduce_dimension(datacube, eviAlgorithm, "bands", {offset: 1}).description("Compute the EVI. Formula: 2.5 * (NIR - RED) / ($offset + NIR + 6*RED + -7.5*BLUE)");

		var minTime = builder.reduce_dimension(
			evi,
			function(data) {
				return this.min(data);
			},
			"t"
		);
		var saved = builder.save_result(minTime, "PNG");
		saved.result = true;
		let pg = builder.toJSON();
		expect(Object.keys(pg.process_graph)).toEqual(Object.keys(expectedProcess.process_graph));
		expect(pg).toEqual(expectedProcess);
	}
});