# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Custom process specifications can be added `Builder` after first initialization.

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

[Unreleased]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.0.0-rc.5...v1.0.0