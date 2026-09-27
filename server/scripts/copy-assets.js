import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const srcDb = path.join(rootDir, 'src', 'db');
const distDb = path.join(rootDir, 'dist', 'db');
const srcMigrations = path.join(srcDb, 'migrations');
const distMigrations = path.join(distDb, 'migrations');

if (!fs.existsSync(distDb)) {
  fs.mkdirSync(distDb, { recursive: true });
}

if (fs.existsSync(path.join(srcDb, 'schema.sql'))) {
  fs.copyFileSync(path.join(srcDb, 'schema.sql'), path.join(distDb, 'schema.sql'));
}

if (fs.existsSync(srcMigrations)) {
  if (!fs.existsSync(distMigrations)) {
    fs.mkdirSync(distMigrations, { recursive: true });
  }
  const files = fs.readdirSync(srcMigrations);
  for (const file of files) {
    if (file.endsWith('.sql')) {
      fs.copyFileSync(path.join(srcMigrations, file), path.join(distMigrations, file));
    }
  }
}

console.log('✅ Production SQL assets copied to dist/db/');
