// @ts-nocheck
describe('Process Graph Builder (load_collection properties)', () => {

	const { Builder } = require('../src/openeo');
	const expectedProcess = require('./data/builder.load_collection.example.json');

	// Minimal process specifications so that the Builder can be used
	// without connecting to a back-end or loading the processes from a server.
	const processes = [
		{
			"id": "load_collection",
			"summary": "Load a collection",
			"description": "Loads a collection from the current back-end by its id and returns it as processable data cube.",
			"categories": ["cubes", "import"],
			"parameters": [
				{
					"name": "id",
					"description": "The collection id.",
					"schema": {
						"type": "string",
						"subtype": "collection-id",
						"pattern": "^[\\w\\-\\.~/]+$"
					}
				},
				{
					"name": "spatial_extent",
					"description": "Limits the data to load from the collection to the specified bounding box or polygons.",
					"schema": [
						{
							"title": "Bounding Box",
							"type": "object",
							"subtype": "bounding-box",
							"required": ["west", "south", "east", "north"],
							"properties": {
								"west": {"description": "West (lower left corner, coordinate axis 1).", "type": "number"},
								"south": {"description": "South (lower left corner, coordinate axis 2).", "type": "number"},
								"east": {"description": "East (upper right corner, coordinate axis 1).", "type": "number"},
								"north": {"description": "North (upper right corner, coordinate axis 2).", "type": "number"}
							}
						},
						{
							"title": "GeoJSON",
							"type": "object",
							"subtype": "geojson"
						},
						{
							"title": "No filter",
							"description": "Don't filter spatially. All data is included in the data cube.",
							"type": "null"
						}
					]
				},
				{
					"name": "temporal_extent",
					"description": "Limits the data to load from the collection to the specified left-closed temporal interval.",
					"schema": [
						{
							"type": "array",
							"subtype": "temporal-interval",
							"minItems": 2,
							"maxItems": 2,
							"items": {
								"anyOf": [
									{"type": "string", "format": "date-time", "subtype": "date-time"},
									{"type": "string", "format": "date", "subtype": "date"},
									{"type": "string", "subtype": "year", "minLength": 4, "maxLength": 4, "pattern": "^\\d{4}$"},
									{"type": "null"}
								]
							}
						},
						{
							"title": "No filter",
							"description": "Don't filter temporally. All data is included in the data cube.",
							"type": "null"
						}
					]
				},
				{
					"name": "bands",
					"description": "Only adds the specified bands into the data cube.",
					"schema": [
						{"type": "array", "items": {"type": "string", "subtype": "band-name"}},
						{"title": "No filter", "description": "Don't filter bands. All bands are included in the data cube.", "type": "null"}
					],
					"default": null,
					"optional": true
				},
				{
					"name": "properties",
					"description": "Limits the data by metadata properties to include only data in the data cube which all given conditions return `true` for (AND operation).",
					"schema": [
						{
							"type": "object",
							"subtype": "metadata-filter",
							"title": "Filters",
							"description": "A list of filters to check against.",
							"additionalProperties": {
								"type": "object",
								"subtype": "process-graph",
								"parameters": [
									{
										"name": "value",
										"description": "The property value to be checked against.",
										"schema": {"description": "Any data type is allowed."}
									}
								]
							}
						},
						{
							"title": "No filter",
							"description": "Don't filter by metadata properties.",
							"type": "null"
						}
					],
					"default": null,
					"optional": true
				}
			],
			"returns": {
				"description": "A data cube for further processing.",
				"schema": {"type": "object", "subtype": "raster-cube"}
			}
		},
		{
			"id": "lt",
			"summary": "Less than comparison",
			"description": "Compares whether `x` is strictly less than `y`.",
			"categories": ["comparison"],
			"parameters": [
				{"name": "x", "description": "First operand.", "schema": {"description": "Any data type is allowed."}},
				{"name": "y", "description": "Second operand.", "schema": {"description": "Any data type is allowed."}}
			],
			"returns": {
				"description": "`true` if `x` is strictly less than `y`, `null` if any operand is `null`, otherwise `false`.",
				"schema": {"type": ["boolean", "null"]}
			}
		},
		{
			"id": "eq",
			"summary": "Equal comparison",
			"description": "Compares whether `x` and `y` are strictly equal.",
			"categories": ["comparison"],
			"parameters": [
				{"name": "x", "description": "First operand.", "schema": {"description": "Any data type is allowed."}},
				{"name": "y", "description": "Second operand.", "schema": {"description": "Any data type is allowed."}},
				{"name": "case_sensitive", "description": "Specifies whether the comparison should be case-sensitive.", "schema": {"type": "boolean"}, "default": true, "optional": true}
			],
			"returns": {
				"description": "`true` if `x` is strictly equal to `y`, `null` if any operand is `null`, otherwise `false`.",
				"schema": {"type": ["boolean", "null"]}
			}
		},
		{
			"id": "between",
			"summary": "Between",
			"description": "By default, checks whether `x` is greater than or equal to `min` and less than or equal to `max`.",
			"categories": ["comparison"],
			"parameters": [
				{"name": "x", "description": "The value to check.", "schema": {"description": "Any data type is allowed."}},
				{"name": "min", "description": "The lower bound.", "schema": {"description": "Any data type is allowed."}},
				{"name": "max", "description": "The upper bound.", "schema": {"description": "Any data type is allowed."}},
				{"name": "exclude_max", "description": "Specifies whether the maximum is excluded.", "schema": {"type": "boolean"}, "default": false, "optional": true}
			],
			"returns": {
				"description": "`true` if `x` is within the range, `null` if `x` is `null`, otherwise `false`.",
				"schema": {"type": ["boolean", "null"]}
			}
		}
	];

	test('Supports load_collection', () => {
		// Create builder from the local process specifications (no network required)
		var builder = new Builder(processes);
		expect(builder instanceof Builder).toBeTruthy();
		expect(builder.supports('load_collection')).toBeTruthy();
	});

	test('Filter by product title and cloud cover', () => {
		var builder = new Builder(processes);
		// Filter by product title and cloud cover percentage, as documented
		// in the Builder class for issue #59
		var cc = function(value) {
			return this.lt(value, 25);
		};
		var title = function(value) {
			return this.eq(value, "S2A_MSIL2A_20180101T103431_N0500_R108_T32UQD_20230406T140228");
		};
		var datacube = builder.load_collection(
			"SENTINEL2_L2A",
			{west: 16.1, east: 16.6, north: 48.6, south: 47.2},
			["2018-01-01", "2018-02-01"],
			["B02", "B04", "B08"],
			{"title": title, "eo:cloud_cover": cc}
		);
		datacube.result = true;

		// Check result
		expect(builder.toJSON()).toEqual(expectedProcess);
	});

	test('Filter by cloud cover range', () => {
		var builder = new Builder(processes);
		// Filter by cloud cover between 0% and 25% (inclusive)
		var cc = function(value) {
			return this.between(value, 0, 25);
		};
		var datacube = builder.load_collection(
			"SENTINEL2_L2A",
			null,
			["2018-01-01", "2018-02-01"],
			null,
			{"eo:cloud_cover": cc}
		);
		datacube.result = true;

		// Check result
		let pg = builder.toJSON();
		expect(pg.process_graph.loadco1.arguments.properties).toEqual({
			"eo:cloud_cover": {
				"process_graph": {
					"betwee1": {
						"process_id": "between",
						"arguments": {
							"x": {"from_parameter": "value"},
							"min": 0,
							"max": 25
						},
						"result": true
					}
				}
			}
		});
	});

	test('Filter by item ID (UUID)', () => {
		var builder = new Builder(processes);
		// Filter by the unique ID of an item, which is often a UUID
		var id = function(value) {
			return this.eq(value, "7b8f2e44-2f6d-4c1a-9e3b-5d6a7b8c9d0e");
		};
		var datacube = builder.load_collection(
			"SENTINEL2_L2A",
			null,
			null,
			null,
			{"id": id}
		);
		datacube.result = true;

		// Check result
		let pg = builder.toJSON();
		expect(pg.process_graph.loadco1.arguments.properties).toEqual({
			"id": {
				"process_graph": {
					"eq1": {
						"process_id": "eq",
						"arguments": {
							"x": {"from_parameter": "value"},
							"y": "7b8f2e44-2f6d-4c1a-9e3b-5d6a7b8c9d0e"
						},
						"result": true
					}
				}
			}
		});
	});

});
