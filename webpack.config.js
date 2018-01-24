const path = require("path");
const srcDir = path.resolve(__dirname, "src");
const distDir = path.resolve(__dirname, "dist");
module.exports = {
  context: srcDir,
  // No source map for production build
  devtool: "source-map",

  entry: ["./index.js"],
  output: {
    path: distDir,
    //  publicPath: "/src/",
    filename: "bundle.js"
  },
  devServer: {
    contentBase: srcDir,
    // match the output path
    publicPath: "/",
    open: true,
    // match the output `publicPath`
    historyApiFallback: true,
    port: 3000
  },
  /* resolve: {
    // Leaflet image Alias resolutions
    alias: {
      "./images/layers.png$": path.resolve(__dirname, "node_modules/leaflet/dist/images/layers.png"),
      "./images/layers-2x.png$": path.resolve(__dirname, "node_modules/leaflet/dist/images/layers-2x.png"),
      "./images/marker-icon.png$": path.resolve(__dirname, "node_modules/leaflet/dist/images/marker-icon.png"),
      "./images/marker-icon-2x.png$": path.resolve(__dirname, "node_modules/leaflet/dist/images/marker-icon-2x.png"),
      "./images/marker-shadow.png$": path.resolve(__dirname, "node_modules/leaflet/dist/images/marker-shadow.png")
    }
  },*/
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        query: {
          presets: ["env"]
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
        loader: "url-loader",
        options: {
          limit: 10000
        }
      }
    ]
  }
};
