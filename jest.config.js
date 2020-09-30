module.exports = {

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  globals: {
    'axios': require('axios').default,
    'oidc-client': require('oidc-client')
  },

  moduleNameMapper: {
    "^@openeo/js-environment(.*)$": "<rootDir>/src$1"
  },

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // Make calling deprecated APIs throw helpful error messages
  errorOnDeprecated: true,

  // Use this configuration option to add custom reporters to Jest
  "reporters": [
    "default",
    ["./node_modules/jest-html-reporter", {
      "pageTitle": "Test Report for openeo-js-client",
      "outputPath": "./coverage/test-report.html"
    }]
  ]

};
