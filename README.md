# openeo-js-client

JavaScript/TypeScript client for the openEO API.

* [Documentation](https://open-eo.github.io/openeo-js-client/1.0.0-rc.4/).

The version of this client is **1.0.0-rc.4** and supports **openEO API versions 1.0.x**. Legacy versions are available as releases.

## Usage

This library can run in node.js or any recent browser supporting ECMAScript 2017. This excludes Internet Explorer, but includes Edge >= 15.

An *experimental* Typescript declaration file is available so that you can use the library also in your TypeScript projects.

### Browser

To use it in a browser environment simply add the following code to your HTML file:
```html
<script src="https://cdn.jsdelivr.net/npm/axios@0.19/dist/axios.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/oidc-client@1/dist/oidc-client.min.js"></script> <!-- Only required if you'd like to enable authentication via OpenID Connect -->
<script src="https://cdn.jsdelivr.net/npm/@openeo/js-client@latest/openeo.min.js"></script>
```

### NodeJS

To install it in a NodeJS environment run:
`npm install @openeo/js-client`

Afterwards, you can import the package:
`const { OpenEO } = require('@openeo/js-client');`

### TypeScript 

Warning: The TypeScript integration is still **experimental**! Please help us improve it by opening issues or pull requests.

To install it in a TypeScript environment run:
`npm install @openeo/js-client`

Afterwards, you can import the package:
`import { OpenEO } from '@openeo/js-client';`

### Examples

* [Basic Discovery (promises)](examples/web/discovery.html)
* [Run sync. job (async/await)](examples/web/workflow.html)

More information can be found in the [documentation](https://open-eo.github.io/openeo-js-client/1.0.0-rc.4/).

## Development

[![Build Status](https://travis-ci.org/Open-EO/openeo-js-client.svg?branch=master)](https://travis-ci.org/Open-EO/openeo-js-client)

Generate a build: `npm run build` (generates `openeo.js`, `openeo.min.js` and `openeo.d.ts`)

Generate the documentation to the `docs/` folder: `npm run docs`

Check against the coding guidelines: `npm run lint`

Run tests:

* `npm test` (all tests)
* `npm test browser` (browser tests)
* `npm test node` (node tests)
* `npm test builder` (tests only the process builder)
* `npm test earthengine` (full test suite using the Google Earth Engine back-end as server)

## Interactive Web Editor

There is an interactive web-based editor for coding using the openEO API,
which is based on the JavaScript client.
See [https://github.com/Open-EO/openeo-web-editor](https://github.com/Open-EO/openeo-web-editor) for more details.