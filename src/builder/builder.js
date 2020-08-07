const Node = require('./node');

module.exports = class Builder {

	constructor(processes, parent = null, id = undefined) {
		this.parent = parent;
		this.processes = processes;
		this.nodes = {};
		this.idCounter = {};

		this.id = id;

		for(let process of this.processes) {
			this[process.id] = function() {
				// Don't use arrow functions, they don't support the arguments keyword.
				return this.process(process.id, [...arguments]);
			};
		}
	}

	addParameter(parameter, root = true) {
		let builder = this;
		if (root) {
			while(builder.parent) {
				builder = builder.parent;
			}
		}
		if (!Array.isArray(builder.parameters)) {
			builder.parameters = [];
		}
		let existing = builder.parameters.findIndex(p => p.name === parameter.name);
		if (existing !== -1) {
			Object.assign(builder.parameters[existing], parameter); // Merge
		}
		else {
			builder.parameters.push(parameter); // Add
		}
	}

	spec(id) {
		return this.processes.find(process => process.id === id);
	}

	process(processId, args = {}, description = null) {
		var node = new Node(this, processId, args, description);
		this.nodes[node.id] = node;
		return node;
	}

	toJSON() {
		let process = {
			id: this.id,
			summary: this.summary,
			description: this.description,
			categories: this.categories,
			parameters: this.parameters,
			returns: this.returns,
			deprecated: this.deprecated,
			experimental: this.experimental,
			exceptions: this.exceptions,
			examples: this.examples,
			links: this.links,
			process_graph: {}
		};
		for(let id in this.nodes) {
			process.process_graph[id] = this.nodes[id].toJSON();
		}
		for(let key in process) {
			if (typeof process[key] === 'undefined') {
				delete process[key];
			}
		}
		return process;
	}
	
	generateId(name) {
		name = name.replace("_", "").substr(0, 6);
		if (!this.idCounter[name]) {
			this.idCounter[name] = 1;
		}
		else {
			this.idCounter[name]++;
		}
		return name + this.idCounter[name];
	}

}