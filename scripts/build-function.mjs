import { build } from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'netlify', 'functions');
fs.mkdirSync(outDir, { recursive: true });

await build({
  stdin: {
    contents: [
      "import serverless from 'serverless-http';",
      "import app from './server/index.js';",
      "export const handler = serverless(app);",
    ].join('\n'),
    resolveDir: root,
    sourcefile: 'api-entry.js',
    loader: 'js',
  },
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: path.join(outDir, 'api.js'),
  packages: 'bundle',
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info',
});

console.log('Bundled netlify/functions/api.js (self-contained CommonJS)');
