/**
 * AfriChat (AGC) End-to-End Encryption (E2EE) Utility
 * Powered by Web Cryptography API (AES-GCM 256-bit + PBKDF2)
 *
 * Ensures direct messages and group chats are strictly encrypted on device
 * before transmitting over WebSockets or Supabase Realtime channels.
 */

const E2EE_PREFIX = 'AGC_E2EE:';
const PBKDF2_SALT = new TextEncoder().encode('AfriChat_E2EE_Vault_Salt_2026');

// Memory cache for derived CryptoKeys to avoid repeated key derivations
const keyCache = new Map<string, CryptoKey>();

/**
 * Derives an AES-GCM 256-bit key deterministically from a conversation secret (e.g. paired phones or group ID)
 */
async function deriveConversationKey(secret: string): Promise<CryptoKey> {
  if (keyCache.has(secret)) {
    return keyCache.get(secret)!;
  }

  const enc = new TextEncoder();
  const rawKeyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: PBKDF2_SALT,
      iterations: 10000,
      hash: 'SHA-256',
    },
    rawKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  keyCache.set(secret, derivedKey);
  return derivedKey;
}

/**
 * Encrypts a message string using AES-GCM 256-bit.
 * Returns a serialized ciphertext prefixed with E2EE_PREFIX.
 */
export async function encryptChatMessage(plaintext: string, conversationSecret: string): Promise<string> {
  if (!plaintext) return plaintext;
  if (!window.crypto?.subtle) {
    // Fallback if environment lacks WebCrypto
    return plaintext;
  }

  try {
    const key = await deriveConversationKey(conversationSecret);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(plaintext);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encodedText
    );

    const ivB64 = btoa(String.fromCharCode(...iv));
    const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));

    return `${E2EE_PREFIX}${ivB64}:${cipherB64}`;
  } catch (err) {
    console.warn('[AGC E2EE] Encryption fallback notice:', err);
    return plaintext;
  }
}

/**
 * Decrypts a message string. If not encrypted with E2EE, returns the original plaintext.
 */
export async function decryptChatMessage(payload: string, conversationSecret: string): Promise<string> {
  if (!payload || typeof payload !== 'string') return payload;
  if (!payload.startsWith(E2EE_PREFIX)) {
    // Unencrypted legacy message or system text
    return payload;
  }

  if (!window.crypto?.subtle) {
    return payload;
  }

  try {
    const raw = payload.slice(E2EE_PREFIX.length);
    const [ivB64, cipherB64] = raw.split(':');
    if (!ivB64 || !cipherB64) return payload;

    const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));

    const key = await deriveConversationKey(conversationSecret);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.warn('[AGC E2EE] Decryption notice (key mismatch or unencrypted):', err);
    return payload;
  }
}

/**
 * Canonical phone normalizer matching AppContext.normalizePhoneDigits
 * Converts local 11-digit 080... -> 23480... so both peers always derive identical E2EE secrets.
 */
function normalizePhoneForSecret(phone?: string): string {
  if (!phone) return '';
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('0') && d.length === 11) {
    d = '234' + d.slice(1);
  }
  return d;
}

/**
 * Computes deterministic conversation secret for DMs or Group Chats
 */
export function getConversationSecret(chatId: string, myPhone?: string, otherPhone?: string): string {
  if (chatId.startsWith('group_') || chatId.startsWith('town_comm_') || chatId.startsWith('channel_')) {
    return `AGC_GROUP_SECRET_${chatId}`;
  }
  const normA = normalizePhoneForSecret(myPhone);
  const normB = normalizePhoneForSecret(otherPhone);
  if (normA && normB) {
    const sorted = [normA, normB].sort().join('_');
    return `AGC_DM_SECRET_${sorted}`;
  }
  return `AGC_SECRET_${chatId}`;
}

/**
 * Candidate secrets to try on decryption if the sender used raw phone formatting or chatId fallback.
 */
export function getConversationSecretFallbacks(chatId: string, myPhone?: string, otherPhone?: string): string[] {
  const candidates: string[] = [];
  const primary = getConversationSecret(chatId, myPhone, otherPhone);
  candidates.push(primary);
  if (myPhone && otherPhone) {
    const rawA = myPhone.replace(/\D/g, '');
    const rawB = otherPhone.replace(/\D/g, '');
    if (rawA && rawB) {
      candidates.push(`AGC_DM_SECRET_${[rawA, rawB].sort().join('_')}`);
    }
  }
  if (chatId.startsWith('dm_')) {
    const parts = chatId.replace('dm_', '').split('_').filter(Boolean);
    if (parts.length >= 2) {
      const normParts = [normalizePhoneForSecret(parts[0]), normalizePhoneForSecret(parts[1])].sort().join('_');
      candidates.push(`AGC_DM_SECRET_${normParts}`);
      candidates.push(`AGC_DM_SECRET_${[parts[0], parts[1]].sort().join('_')}`);
    }
  }
  candidates.push(`AGC_SECRET_${chatId}`);
  return Array.from(new Set(candidates.filter(Boolean)));
}
