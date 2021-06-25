# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2021-05-30

### Added

- Added events to `Connection` to populate changes for Auth Tokens (`tokenChanged`) and Auth Providers (`authProviderChanged`).
- Added new methods to `Connection` for working with events: `on`, `off` and `emit`.

### Changed

- OpenID Connect authentication has been rewritten.
- Default grant type for OpenID Connect is "AuthCode w/ PKCE" instead of "Implicit".
- Support for OpenID Connect session renewal via refresh tokens.

### Removed

- `OidcProvider`: Methods `getGrant`, `getScopes`, `getIssuer` and `getUser` removed. Use the properties `grant`, `scopes`, `issuer` and `user` instead.

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

[Unreleased]: https://github.com/olivierlacan/keep-a-changelog/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.3.2...v2.0.0
[1.3.2]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.0.0-rc.5...v1.0.0
