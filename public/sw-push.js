// Web Push & Notification Click handlers imported by VitePWA Workbox Service Worker
// Also works standalone in development mode without fetch interception.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function hasVisibleFocusedClient() {
  try {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    return clientList.some(
      (client) =>
        client &&
        client.visibilityState === 'visible' &&
        (typeof client.focused === 'boolean' ? client.focused : true)
    );
  } catch (_) {
    return false;
  }
}

async function closeCallNotificationsByRoom(roomId) {
  if (!roomId || !self.registration?.getNotifications) return;
  try {
    const tag = 'call_' + roomId;
    const existing = await self.registration.getNotifications({ tag });
    existing.forEach((n) => n.close());
  } catch (_) {}
}

self.addEventListener('push', (event) => {
  let data = {
    type: 'general',
    title: 'AGC Notification',
    body: 'You have a new update on AGC (All Good Connects).',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: undefined,
    requireInteraction: false,
    renotify: false,
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (_) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    (async () => {
      const pushType = data.type || data.data?.type || 'general';
      const roomId = data.roomId || data.data?.roomId;

      // Silent cancel: dismiss ringing notification if caller cancelled or another device answered
      if (pushType === 'call_cancelled') {
        await closeCallNotificationsByRoom(roomId);
        return;
      }

      // If this is an incoming call and user is actively looking at an open focused AGC window,
      // the in-app IncomingCallModal is already ringing — skip duplicate OS banner.
      if (pushType === 'incoming_call') {
        const isForeground = await hasVisibleFocusedClient();
        if (isForeground) {
          return;
        }
      }

      // If this is a missed call update, close any prior ringing banner for the same roomId first
      if (pushType === 'missed_call' && roomId) {
        await closeCallNotificationsByRoom(roomId);
      }

      const defaultActions =
        pushType === 'incoming_call'
          ? [
              { action: 'answer', title: 'Answer' },
              { action: 'decline', title: 'Decline' },
            ]
          : pushType === 'missed_call'
          ? [
              { action: 'open', title: 'View Call' },
              { action: 'close', title: 'Dismiss' },
            ]
          : [
              { action: 'open', title: 'Open AGC' },
              { action: 'close', title: 'Dismiss' },
            ];

      const options = {
        body: data.body,
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/icon-192.png',
        tag: data.tag || (roomId ? 'call_' + roomId : undefined),
        renotify: Boolean(data.renotify || pushType === 'incoming_call' || pushType === 'missed_call'),
        requireInteraction: Boolean(
          data.requireInteraction !== undefined ? data.requireInteraction : pushType === 'incoming_call'
        ),
        vibrate:
          pushType === 'incoming_call'
            ? [300, 150, 300, 150, 300, 350, 300, 150, 300]
            : [120, 60, 120],
        timestamp: Date.now(),
        data: {
          url: data.url || data.data?.url || '/',
          ...(data.data || {}),
          type: pushType,
          roomId,
        },
        actions: Array.isArray(data.actions) && data.actions.length > 0 ? data.actions : defaultActions,
      };

      await self.registration.showNotification(data.title || 'AGC Notification', options);
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const action = event.action || 'open';

  if (action === 'close') return;

  if (action === 'decline' && notifData.roomId) {
    event.waitUntil(
      (async () => {
        try {
          await fetch('/api/push/call-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'decline',
              roomId: notifData.roomId,
              callerPhone: notifData.callerPhone || '',
              callerName: notifData.callerName || '',
              callType: notifData.callType || 'voice',
              chatId: notifData.chatId || '',
              targetPhone: notifData.targetPhone || '',
              receiverName: notifData.receiverName || '',
              isGroupCall: Boolean(notifData.isGroupCall),
              groupName: notifData.groupName || '',
            }),
          });
        } catch (_) {}

        try {
          const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          for (const client of clients) {
            if (client.url.includes(self.location.origin)) {
              client.postMessage({
                type: 'AGC_CALL_ACTION',
                action: 'decline',
                payload: notifData,
              });
            }
          }
        } catch (_) {}
      })()
    );
    return;
  }

  let targetUrl = notifData.url || '/';
  if (action === 'answer' && notifData.roomId) {
    try {
      const parsed = new URL(targetUrl, self.location.origin);
      parsed.searchParams.set('call', notifData.roomId);
      parsed.searchParams.set('accept', '1');
      if (notifData.callType) parsed.searchParams.set('type', notifData.callType);
      targetUrl = parsed.pathname + parsed.search;
    } catch (_) {}
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          try {
            await client.focus();
          } catch (_) {}
          try {
            client.postMessage({
              type: 'AGC_PUSH_DEEP_LINK',
              action,
              url: targetUrl,
              data: notifData,
            });
            return client;
          } catch (_) {
            if ('navigate' in client) {
              return Promise.resolve(client.navigate(targetUrl))
                .catch(() => client)
                .then(() => client.focus());
            }
            return client;
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
