import fs from 'node:fs';
import path from 'node:path';

const requiredFiles = [
  'package.json',
  'next.config.ts',
  'proxy.ts',
  'lib/auth.ts',
  'lib/dashboard.ts',
  'app/api/auth/login/route.ts'
];

const missing = requiredFiles.filter(file => !fs.existsSync(path.join(process.cwd(), file)));

if (missing.length) {
  console.error('Missing required files:', missing.join(', '));
  process.exit(1);
}

console.log('Smoke checks passed: required app files are present.');
