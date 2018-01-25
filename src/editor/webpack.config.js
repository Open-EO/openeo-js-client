const srcDir = __dirname;
const distDir = __dirname;
module.exports = {
	context: srcDir,
	// No source map for production build
	devtool: "source-map",
	entry: ["./index.js"],
	output: {
		path: distDir,
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
	module: {
		loaders: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				loader: "babel-loader"
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
