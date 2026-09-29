exports.handler = async (event, context) => {
  const [{ default: serverless }, { default: app }] =
    await Promise.all([
      import("serverless-http"),
      import("../../server/index.js")
    ]);

  return serverless(app)(event, context);
};