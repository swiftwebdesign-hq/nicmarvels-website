const serverless = require('serverless-http');

let handlerPromise;

exports.handler = async (event, context) => {
  if (!handlerPromise) {
    handlerPromise = import('../../server/index.js').then(({ default: app }) => {
      return serverless(app);
    });
  }

  const handler = await handlerPromise;
  return handler(event, context);
};
