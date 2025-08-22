const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const UnminifiedWebpackPlugin = require('unminified-webpack-plugin');

module.exports = [
  // Web
  {
    target: "web",
    mode: 'production',
    entry: './src/client.js',
    output: {
      filename: 'client.min.js',
      path: path.resolve(__dirname),
      libraryTarget: 'umd'
    },
    externals: {
        'axios': 'axios',
        'buffer': 'Buffer',
        'fs': 'fs',
        'oidc-client': 'Oidc',
        'multihashes': 'multihashes',
        'path': 'path',
        'stream': 'Stream',
        'url': 'url'
    },
    resolve: {
      alias: {
        './env$': path.resolve(__dirname, 'src/browser.js')
      }
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }
      ]
    },
    plugins: [
      new UnminifiedWebpackPlugin(),
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false
      })
    ],
  }
];