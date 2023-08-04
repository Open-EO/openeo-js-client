const Utils = require('@openeo/js-commons/src/utils');

class PgParser {

  constructor(process, baseUrl) {
    this.process = process;
    this.url = baseUrl;
  }

  parse(process = null) {
    if (process === null) {
      process = Utils.deepClone(this.process);
    }

    for(const key in process.process_graph) {
      const node = process.process_graph[key];
      node.arguments = this.parseArgs(node.arguments, process.process_graph);
    }

    const resultNode = Object.values(process.process_graph)
      .find(node => node.result);
    return this.toOgcProcess(resultNode);
  }

  toOgcProcess(node) {
    // Get output parameters from arguments
    // @todo This is just a workaround for now
    let outputs;
    for(let key in node.arguments) {
      if (key.startsWith('output:')) {
        const mediaType = node.arguments[key];
        delete node.arguments[key];
        if (node.result) {
          if (!outputs) {
            outputs = {};
          }
          let name = key.substring(7);
          outputs[name] = {
            format: { mediaType }
          };
        }
      }
    }
    
    return {
      "process": `${this.url}/processes/${node.process_id}`,
      inputs: node.arguments,
      outputs
    }
  }

  parseArgs(args, graph) {
    for(let key in args) {
      args[key] = this.parseDeep(args[key], args, graph);
    }
    return args;
  }

  parseDeep(value, parent, graph) {
    const isObject = Utils.isObject(value);
    if (isObject && typeof value.from_node === 'string') {
      const refNode = graph[value.from_node];
      if (refNode.process_id === 'load_collection') {
        const c = refNode.arguments;
        const url = new URL(`${this.url}/collections/${c.id}/coverage`);
        if (Utils.isObject(c.spatial_extent) && typeof c.spatial_extent.west !== 'undefined') {
          const bbox = c.spatial_extent;
          const subset = `Lat(${bbox.south}:${bbox.north}),Lon(${bbox.west}:${bbox.east})`;
          url.searchParams.append('subset', subset);
        }
        value = {
          href: url.toString() 
        };
        // @todo: Just needed for GNOSIS?
        if (!Array.isArray(parent)) {
          value = [value];
        }
      }
      else {
        value = this.toOgcProcess(graph[value.from_node]);
      }
    }
    else if (isObject && Utils.isObject(value.process_graph)) {
      value = this.parse(value);
    }
    else if (isObject || Array.isArray(value)) {
      for(let key in value) {
        value[key] = this.parseDeep(value[key], value, graph);
      }
    }
    return value;
  }

}

module.exports = PgParser;