import crypto from 'node:crypto';

// KEY: base64-encoded 32 bytes from env (SECRETS_AES_KEY)
function getKey() {
  const b64 = process.env.SECRETS_AES_KEY;
  if (!b64) throw new Error('Missing SECRETS_AES_KEY');
  const raw = Buffer.from(b64, 'base64');
  if (raw.length !== 32) throw new Error('SECRETS_AES_KEY must be 32 bytes base64');
  return raw;
}

// Encrypt helper already existed; keeping compatible format:
// cipher: base64( ciphertext || authTag ), nonce: base64(iv)
export function encryptApiKey(plain: string) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const enc = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([enc.update(plain, 'utf8'), enc.final()]);
  const tag = enc.getAuthTag();
  const packed = Buffer.concat([ciphertext, tag]).toString('base64');
  return { cipher: packed, nonce: iv.toString('base64') };
}

export function decryptApiKey(cipherB64: string, nonceB64: string) {
  const key = getKey();
  const iv = Buffer.from(nonceB64, 'base64');
  const packed = Buffer.from(cipherB64, 'base64');
  const tag = packed.subarray(packed.length - 16);
  const ciphertext = packed.subarray(0, packed.length - 16);

  const dec = crypto.createDecipheriv('aes-256-gcm', key, iv);
  dec.setAuthTag(tag);
  const plain = Buffer.concat([dec.update(ciphertext), dec.final()]);
  return plain.toString('utf8');
}
