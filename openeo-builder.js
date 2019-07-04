class ProcessGraphNode {

	constructor(parent, process_id, args) {
		this.node_id = parent.generate_id(process_id);
		this.process_id = process_id;
		this.arguments = args;
	}

	id() {
		return this.node_id;
	}

}

class CallbackParameter {

	constructor(name) {
		this.name = name;
	}

	getName() {
		return this.name;
	}

}

class ProcessGraphBuilder {

	constructor() {
		this.processes = {};
		this.idCounter = {};
	}

	process(process_id, args = {}) {
		var node = new ProcessGraphNode(this, process_id, args);

		for(var key in args) {
			args[key] = this.translateArgument(node, args[key]);
		}

		this.processes[node.id()] = {
			process_id: process_id,
			arguments: args
		};
		return node;
	}

	translateArgument(node, arg) {
		if (typeof arg === 'function') {
			var callbackParams = this.getCallbackParameters(node);
			var callbackBuilder = new ProcessGraphBuilder();
			var resultNode = arg(callbackBuilder, callbackParams);
			arg = {
				callback: callbackBuilder.generate(resultNode) 
			};
		}
		else if (arg instanceof CallbackParameter) {
			arg = {
				from_argument: arg.getName()
			};
		}
		else if (arg instanceof ProcessGraphNode) {
			arg = {
				from_node: arg.id()
			};
		}
		else if (Array.isArray(arg)) {
			for (var i in arg) {
				arg[i] = this.translateArgument(node, arg[i]);
			}
		}
		return arg;
	}

	getCallbackParameters(node) {
		// Hard coded as process schema is not available here, but should be parsed from there.
		switch(node.process_id) {
			case 'filter':
				return {value: new CallbackParameter("value")};
			case 'apply_dimension':
			case 'aggregate_polygon':
			case 'aggregate_temporal':
				return {data: new CallbackParameter("data")};
			case 'reduce':
				if (node.arguments.binary === true) {
					return {
						x: new CallbackParameter("x"),
						y: new CallbackParameter("y")
					};
				}
				else {
					return {data: new CallbackParameter("data")};
				}
			case 'apply':
			case 'count':
				return {x: new CallbackParameter("x")};
			case 'load_collection':
				return {id: new CallbackParameter("id")};
			default:
			 return {};
		}
	}
	
	generate(process) {
		this.processes[process.id()].result = true;
		return this.processes;
	}
	
	generate_id(name) {
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


let toExport = {
	ProcessGraphBuilder: ProcessGraphBuilder
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = toExport;
}
else {
	if (typeof define === 'function' && define.amd) {
		define([], function () {
			return toExport;
		});
	}
	else {
		for (let exportObjName in toExport) {
			window[exportObjName] = toExport[exportObjName];
		}
	}
}
