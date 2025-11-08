const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
  entry: "./src/scripts/pages/app.js",
  output: {
    filename: "app.bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
    publicPath: "./",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
        generator: {
          filename: "images/[hash][ext][query]",
        },
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
      inject: true,
    }),
    new MiniCssExtractPlugin({
      filename: "app.css",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "src/public/favicon.png",
          to: "favicon.png",
        },
        {
          from: "src/manifest.json",
          to: "manifest.json",
        },
        {
          from: "src/sw.js",
          to: "sw.js",
        },
      ],
    }),
  ],
};
