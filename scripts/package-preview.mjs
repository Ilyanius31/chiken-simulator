import { readFile, writeFile, mkdir } from 'node:fs/promises';
// A single downloadable file for review when PR preview hosting is unavailable.
// Vite emits one JS entry; fail rather than silently omit additional chunks.
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const artifactPath = `artifacts/chicken-simulator-v${version.split('.').slice(0, 2).join('.')}.html`;
let html = await readFile('dist/index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)];
if (scripts.length !== 1) throw new Error('Expected one bundled entry script');
const scriptPath = scripts[0][1].slice(scripts[0][1].indexOf('assets/'));
const js = await readFile(`dist/${scriptPath}`, 'utf8');
if (/\bimport\s*\(/.test(js)) throw new Error('Standalone preview cannot include split imports');
html = html.replace(
  scripts[0][0],
  () => `<script type="module">${js.replaceAll('</script', '<\\/script')}</script>`,
);
for (const match of [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)]) {
  const path = match[1].slice(match[1].indexOf('assets/'));
  const css = await readFile(`dist/${path}`, 'utf8');
  html = html.replace(match[0], () => `<style>${css}</style>`);
}
const icon = await readFile('public/favicon.svg', 'utf8');
html = html.replace(
  /href="[^"]*favicon\.svg"/,
  `href="data:image/svg+xml,${encodeURIComponent(icon)}"`,
);
await mkdir('artifacts', { recursive: true });
await writeFile(artifactPath, html);
console.log(`Standalone preview: ${artifactPath} (${Buffer.byteLength(html)} bytes)`);
