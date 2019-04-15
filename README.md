# openeo-js-client

JavaScript client for the openEO API.

[![Build Status](https://travis-ci.org/Open-EO/openeo-js-client.svg?branch=master)](https://travis-ci.org/Open-EO/openeo-js-client)

This client is in **version 0.4.0-beta.1** and supports **openEO API versions 0.4.x**. Legacy versions are available as releases.

## Usage
This library can run in a recent browser supporting ECMAScript 2015 or node.js.

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

### Running a job

```js
// Show the client version
console.log("Client Version: " + OpenEO.clientVersion());

try {
  // Connect to the back-end
  var con = await OpenEO.connect("https://earthengine.openeo.org", "basic", {username: "group1", password: "test123"});

  // Show implemented API version of the back-end
  var capabilities = await con.capabilities();
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
  var syncSupport = capabilities.hasFeature("execute");
  console.log("Synchronous previews: " + (syncSupport ? "supported" : "NOT supported"));
  
  // Request a preview synchronously for a process graph
  if (syncSupport) {
    // Replace ... with your JSON process graph
    var preview = await con.execute(..., "png");
    // This returns a Blob object containing a binary PNG file you could further process or show.
  }
} catch(e) {
  console.log(e);
}
```

More information can be found in the [**JS client documentation**](https://open-eo.github.io/openeo-js-client/development/).

## Interactive JS Editor

There is an experimental interactive web-based editor for coding using the openEO API,
where you can define processes and visualizations in JavaScript.
See [https://github.com/Open-EO/openeo-web-editor](https://github.com/Open-EO/openeo-web-editor) for more details.

