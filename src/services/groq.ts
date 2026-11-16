/**
 * AGC AI Core Service
 * Routes AgcBot queries to the server-side AI gateway (/api/ai/chat),
 * powered by the Admin AI Bot Data Center & strict AGC-only domain guardrails.
 */

export const AFRIBOT_ID = 'chat_afribot_ai';
export const AFRIBOT_NAME = 'AgcBot';
export const AFRIBOT_PHONE = '+234 BOT AI';
export const AFRIBOT_TAG = '@AgcBot';

export const AFRIBOT_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='bgGrad' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%237c3aed'/><stop offset='50%' stop-color='%23ec4899'/><stop offset='100%' stop-color='%2306b6d4'/></linearGradient></defs><circle cx='50' cy='50' r='48' fill='url(%23bgGrad)'/><rect x='28' y='32' width='44' height='36' rx='10' fill='white'/><circle cx='40' cy='48' r='5' fill='%237c3aed'/><circle cx='60' cy='48' r='5' fill='%237c3aed'/><path d='M42 58 Q50 64 58 58' stroke='%237c3aed' stroke-width='3' stroke-linecap='round' fill='none'/><rect x='47' y='22' width='6' height='10' rx='3' fill='white'/><circle cx='50' cy='20' r='4' fill='%23ec4899'/><circle cx='32' cy='50' r='2' fill='%2306b6d4'/><circle cx='68' cy='50' r='2' fill='%2306b6d4'/></svg>";

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AskGroqOptions {
  isGroup?: boolean;
  groupName?: string;
  senderName?: string;
  systemPromptAddition?: string;
}

export async function askGroqAi(
  messages: GroqMessage[],
  options?: AskGroqOptions
): Promise<string> {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.slice(-12),
        options: options || {},
      }),
    });

    const data = await response.json().catch(() => null);
    if (response.ok && data?.reply) {
      return String(data.reply).trim();
    }
    if (data?.error) {
      return String(data.error);
    }
  } catch (_) {
    // Network interruption fallback
  }

  return "I'm having a brief connection hiccup reaching AGC Intelligence. Please try asking about AGC again in a moment.";
}
