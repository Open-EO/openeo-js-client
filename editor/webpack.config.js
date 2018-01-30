module.exports = {
	context: __dirname,
	devtool: "source-map",
	entry: ["./index.js"],
	output: {
		path: __dirname,
		filename: "openeo-editor.js"
	},
	devServer: {
		contentBase: __dirname,
		publicPath: "/",
		open: true,
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
