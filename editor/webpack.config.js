module.exports = {
	context: __dirname,
	// No source map for production build
	devtool: "source-map",
	entry: ["./index.js"],
	output: {
		path: __dirname,
		filename: "openeo-editor.js"
	},
	devServer: {
		contentBase: __dirname,
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
