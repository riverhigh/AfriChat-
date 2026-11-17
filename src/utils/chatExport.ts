import { ChatMessage, ChatThread, UserProfile } from '../types';

function formatMessageSummary(msg: ChatMessage): string {
  if (msg.deleted) {
    return '[Message deleted]';
  }
  switch (msg.type) {
    case 'image':
      return `[Photo${msg.oneTimeView ? ' · 1-Time View' : ''}] ${msg.text || ''}`.trim();
    case 'voice':
      return `[Voice Note${msg.voiceNote?.durationSeconds ? ` · ${msg.voiceNote.durationSeconds}s` : ''}] ${msg.voiceNote?.transcript || msg.text || ''}`.trim();
    case 'location':
      return `[Location: ${msg.locationData?.addressName || `${msg.locationData?.latitude}, ${msg.locationData?.longitude}`}]`;
    case 'quick_poll':
      return msg.quickPoll
        ? `[Poll: ${msg.quickPoll.question} (${msg.quickPoll.options.map((o) => `${o.text}: ${o.voterIds.length}`).join(' | ')})]`
        : '[Poll]';
    case 'financial_poll':
      return msg.financialPoll ? `[Financial Poll: ${msg.financialPoll.title}]` : '[Financial Poll]';
    case 'invoice_receipt':
      return `[Invoice${msg.invoice || msg.invoiceData ? ` #${(msg.invoice || msg.invoiceData)?.invoiceNumber} · ${(msg.invoice || msg.invoiceData)?.totalAmount}` : ''}]`;
    case 'escrow_receipt':
      return `[Escrow Order: ${(msg.order)?.totalAmount || 0} - ${(msg.order)?.status || 'active'}]`;
    case 'bill_request':
      return `[Bill Request: ${msg.billRequest?.amount || 0}]`;
    default:
      return msg.text || '';
  }
}

export function buildChatTranscriptText(
  chat: ChatThread,
  messages: ChatMessage[],
  currentUser: UserProfile | null
): string {
  const title = chat.isGroup ? `Group: ${chat.name}` : `Chat with ${chat.name}`;
  const header = [
    '====================================================',
    'AGC (All Good Connects) - Chat Transcript',
    title,
    `Exported: ${new Date().toLocaleString()}`,
    `Messages: ${messages.length}`,
    chat.disappearingTimer && chat.disappearingTimer !== 'off'
      ? `Ghost Timer: ${chat.disappearingTimer}`
      : null,
    '====================================================',
    '',
  ]
    .filter(Boolean)
    .join('\n');

  const lines = messages.map((msg) => {
    const sender =
      msg.sender === 'system'
        ? 'System'
        : msg.sender === 'user'
        ? currentUser?.fullName || 'You'
        : msg.senderName || chat.name || 'Contact';
    const timeLabel = msg.timestamp || '';
    const ghostTag = msg.isGhost ? ' [Ghost]' : '';
    const replyTag = msg.replyTo
      ? ` (Replying to ${msg.replyTo.sender}: "${(msg.replyTo.text || '').slice(0, 40)}")`
      : '';
    return `[${timeLabel}] ${sender}${ghostTag}${replyTag}: ${formatMessageSummary(msg)}`;
  });

  return `${header}${lines.join('\n')}\n`;
}

export function exportChatTranscript(
  chat: ChatThread,
  messages: ChatMessage[],
  currentUser: UserProfile | null
): void {
  const content = buildChatTranscriptText(chat, messages, currentUser);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeName = (chat.name || 'agc_chat')
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  const datePart = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName || 'agc_chat'}_transcript_${datePart}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
