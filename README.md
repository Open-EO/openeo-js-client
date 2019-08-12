# openeo-js-client

JavaScript client for the openEO API.

[![Build Status](https://travis-ci.org/Open-EO/openeo-js-client.svg?branch=master)](https://travis-ci.org/Open-EO/openeo-js-client)

The version of this client is **0.4.1** and supports **openEO API version 0.4.x**. Legacy versions are available as releases.

## Usage

This library can run in node.js or any recent browser supporting ECMAScript 2017 (ES8). This includes [mostly all browsers released after mid 2017, but excludes Internet Explorer 11](https://caniuse.com/#search=async%20functions).

### Browser environment

To use it in a browser environment simply add the following code to your HTML file:
```html
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@openeo/js-client/openeo.min.js"></script>
```

### NodeJS environment

To install it in a NodeJS environment run: `npm install @openeo/js-client`

Afterwards, you can import the package: `const { OpenEO } = require('@openeo/js-client');`

### Advanced options

Generate a minified build: `npm run build`

Generate the documentation to the `docs/` folder: `npm run docs`

Check against the coding guidelines: `npm run compat`

Run tests:

* `npm run test` (basic browser-based tests)
* `npm run test_node` (basic node-based tests)
* `npm run test_gee` (full test suite using the Google Earth Engine back-end as server)

### Running a job

```js
// Show the client version
console.log("Client Version: " + OpenEO.clientVersion());

try {
  // Connect to the back-end
  var con = await OpenEO.connect("https://earthengine.openeo.org", "basic", {username: "group1", password: "test123"});

  // Show implemented API version of the back-end
  var capabilities = con.capabilities();
  console.log("Server API version: " + capabilities.apiVersion());

  // List collection names
  var collections = await con.listCollections();
  console.log("Collections: " + collections.collections.map(c => c.name));

  // List process ids
  var processes = await con.listProcesses();
  console.log("Processes: " + processes.processes.map(p => p.name));
  
  // List supported file types
  var fileTypes = await con.listFileTypes();
  console.log("Files types: " + Object.keys(fileTypes.formats));
  
  // Check whether synchronous previews are supported
  var syncSupport = capabilities.hasFeature("computeResult");
  console.log("Synchronous previews: " + (syncSupport ? "supported" : "NOT supported"));
  
  // Request a preview synchronously for a process graph
  if (syncSupport) {
    // Replace ... with your JSON process graph
    var preview = await con.computeResult(..., "png");
    // This returns a Blob object containing a binary PNG file you could further process or show.
  }
} catch(e) {
  console.log(e);
}
```

More information can be found in the [**JS client documentation**](https://open-eo.github.io/openeo-js-client/0.4.1/).

## Roadmap

* The JS client only supports browsers with support for ECMAScript 2017 (ES8). This is a steep requirement and should be lowered by transpiling. [#18](https://github.com/Open-EO/openeo-js-client/issues/18)
* There's no functionality to build process graphs. An easy-to-use process graph builder is envisioned to be implemented. [#19](https://github.com/Open-EO/openeo-js-client/issues/19)
* Implement authentification via OpenID Connect. [#11](https://github.com/Open-EO/openeo-js-client/issues/11)
* See the [issue tracker](https://github.com/Open-EO/openeo-js-client/issues) for more information.

## Interactive JS Editor

There is an experimental interactive web-based editor for coding using the openEO API,
which is based on the JavaScript client.
See [https://github.com/Open-EO/openeo-web-editor](https://github.com/Open-EO/openeo-web-editor) for more details.
