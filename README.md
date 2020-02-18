# openeo-js-client

JavaScript client for the openEO API.

[![Build Status](https://travis-ci.org/Open-EO/openeo-js-client.svg?branch=master)](https://travis-ci.org/Open-EO/openeo-js-client)

The version of this client is **1.0.0-beta.1** and supports **openEO API versions 1.0.x**. Legacy versions are available as releases.

## Usage

This library can run in node.js or any recent browser (excluding Internet Explorer).

### Browser environment

To use it in a browser environment simply add the following code to your HTML file:
```html
<script src="https://cdn.jsdelivr.net/npm/axios@0.19/dist/axios.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/oidc-client@1/lib/oidc-client.min.js"></script> <!-- Only required if you'd like to enable authentication via OpenID Connect -->
<script src="https://cdn.jsdelivr.net/npm/@openeo/js-client@latest/openeo.min.js"></script>
```

### NodeJS environment

To install it in a NodeJS environment run: `npm install @openeo/js-client`

Afterwards, you can import the package: `const { OpenEO } = require('@openeo/js-client');`

### Advanced options

Generate a minified build: `npm run build`

Generate the documentation to the `docs/` folder: `npm run docs`

Check against the coding guidelines: `npm run compat`

Run tests:

* `npm run test` (browser and node tests)
* `npm run test_browser` (browser tests)
* `npm run test_node` (node tests)
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

More information can be found in the [**JS client documentation**](https://open-eo.github.io/openeo-js-client/1.0.0-beta.1/).

## Roadmap

* There's no functionality to build process graphs. An easy-to-use process graph builder is envisioned to be implemented. [#19](https://github.com/Open-EO/openeo-js-client/issues/19)
* See the [issue tracker](https://github.com/Open-EO/openeo-js-client/issues) for more information.

## Interactive JS Editor

There is an experimental interactive web-based editor for coding using the openEO API,
which is based on the JavaScript client.
See [https://github.com/Open-EO/openeo-web-editor](https://github.com/Open-EO/openeo-web-editor) for more details.
