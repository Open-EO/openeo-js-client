const Utils = require('../utils');
const StacMigrate = require('@radiantearth/stac-migrate');
const PgParser = require('./parser');

const JobStatusMap = {
  accepted: 'created',
  running: 'running',
  successful: 'finished',
  failed: 'error',
  dismissed: 'canceled'
};

/**
 * Migrate OGC API responses to openEO API responses.
 */
class OgcMigrate {

  /**
   * Migrations that potentially apply to all endpoints.
   * 
   * @param {AxiosResponse} response
   * @returns {AxiosResponse}
   */
  static all(response) {
    if (Array.isArray(response.data.links)) {
      response.data.links = Utils.makeLinksAbsolute(response.data.links, response);
    }
    return response;
  }

  /**
   * Migrates a collection.
   * 
   * @param {object} collection
   * @param {AxiosResponse} response
   * @returns {Collection}
   */
  static collection(collection, response) {
    if (collection.stac_version) {
      return collection;
    }
  
    // Make sure the required properties are present
    collection = StacMigrate.collection(collection);
    collection.ogcapi = true;
    // Make links absolute
    if (Array.isArray(collection.links)) {
      collection.links = Utils.makeLinksAbsolute(collection.links, response);
    }
    
    return collection;
  }

  /**
   * Migrates a process.
   * 
   * @param {object} process
   * @param {AxiosResponse} response
   * @returns {Process}
   */
  static process(process, response) {
    if (process.parameters || process.returns) {
      return process;
    }
  
    process.ogcapi = true;
    process.summary = process.title;
  
    process.parameters = [];
    for(let name in process.inputs) {
      let input = process.inputs[name];
      process.parameters.push({
        name,
        description: [input.title, input.description].filter(v => Boolean(v)).join("\n\n"),
        schema: input.schema,
        optional: typeof input.schema.default !== 'undefined' || input.minOccurs === 0
      });
    }

    let addOutputParam = (p, name, output) => {
      output = Object.assign({}, output);
      if (Array.isArray(output.schema.oneOf) && output.schema.oneOf.every(s => s.type === 'string' && Boolean(s.contentMediaType))) {
        output.schema = {
          type: 'string',
          enum: output.schema.oneOf.map(s => s.contentMediaType)
        };
      }
      p.parameters.push(Object.assign({name: `output:${name}`}, output));
    };

    if (Utils.size(process.outputs) === 1) {
      let [name, output] = Object.entries(process.outputs)[0];
      process.returns = {
        description: [output.title, output.description].filter(v => Boolean(v)).join("\n\n"),
        schema: output.schema
      };
      // @todo workaround for now
      addOutputParam(process, name, output);
    }
    else {
      process.returns = {
        description: 'see process description',
        schema: []
      };
      for(let name in process.outputs) {
        let output = process.outputs[name];
        let schema = Object.assign({}, output.schema, {title: output.title, description: output.description});
        process.returns.schema.push(schema);
        // @todo workaround for now
        addOutputParam(process, name, output);
      }
    }
  
    // Make links absolute
    if (Array.isArray(process.links)) {
      process.links = Utils.makeLinksAbsolute(process.links, response);
    }
  
    return process;
  }

  /**
   * Migrates a job.
   * 
   * @param {object} job
   * @param {AxiosResponse} response
   * @returns {Job}
   */
  static job(job, response) {
    if (!job.jobID) {
      return job;
    }

    job.ogcapi = true;
    job.id = job.jobID;
    if (job.processID) {
      job.process = {
        process_graph: {
          [job.processID]: {
            process_id: job.processID,
            arguments: {},
            description: "Process description incomplete as the information is missing in OGC API responses.",
            result: true
          }
        }
      };
    }
    job.status = JobStatusMap[job.status];
    job.created = job.created || job.started;
    job.updated = job.updated || job.finished;
    job.description = job.message;

    if (Array.isArray(job.links)) {
      job.links = Utils.makeLinksAbsolute(job.links, response);
    }
    
    return job;
  }

  /**
   * Executes an OGC API process synchronously.
   * 
   * @todo Check whether implementation still works
   * @param {Connection} connection 
   * @param {object} requestBody
   * @returns {object}
   */
  static executeSync(connection, requestBody) {
    const graph = Object.values(requestBody.process.process_graph);
    const valid = graph.every(node => {
      let spec = connection.processes.get(node.process_id);
      return Boolean(spec && (spec.ogcapi || spec.id === 'load_collection'));
    });
    if (!valid) {
			throw new Error('Process must consist only of OGC Processes and Collections');
    }

    const parser = new PgParser(requestBody.process, connection.getBaseUrl());
    return parser.parse();
  }

}

module.exports = OgcMigrate;