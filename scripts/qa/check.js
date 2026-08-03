const fs = require('fs');
const path = require('path');

function ok(msg) { console.log('\x1b[32m✔\x1b[0m', msg); }
function warn(msg) { console.log('\x1b[33m!\x1b[0m', msg); }

const root = path.resolve(__dirname, '../../');
const pkg = require(path.join(root, 'package.json'));

console.log('Running quick QA checks...');

if (!fs.existsSync(path.join(root, '.env.example'))) {
  warn('.env.example missing');
} else ok('.env.example present');

if (pkg.scripts && pkg.scripts.dev) ok('dev script present'); else warn('dev script missing');
if (pkg.scripts && pkg.scripts.build) ok('build script present'); else warn('build script missing');
if (pkg.scripts && pkg.scripts.test) ok('test script present'); else warn('test script missing');

const files = ['src/app/components/CameraView.tsx', 'src/services/authService.ts', 'src/services/storageService.ts'];
files.forEach(f => {
  if (fs.existsSync(path.join(root, f))) ok(`${f} OK`); else warn(`${f} MISSING`);
});

console.log('QA checks complete. For deeper checks run linters and tests.');
