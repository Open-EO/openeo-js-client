# openeo-js-client

JavaScript/TypeScript client for the openEO API.

* [Documentation](https://open-eo.github.io/openeo-js-client/latest/).

The version of this client is **2.6.0** and supports **openEO API versions 1.x.x**.
Legacy versions are available as releases.
See the [CHANGELOG](CHANGELOG.md) for recent changes.

## Usage

This library can run in node.js or any recent browser supporting ECMAScript 2017. This excludes Internet Explorer, but includes Edge >= 15.

An *experimental* Typescript declaration file is available so that you can use the library also in your TypeScript projects.

### Browser

To use it in a browser environment simply add the following code to your HTML file:
```html
<script src="https://cdn.jsdelivr.net/npm/axios@1/dist/axios.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/oidc-client@1/dist/oidc-client.min.js"></script> <!-- Only required if you'd like to enable authentication via OpenID Connect -->
<script src="https://cdn.jsdelivr.net/npm/multihashes@3/src/index.min.js"></script> <!-- Only required if you have checksums in the STAC metadata -->
<script src="https://cdn.jsdelivr.net/npm/@openeo/js-client@2/openeo.min.js"></script>
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

In the browser:
* [Basic Discovery (promises)](examples/web/discovery.html)
* [Run sync. job (async/await)](examples/web/workflow.html)

In Node.js:
* [Basic Discovery (promises)](examples/node/discovery.js)

In Typescript:
* [Basic Discovery (promises)](examples/typescript/discovery.ts)

More information can be found in the [documentation](https://open-eo.github.io/openeo-js-client/latest/).

## Development

![JS Client Tests](https://github.com/Open-EO/openeo-js-client/workflows/JS%20Client%20Tests/badge.svg)

Always make sure to adapt changes in the *.js files to the openeo.d.ts file.
If changes are larger you may want to run `npm run tsd` and regenerate the declaration file and cherry-pick your changes from there.

Generate a build: `npm run build` (generates `openeo.js` and `openeo.min.js`)

Generate the documentation to the `docs/` folder: `npm run docs`

Check against the coding guidelines: `npm run lint`

Run tests:

* `npm test` (all tests)
* `npm test browser` (browser tests)
* `npm test node` (node tests)
* `npm test builder` (tests only the process builder)
* `npm test earthengine` (full test suite using the Google Earth Engine back-end as server)

# Contributions

The authors acknowledge the financial support for the development of this package during the H2020 project "openEO" (Oct 2017 to Sept 2020) by the European Union, funded by call EO-2-2017: EO Big Data Shift, under grant number 776242. We also acknowledge the financial support received from ESA for the project "openEO Platform" (Sept 2020 to Sept 2023).

This package received major contributions from the following organizations:

[<img src="https://www.uni-muenster.de/imperia/md/images/allgemein/farbunabhaengig/wwu.svg" alt="WWU Münster logo" title="WWU Münster" height="50">](https://www.uni-muenster.de/) &nbsp;
[<img src="https://www.cubesatshop.com/wp-content/uploads/2017/05/logo.png" alt="Solenix logo" title="Solenix" height="50">](https://www.solenix.ch)
[<img src="https://www.sinergise.com/sites/default/files/logo.png" alt="Sinergise logo" title="Sinergise" height="50">](https://www.sinergise.com)

## Interactive Web Editor

There is an interactive web-based editor for coding using the openEO API,
which is based on the JavaScript client.
See [https://github.com/Open-EO/openeo-web-editor](https://github.com/Open-EO/openeo-web-editor) for more details.
