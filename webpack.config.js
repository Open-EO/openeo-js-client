const path = require('path');
const nodeExternals = require('webpack-node-externals');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const UnminifiedWebpackPlugin = require('unminified-webpack-plugin');

module.exports = [
  // Web
  {
    target: "web",
    entry: './src/openeo.js',
    output: {
      filename: 'openeo.min.js',
      path: path.resolve(__dirname),
      libraryTarget: 'umd'
    },
    externals: {
        'axios': 'axios',
        'oidc-client': 'oidc-client'
    },
    resolve: {
      alias: {
        '@openeo/js-environment': path.resolve(__dirname, 'src/browser.js')
      }
    },
    plugins: [
      new UnminifiedWebpackPlugin(),
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false
      })
    ],
  },
  // Node
  {
    target: "node",
    entry: './src/openeo.js',
    output: {
      filename: 'openeo.node.min.js',
      path: path.resolve(__dirname),
      libraryTarget: 'umd',
    },
    externals: [
      nodeExternals()
    ],
    resolve: {
      alias: {
        '@openeo/js-environment': path.resolve(__dirname, 'src/node.js')
      }
    },
    plugins: [
      new UnminifiedWebpackPlugin()
    ],
  }
];