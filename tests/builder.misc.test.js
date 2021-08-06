// @ts-nocheck
describe('Process Graph Builder (S1)', () => {

	const { Builder, Parameter } = require('../src/openeo');
	test('No write access to array elements', async () => {
		var builder = await Builder.fromVersion('1.0.0');
		var mean = function(data) {
			data['B1'] = 1;
		};
		dc = builder.reduce_dimension(new Parameter('dc'), mean, "t");
		expect(() => builder.toJSON()).toThrow();
	});

});