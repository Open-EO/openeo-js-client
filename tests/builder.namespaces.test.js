// @ts-nocheck
describe('Process Graph Builder (EVI)', () => {

	const { Builder, Formula } = require('../src/client');

	test('Namespaces processes in builder', async () => {
		const builder = await Builder.fromVersion('1.1.0');	

		// Add namespaced processes
		builder.addProcessSpec({id: 'msi'}, "vito");
		builder.addProcessSpec({id: 'ndvi'}, "@m.mohr");

		// Create process (graph)
		builder.process("msi@vito");
		builder.process("ndvi@@m.mohr");

		let pg = builder.toJSON();

		// Check result
		expect(pg).toEqual({
			"process_graph": {
				"msi1": {
					process_id: 'msi',
					namespace: 'vito',
					arguments: {}
				},
				"ndvi1": {
					process_id: 'ndvi',
					namespace: '@m.mohr',
					arguments: {}
				}
			}
		});

	});
	test('Namespaces processes in Formula', async () => {
		const builder = await Builder.fromVersion('1.1.0');	

		builder.addProcessSpec({
			"id": "hello_world",
			"parameters": [],
			"returns": {
				"description": "The numerical value of Pi.",
				"schema": {
					"type": "number"
				}
			}
		}, "a-b");

		builder.math("hello_world@a-b() + 1");

		let pg = builder.toJSON();

		// Check result
		expect(pg).toEqual({
			process_graph: {
				hellow1: {
					process_id: 'hello_world',
					namespace: 'a-b',
					arguments: {}
				},
				add1: {
					process_id: 'add',
					arguments: {
						x: {
							from_node: "hellow1"
						},
						y: 1
					}
				}
			}
		});

	});
});