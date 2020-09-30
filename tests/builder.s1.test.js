// @ts-nocheck
describe('Process Graph Builder (S1)', () => {

	const { Builder, Formula } = require('../src/openeo');
	const expectedProcess = require('./data/builder.s1.example.json');

	test('S1 with callback', async () => build(false));
	test('S1 with Formula', async () => build(true));

	async function build(useFormula) {
		// Create builder
		var builder = await Builder.fromVersion('1.0.0');	
		expect(builder instanceof Builder).toBeTruthy();

		// We are now loading the Sentinel-1 data over the Area of Interest
		var datacube = builder.load_collection(
			"COPERNICUS/S1_GRD",
			{west: 16.06, south: 48.06, east: 16.65, north: 48.35},
			[new Date(Date.UTC(2017, 2, 1)), new Date(Date.UTC(2017, 5, 1))], // Check whether date objects are converted
			["VV"]
		);
	
		// Since we are creating a monthly RGB composite, we need three separated time ranges (March aas R, April as G and May as G).
		// Therefore, we split the datacube into three datacubes using a temporal filter.
		var march = builder.filter_temporal(datacube, ["2017-03-01", "2017-04-01"]);
		var april = builder.filter_temporal(datacube, ["2017-04-01", "2017-05-01"]);
		var may = builder.filter_temporal(datacube, ["2017-05-01", "2017-06-01"]);
	
		// We aggregate the timeseries values into a single image by reducing the time dimension using a mean reducer.
		var mean = function(data) {
			return this.mean(data);
		};
		march = builder.reduce_dimension(march, mean, "t");
		april = builder.reduce_dimension(april, mean, "t");
		may = builder.reduce_dimension(may, mean, "t");
	
		// Now the three images will be combined into the temporal composite.
		// We rename the bands to R, G and B as otherwise the bands are overlapping and the merge process would fail.
		march = builder.rename_labels(march, "bands", ["R"], ["VV"]);
		april = builder.rename_labels(april, "bands", ["G"], ["VV"]);
		may = builder.rename_labels(may, "bands", ["B"], ["VV"]);
	
		datacube = builder.merge_cubes(march, april);
		datacube = builder.merge_cubes(datacube, may);

		// To make the values match the RGB values from 0 to 255 in a PNG file, we need to scale them.
		// We can simplify expressing math formulas using the openEO Formula parser.
		let scale;
		if (useFormula) {
			scale = new Formula("linear_scale_range(x, -20, -5, 0, 255)");
		}
		else {
			scale = function(x) {
				return this.linear_scale_range(x, -20, -5, 0, 255);
			};
		}
		datacube = builder.apply(datacube, scale);
	
		// Finally, save the result as PNG file.
		// In the options we specify which band should be used for "red", "green" and "blue" color.
		datacube = builder.save_result(datacube, "PNG", {
			red: "R",
			green: "G",
			blue: "B"
		});

		datacube.result = true;

		let pg = builder.toJSON();
		expect(pg).toEqual(expectedProcess);
	}

});