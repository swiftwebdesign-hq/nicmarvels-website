const serverless = require('serverless-http');

let handler;

exports.handler = async (event, context) => {
  if (!handler) {
    process.env.NETLIFY = 'true';
    const { default: app } = await import('../../server/index.js');
    handler = serverless(app);
  }
  return handler(event, context);
};
