// @ts-nocheck
describe('Process Graph Builder (array_create)', () => {

	const { Builder } = require('../src/openeo');
	const expectedProcess = require('./data/builder.array_create.example.json');
	const array_create = {
		"id": "array_create",
		"description": "Creates a new array, which by default is empty.\n\nThe second parameter `repeat` allows to add the given array multiple times to the new array.\n\nIn most cases you can simply pass a (native) array to processes directly, but this process is especially useful to create a new array that is getting returned by a child process, for example in ``apply_dimension()``.",
		"parameters": [
			{
				"name": "data",
				"description": "A (native) array to fill the newly created array with. Defaults to an empty array.",
				"optional": true,
				"default": [],
				"schema": {
					"description": "Any data type is allowed."
				}
			},
			{
				"name": "repeat",
				"description": "The number of times the (native) array specified in `data` is repeatedly added after each other to the new array being created. Defaults to `1`.",
				"optional": true,
				"default": 1,
				"schema": {
					"type": "integer",
					"minimum": 1
				}
			}
		],
		"returns": {
			"description": "The newly created array.",
			"schema": {
				"type": "array",
				"items": {
					"description": "Any data type is allowed."
				}
			}
		}
	};

	var builder;
	test('Add array_create to builder', async () => {
		// Create builder
		builder = await Builder.fromVersion('1.0.0');	
		expect(builder instanceof Builder).toBeTruthy();

		// Add missing process array_create
		builder.addProcessSpec(array_create);
		// Check that process is supported now
		expect(builder.supports('array_create')).toBeTruthy();
		// Check that process has been added correctly
		expect(builder.spec('array_create')).toEqual(array_create);

	});

	test('Implicit array_create in callbacks', () => {
		// Create process (graph)
		var datacube = builder.load_collection("EXAMPLE", null, null);
	
		var process = function(data) {
			return [data[0], 1];
		};
		var result = builder.apply_dimension(datacube, process, "bands");
		result.result = true;

		let pg = builder.toJSON();

		// Check result
		expect(pg).toEqual(expectedProcess);

	});

});