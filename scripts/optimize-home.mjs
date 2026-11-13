import { build, transform } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const directory = 'assets/compiled';
await mkdir(directory, { recursive: true });
let html = await readFile('index.html', 'utf8');
async function publish(name, extension, source) {
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 16);
  const path = directory + '/' + name + '-' + hash + '.' + extension;
  await writeFile(path, source);
  return '/' + path;
}

const styles = [...html.matchAll(/<link\b[^>]*href="(\/assets\/[^"?]+\.css)(?:\?[^"]*)?"[^>]*>/g)];
if (styles.length) {
  const files = styles.map(match => match[1].slice(1));
  const css = await build({ stdin: { contents: files.map(file => '@import "./' + file + '";').join('\n'), resolveDir: process.cwd(), loader: 'css' }, bundle: true, minify: true, write: false, external: ['/assets/*'], legalComments: 'none' });
  const url = await publish('home', 'css', css.outputFiles[0].contents);
  // Preserve stylesheet cascade order. Feature styles follow the application base.
  for (const [index, match] of styles.entries()) {
    html = html.replace(match[0], index === 0 ? '<link rel="stylesheet" href="' + url + '">' : '');
  }
}
for (const match of [...html.matchAll(/<script\b[^>]*src="(\/assets\/[^"?]+\.js)(?:\?[^"]*)?"[^>]*>/g)]) {
  if (match[0].includes('type="module"') || match[1].endsWith('.min.js')) continue;
  const source = await readFile(match[1].slice(1), 'utf8');
  // Classic scripts share global declarations across files.
  const result = await transform(source, { minifyWhitespace: true, minifySyntax: true, legalComments: 'none' });
  const url = await publish(match[1].split('/').pop().slice(0,-3), 'js', result.code);
  html = html.replace(match[0], match[0].replace(/src="[^"]+"/, 'src="' + url + '"'));
}
await writeFile('index.html', html);
