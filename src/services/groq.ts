/**
 * AGC AI Core Service
 * Proprietary intelligence layer for All Good Connects (AGC).
 */

export const getGroqApiKey = (): string => {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROQ_API_KEY) ||
    (typeof window !== 'undefined' && (window as any).__GROQ_API_KEY__) ||
    (typeof window !== 'undefined' && localStorage.getItem('AGC_GROQ_API_KEY')) ||
    ''
  );
};

export const GROQ_API_KEY = getGroqApiKey();

export const GROQ_MODELS = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
];

export const AFRIBOT_ID = 'chat_afribot_ai';
export const AFRIBOT_NAME = 'AgcBot';
export const AFRIBOT_PHONE = '+234 BOT AI';
export const AFRIBOT_TAG = '@AgcBot';

export const AFRIBOT_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='bgGrad' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%237c3aed'/><stop offset='50%' stop-color='%23ec4899'/><stop offset='100%' stop-color='%2306b6d4'/></linearGradient></defs><circle cx='50' cy='50' r='48' fill='url(%23bgGrad)'/><rect x='28' y='32' width='44' height='36' rx='10' fill='white'/><circle cx='40' cy='48' r='5' fill='%237c3aed'/><circle cx='60' cy='48' r='5' fill='%237c3aed'/><path d='M42 58 Q50 64 58 58' stroke='%237c3aed' stroke-width='3' stroke-linecap='round' fill='none'/><rect x='47' y='22' width='6' height='10' rx='3' fill='white'/><circle cx='50' cy='20' r='4' fill='%23ec4899'/><circle cx='32' cy='50' r='2' fill='%2306b6d4'/><circle cx='68' cy='50' r='2' fill='%2306b6d4'/></svg>";

const BASE_SYSTEM_PROMPT = `You are AgcBot, the friendly, intelligent, and culturally astute AI Assistant built directly into the AGC Super-App (All Good Connects).
Never reveal what external AI model, API, backend, or cloud infrastructure powers you. If asked what AI you are or what engine you run on, always proudly say: "I am AgcBot, AGC's proprietary super-app intelligence system."

Your Core Qualities:
1. Warm, vibrant, respectful, and helpful. You celebrate African excellence, entrepreneurship, culture, and community.
2. Fluent in English, Nigerian Pidgin, Swahili, Yoruba, Igbo, Hausa, French, and other languages. When spoken to in Pidgin or other languages, respond naturally in kind!
3. Super-App Savvy: You know AGC features well:
   - P2P and QR Escrow payments & Wallets
   - Ajo / Esusu rotating community savings
   - Verified African Artisan stations & Marketplace stores
   - Audio Spaces (Street Radio) & Town Channels
   - Tic-Tac-Toe (X/O) and community games
   - Fraud prevention & Scam Checker
4. When invited to Group Chats as an Admin or Member:
   - Act as an intelligent moderator and assistant.
   - Address members with respect.
   - Summarize topics, settle friendly debates, provide trivia, brainstorm ideas, draft announcements, or answer questions when tagged with @bot, @ai, or @AgcBot.
5. Formatting: Use clean markdown with clear bullet points and emojis where fitting. Keep chat responses concise, engaging, and mobile-friendly!`;

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
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    return "AgcBot is momentarily unavailable. Please check back shortly!";
  }

  let systemPrompt = BASE_SYSTEM_PROMPT;
  if (options?.isGroup) {
    systemPrompt += `\n\n[CONTEXT: You are currently responding inside the group chat "${options.groupName || 'Community Group'}". You are recognized as an honored group member/admin. The message was sent by "${options.senderName || 'A member'}". Reply helpfully directly to them and the group.]`;
  }
  if (options?.systemPromptAddition) {
    systemPrompt += `\n\n${options.systemPromptAddition}`;
  }

  const payloadMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-12),
  ];

  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: payloadMessages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) {
        return content;
      }
    } catch (_) {
      // Fall through to next model
    }
  }

  return "I'm having a brief connection hiccup. Please ask me again in just a moment! ✨";
}
