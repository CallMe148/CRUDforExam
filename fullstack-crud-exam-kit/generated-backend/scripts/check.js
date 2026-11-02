// ตรวจทุกไฟล์ JavaScript ของโปรเจกต์ โดยไม่รวม dependencies
const { readdirSync } = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
function check(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (item.name === 'node_modules' || item.name.startsWith('.')) continue;
    const file = path.join(dir, item.name);
    if (item.isDirectory()) check(file);
    else if (file.endsWith('.js')) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  }
}
check(path.join(__dirname, '..'));
console.log('JavaScript syntax OK');
