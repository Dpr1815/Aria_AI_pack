/**
 * Generate cryptographically secure secrets for JWT signing.
 *
 * Usage:
 *   npx ts-node scripts/generate-secrets.ts
 */

import crypto from 'crypto';

const secrets = [
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'SESSION_TOKEN_SECRET',
  'SERVICE_TOKEN_SECRET',
];

console.log('\n🔐 JWT Secrets Generated\n');
console.log('   Add these to your .env:\n');

for (const name of secrets) {
  const secret = crypto.randomBytes(64).toString('base64url');
  console.log(`   ${name}=${secret}`);
}

console.log();
