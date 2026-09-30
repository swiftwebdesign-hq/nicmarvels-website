// netlify/functions/api.js
//
// Static top-level imports. esbuild (Netlify's node_bundler) follows these at
// build time and inlines server/index.js plus every npm package it imports
// (express, cors, multer, zod, node-appwrite, express-rate-limit, …) into the
// single Lambda file. Nothing is resolved at runtime, so there is no
// node_modules and no /var/task/server/ directory to find on Lambda.
//
// Requires "type": "module" in the repository root package.json, which is
// already present.

import serverless from 'serverless-http';
import app from '../../server/index.js';

export const handler = serverless(app);
