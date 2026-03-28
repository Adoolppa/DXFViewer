import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bash = 'C:/Program Files/Git/usr/bin/bash.exe';
const script = join(__dirname, 'build-wasm.sh').replace(/\\/g, '/');

const result = spawnSync(bash, ['--login', script], { stdio: 'inherit', cwd: process.cwd() });
process.exit(result.status ?? 1);
