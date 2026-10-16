const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const problems = [];
const roots = ['pos-fe/src', 'pos-be/src', 'pos-android/src', 'pos-android/__tests__'];
const oldBrand = /lite\s?pos/i;
function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) inspect(file);
    else if (/\.(?:js|jsx|ts|tsx|json|xml|svg)$/.test(entry.name)) {
      const contents = fs.readFileSync(file, 'utf8');
      if (oldBrand.test(contents)) problems.push(path.relative(root, file));
      if (file.startsWith(path.join(root, 'pos-fe', 'src')) && contents.includes('http://localhost:5000')) {
        problems.push(`Fallback API frontend lama: ${path.relative(root, file)}`);
      }
    }
  }
}
for (const directory of roots) inspect(path.join(root, directory));
for (const removed of ['pos-fe/public/icon.png', 'pos-fe/public/logo.png', 'pos-fe/src/app/icon.png', 'pos-android/src/assets/logo.png', 'pos-android/src/assets/receiptLogoBase64.ts']) {
  if (fs.existsSync(path.join(root, removed))) problems.push(`Aset lama masih ada: ${removed}`);
}
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
assert.match(read('pos-android/android/app/build.gradle'), /applicationId "com\.kasirpos\.app"/);
assert.match(read('pos-android/android/app/src/main/java/com/posandroid/MainActivity.kt'), /getMainComponentName\(\): String = "KasirPOS"/);
assert.equal(JSON.parse(read('pos-android/app.json')).name, 'KasirPOS');
assert.match(read('pos-be/src/config/auth.js'), /SESSION_COOKIE_NAME = 'kasirpos_session'/);
if (problems.length) {
  console.error('Branding perlu diperbaiki:\n' + problems.join('\n'));
  process.exitCode = 1;
} else console.log('Branding, aset, identitas Android, dan namespace sesi KasirPOS: OK.');
