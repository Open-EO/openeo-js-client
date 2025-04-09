# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add `id` field to the objects in the array returned by `listFederation` in `Capabilities`

## [2.7.0] - 2025-01-04

### Added

- New function `getMissingBackends` for `Logs`
- New property `federation:backends` added to the array returned by `validateProcess`
- New property `axios` in the `Environment`
- New functions in `Connection` for paginating through lists:
  - `paginateProcesses`
  - `paginateCollections`
  - `paginateJobs`
  - `paginateFiles`
  - `paginateUserProcesses`
  - `paginateServices`

### Changed

- The `listCollectionItems` function in `Connection` was completely rewritten.
- The client may add a self link to the links in responses

## [2.6.0] - 2024-07-11

### Added

- Support to retrieve conformance classes
- Added `Connection.makeLinksAbsolute`
- Added `AuthProvider.getDisplayName`
- Hook to migrate capabilities
- Support for `usage`, `log_level`, `links` in batch jobs and services
- Support for `level` parameter for log requests in batch jobs and services
- Support passing additional parameters to synchronous jobs.

### Changed

- Updated axios from 0.x to 1.x

### Removed

- Dependency for `node-abort-controller` not required any longer in nodeJS

### Fixed

- Make the feature / endpoint mapping more robust
- Add missing endpoints to feature / endpoint mapping
- Fix AbortController handling
- Clarify that the `log_level` parameter for jobs, services and sync. processing can be provided via the `additional` parameter

## [2.5.1] - 2022-04-08

### Fixed

- Job status missing from batch job metadata

## [2.5.0] - 2022-04-07

### Changed

- `listJobs`, `listServices` and `listUserProcesses` allow to update existing processes.
- `listFiles`, `listJobs`, `listServices` and `listUserProcesses` return a `ResponseArray` instead of a plain `Array`.
  The ResonseArray now has the properties `links` and `federation:missing` from the responses.
  This is usually a non-breaking change, but if you mistakenly use `Object` functions (such as `Object.keys`) on an array, you'll get the additional properties, too.

### Fixed

- Fine-tuned some Typescript declarations.

## [2.4.1] - 2022-01-13

### Fixed

- Fixed regression for OIDC scopes introduced in 2.4.0

## [2.4.0] - 2022-01-10

### Added

- OpenID Connect: Support requesting a refresh token easily via the `requestRefreshToken` parameter.

### Changed

- The `namespace` parameter in `listProcesses` and `describeProcess` parses URLs to extract the namespace (experimental).

### Fixed

- Fixed several type annotations in the documentation and the TypeScript declaration file.

## [2.3.1] - 2021-12-10

### Fixed

- Process cache gets refreshed after the authentication details have changed (e.g. the user has logged in or out).

## [2.3.0] - 2021-12-10

### Added

- New parameter `abortController` to allow cancellation of longer running requests (uploading files, sync. data processing).

### Changed

- Rarely used `multihashes` dependency not included in the bundle by default, see Readme to include it in the browser. No change for node environments.

## [2.2.0] - 2021-08-20

### Added

- New method `getUrl` to class `Connection` to get the main URL of the back-end, which the user provided (i.e. doesn't usually contain version part)

## [2.1.0] - 2021-08-18

### Added

- Experimental support for process namespaces, see [API#348](https://github.com/Open-EO/openeo-api/pull/348).

### Changed

- Internally, a new process registry is used to manage and cache processes.
- `listProcesses` doesn't cache requests any longer.

### Fixed

- Return a better error message if issues with reading batch job results occur in `Job.getResultsAsStac`
- `getAll()` functions return only properties for values that are defined

## [2.0.1] - 2021-07-14

### Fixed

- `Formula`: Formulas can reference more then just the first parameter by adding additional `$` at the beginning, e.g. `$$0` to access the first element of an array in the second parameter.

## [2.0.0] - 2021-07-06

### Added

- Added events to `Connection` to populate changes for Auth Tokens (`tokenChanged`) and Auth Providers (`authProviderChanged`).
- Added new methods to `Connection` for working with events: `on`, `off` and `emit`.

### Changed

- OpenID Connect authentication has been rewritten.
- Default grant type for OpenID Connect is "AuthCode w/ PKCE" instead of "Implicit".
- Support for OpenID Connect session renewal via refresh tokens.
- Updated STAC support to STAC v1.0.0.

### Removed

- `OidcProvider`: Methods `getGrant`, `getScopes`, `getIssuer` and `getUser` removed. Use the properties `grant`, `scopes`, `issuer` and `user` instead.
- Removed deprecated method `getResultsAsItem` in favor of `getResultsAsStac`.

## [1.3.2] - 2021-05-27

### Fixed

- Fixed error handling for HTTP requests

## [1.3.1] - 2021-04-29

### Fixed

- Invalid dependency version for @openeo/js-commons

## [1.3.0] - 2021-04-29

### Added

- Custom process specifications can be added to the process builder after first initialization.
- The process builder supports implicitly wrapping:
  - an array returned from a callback using the `array_create` process.
  - non-objects (e.g. numbers) returned from a callback using the `constant` process.
- Support for "Default OpenID Connect Clients" (detecting default client IDs).

### Fixed

- Arrow functions can be used as callbacks in process graph building.
- Fixed nullable return types in TS declaraion
- Fixed other minor issues in TS declaration

## [1.2.0] - 2021-03-11

### Added

- Added new method `listCollectionItems` for searching and retrieving Items from `GET /collections/{collectionId}/items`.

### Changed

- Methods returning STAC (e.g. `listCollections`, `describeCollection`, `getResultAsStac`, `listCollectionItems`) always return the data compliant to the latest STAC version (currently 1.0.0-rc.1).

## [1.1.0] - 2021-02-18

### Added

- Added new method `getResultsAsStac` for Jobs, which includes support for STAC Collections returned by the API for batch job results.

### Deprecated

- Deprecated method `getResultsAsItem` in favor of `getResultsAsStac`.

### Fixed

- TypeScript declaration for Links has been fixed
- Updated dependencies

## [1.0.3] - 2021-02-02

### Fixed

- Updated axios dependency to fix a vulnerability.
- Updated oidc-client dependency to support the OpenID Connect flow *AuthCode with PKCE*. Default is still the Implicit Flow.

## [1.0.2] - 2020-12-02

### Changed
- Make client more flexible to allow setting the client to use OIDC Authentication Code Flow with PKCE instead of Implicit Flow in the future

### Fixed
- Client doesn't throw errors on back-ends with version numbers >= 1.0.1

## [1.0.1] - 2020-11-19

### Fixed
- Don't set unnecessary `withCredentials` option on HTTP requests for better CORS support. [openeo-api#41](https://github.com/Open-EO/openeo-api/issues/41)

## [1.0.0] - 2020-11-17

### Fixed
- Throw better error message in case openeo-identifier can't be retrieved. [#37](https://github.com/Open-EO/openeo-js-client/issues/37)

## Prior releases

All prior releases have been documented in the [GitHub Releases](https://github.com/Open-EO/openeo-js-client/releases).

[Unreleased]: https://github.com/Open-EO/openeo-js-client/compare/v2.7.0...HEAD
[2.7.0]: https://github.com/Open-EO/openeo-js-client/compare/v2.6.0...v2.7.0
[2.6.0]: https://github.com/Open-EO/openeo-js-client/compare/v2.5.1...v2.6.0
[2.5.1]: https://github.com/Open-EO/openeo-js-client/compare/v2.5.0...v2.5.1
[2.5.0]: https://github.com/Open-EO/openeo-js-client/compare/v2.4.1...v2.5.0
[2.4.1]: https://github.com/Open-EO/openeo-js-client/compare/v2.4.0...v2.4.1
[2.4.0]: https://github.com/Open-EO/openeo-js-client/compare/v2.3.1...v2.4.0
[2.3.1]: https://github.com/Open-EO/openeo-js-client/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/Open-EO/openeo-js-client/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/Open-EO/openeo-js-client/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/Open-EO/openeo-js-client/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/Open-EO/openeo-js-client/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/Open-EO/openeo-js-client/compare/v1.3.2...v2.0.0
[1.3.2]: https://github.com/Open-EO/openeo-js-client/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/Open-EO/openeo-js-client/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/Open-EO/openeo-js-client/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Open-EO/openeo-js-client/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Open-EO/openeo-js-client/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/Open-EO/openeo-js-client/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/Open-EO/openeo-js-client/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/Open-EO/openeo-js-client/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Open-EO/openeo-js-client/compare/v1.0.0-rc.5...v1.0.0