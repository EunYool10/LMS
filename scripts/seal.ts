// Seals a secret so that only the given LMS server can open it (see openSealed in authSecurity.ts).
// The value is read from stdin so it stays out of the shell history:
//   npx tsx scripts/seal.ts https://lms-fi53.onrender.com < secret.txt
import { sealValue } from '../authSecurity';

const site = (process.argv[2] || '').replace(/\/$/, '');
if (!site) {
  console.error('Usage: npx tsx scripts/seal.ts <site url> < secret.txt');
  process.exit(1);
}

const res = await fetch(`${site}/api/seal-key`);
const data: any = await res.json().catch(() => null);
if (!res.ok || !data?.key) {
  console.error(`No sealing key from ${site} (HTTP ${res.status}): ${data?.message || 'unexpected response'}`);
  process.exit(1);
}

let value = '';
for await (const chunk of process.stdin) value += chunk;
value = value.trim();
if (!value) {
  console.error('Nothing to seal: pass the secret on stdin.');
  process.exit(1);
}

console.log(sealValue(value, data.key));
