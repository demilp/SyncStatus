//const DexTemplatePlugin = require("dex-template-webpack-plugin");
/* const HtmlWebpackInlineSourcePlugin = require("html-webpack-inline-source-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin"); */
module.exports = function override(config, env) {
  if (!config.plugins) {
    config.plugins = [];
  }
  config.plugins.push(
    /* new HtmlWebpackPlugin({ inlineSource: ".(js|css)$" }),
    new HtmlWebpackInlineSourcePlugin(), */
    //new DexTemplatePlugin(false)
  );
  return config;
};
