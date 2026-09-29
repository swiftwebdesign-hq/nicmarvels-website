const serverless = require("serverless-http");

exports.handler = async (event, context) => {
  const { default: app } = await import("../../server/index.js");

  return serverless(app)(event, context);
};
