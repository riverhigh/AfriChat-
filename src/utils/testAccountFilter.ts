const SYNTHETIC_LAST9_PHONES = new Set([
  '800000000',
  '800000001',
  '000000001', // +2348000000001 Test User
  '099988877', // +2348099988877 Chidi Okafor
  '055511122', // +2348055511122 Amaka Nwosu
  '099911101', // +2348099911101 Bet Tester One
  '099911102', // +2348099911102 Bet Tester Two
  '999000111',
  '990001111', // 2349990001111 Test Payer
  '990002222', // 2349990002222 Test Requester
  '812345678',
  '123456789',
]);

const SYNTHETIC_EXACT_NAMES = new Set([
  'bet tester one',
  'bet tester two',
  'test user',
  'test payer',
  'test requester',
  'chidi okafor',
  'amaka nwosu',
  'chioma adebayo',
  'tunde balogun',
]);

export function isSyntheticTestUser(input?: {
  id?: string;
  fullName?: string;
  name?: string;
  username?: string;
  phoneNumber?: string;
  phone?: string;
  rawPhoneNumber?: string;
  normalizedPhoneNumber?: string;
  full_phone?: string;
  phone_digits?: string;
} | null): boolean {
  if (!input) return false;
  const idStr = String(input.id || '').trim().toLowerCase();
  if (
    idStr === 'usr_test' ||
    idStr === 'usr_chioma_adebayo' ||
    idStr.startsWith('usr_test_') ||
    idStr.startsWith('usr_fresh_test') ||
    idStr === 'usr_2348099911101' ||
    idStr === 'usr_2348099911102' ||
    idStr === 'usr_2348000000001' ||
    idStr === 'usr_2348099988877' ||
    idStr === 'usr_2348055511122'
  ) {
    return true;
  }

  const rawPhone =
    input.phoneNumber ||
    input.phone ||
    input.normalizedPhoneNumber ||
    input.rawPhoneNumber ||
    input.full_phone ||
    input.phone_digits ||
    '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits) {
    const last9 = digits.length >= 9 ? digits.slice(-9) : digits;
    if (SYNTHETIC_LAST9_PHONES.has(last9)) return true;
    if (/^(234)?80999111\d+$/.test(digits)) return true;
    if (/^(234)?999000\d+$/.test(digits)) return true;
    if (/^(234)?800000000\d+$/.test(digits)) return true;
  }

  const candidateNames = [input.fullName, input.name, input.username]
    .filter(Boolean)
    .map((n) => String(n).trim().toLowerCase());

  for (const name of candidateNames) {
    if (SYNTHETIC_EXACT_NAMES.has(name)) return true;
    if (/\b(bet\s*tester|test\s*user|test\s*payer|test\s*requester|bot\s*tester|spam\s*bot)\b/i.test(name)) {
      return true;
    }
  }

  return false;
}
