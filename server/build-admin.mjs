import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
await build({
  entryPoints: [path.resolve(serverDir, '../site/admin/admin.js')],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  nodePaths: [path.resolve(serverDir, '../node_modules')],
  outfile: path.resolve(serverDir, '../site/admin/admin.bundle.js'),
});
