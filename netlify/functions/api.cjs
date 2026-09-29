const serverless = require('serverless-http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let handler;
exports.handler = async (event, context) => {
  if (!handler) {
    const apiModule = pathToFileURL(path.join(process.cwd(), 'server', 'index.js')).href;
    process.env.NETLIFY = 'true';
    const { default: app } = await import(apiModule);
    handler = serverless(app);
  }
  return handler(event, context);
};
