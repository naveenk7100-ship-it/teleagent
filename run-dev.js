import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('🚀 Launching AI Telegram Agent Builder Platform...');
console.log('====================================================');

const serverScript = path.join(__dirname, 'server', 'dist', 'index.js');
const viteBin = path.join(__dirname, 'client', 'node_modules', 'vite', 'bin', 'vite.js');

// Spawn Server
const server = spawn(process.execPath, [serverScript], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit',
  env: { ...process.env, PORT: '3001' }
});

// Spawn Client
const client = spawn(process.execPath, [viteBin, '--host', '0.0.0.0'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'inherit',
  env: { ...process.env }
});

const cleanup = () => {
  console.log('\n🛑 Shutting down AI Telegram Agent Builder...');
  try { server.kill(); } catch (e) {}
  try { client.kill(); } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
