/**
 * Generate a long-lived service JWT for internal service-to-service communication.
 *
 * Usage:
 *   npx ts-node scripts/generate-service-token.ts
 *
 * Environment:
 *   SERVICE_TOKEN_SECRET (or ACCESS_TOKEN_SECRET as fallback)
 *
 * The generated token should be stored as an environment variable
 * (e.g., CONVERSATION_ENGINE_SERVICE_TOKEN) in the calling service.
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.SERVICE_TOKEN_SECRET;

if (!secret) {
  console.error('Error: SERVICE_TOKEN_SECRET  must be set');
  process.exit(1);
}

const serviceName = process.argv[2] || 'conversation-engine';

const payload = {
  service: serviceName,
  type: 'service' as const,
};

// 1-year expiration — long-lived but not infinite.
// Regenerate annually or when rotating secrets.
const token = jwt.sign(payload, secret, { expiresIn: '365d' });

console.log(`\n Service token generated for: ${serviceName}`);
console.log(` Expires: 365 days from now\n`);
console.log(' Add this to your conversation engine .env:\n');
console.log(`SERVICE_TOKEN=${token}\n`);
