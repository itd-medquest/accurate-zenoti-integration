import { copyFileSync, cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const target = resolve('public/vendor/pdfjs-6.4.299');
mkdirSync(target, { recursive: true });
copyFileSync(
  'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
  resolve(target, 'pdf.worker.min.mjs'),
);
for (const dir of ['standard_fonts', 'cmaps', 'wasm'])
  cpSync(resolve('node_modules/pdfjs-dist', dir), resolve(target, dir), { recursive: true });
