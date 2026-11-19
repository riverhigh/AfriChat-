export type WebPushStatus =
  | 'subscribed'
  | 'default'
  | 'denied'
  | 'ios_install_required'
  | 'unsupported'
  | 'error';

export interface SubscribeWebPushResult {
  ok: boolean;
  status: WebPushStatus;
  subscription?: PushSubscription;
  error?: string;
}

export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
};

export const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
};

export const isWebPushSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

export const getNotificationPermissionState = (): NotificationPermission | 'unsupported' => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const getOrRegisterPushServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const existingRegs = await navigator.serviceWorker.getRegistrations();
    const activeReg = existingRegs.find(
      (r) =>
        r.active?.scriptURL?.includes('/sw.js') ||
        r.active?.scriptURL?.includes('/sw-push.js') ||
        r.installing?.scriptURL?.includes('/sw-push.js') ||
        r.waiting?.scriptURL?.includes('/sw-push.js')
    );

    if (activeReg) {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
      return activeReg;
    }

    // Wait briefly in PROD for VitePWA SW registration first
    if (!import.meta.env.DEV) {
      const readyReg = await Promise.race<ServiceWorkerRegistration | null>([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
      ]);
      if (readyReg) return readyReg;
    }

    // Register lightweight standalone /sw-push.js (handles push + notificationclick without fetch caching)
    const reg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    return reg;
  } catch (err) {
    console.warn('Notice registering push service worker:', err);
    return null;
  }
};

export const getExistingPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!isWebPushSupported()) return null;
  try {
    const reg = await getOrRegisterPushServiceWorker();
    if (!reg?.pushManager) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
};

export const getWebPushStatus = async (): Promise<WebPushStatus> => {
  if (typeof window === 'undefined') return 'unsupported';
  if (isIOSDevice() && !isStandalonePWA() && !('Notification' in window)) {
    return 'ios_install_required';
  }
  if (!isWebPushSupported()) {
    return isIOSDevice() && !isStandalonePWA() ? 'ios_install_required' : 'unsupported';
  }
  const perm = Notification.permission;
  if (perm === 'denied') return 'denied';
  if (perm !== 'granted') {
    return isIOSDevice() && !isStandalonePWA() ? 'ios_install_required' : 'default';
  }
  const sub = await getExistingPushSubscription();
  return sub ? 'subscribed' : 'default';
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
    }
  }

  return false;
};

export const subscribeUserToWebPush = async (
  phoneNumber: string,
  userId?: string,
  askPermission = false
): Promise<SubscribeWebPushResult> => {
  if (typeof window === 'undefined') {
    return { ok: false, status: 'unsupported' };
  }

  if (isIOSDevice() && !isStandalonePWA() && !('Notification' in window)) {
    return {
      ok: false,
      status: 'ios_install_required',
      error: 'Add AGC to your iPhone/iPad Home Screen first to enable lock-screen alerts.',
    };
  }

  if (!isWebPushSupported()) {
    const status = isIOSDevice() && !isStandalonePWA() ? 'ios_install_required' : 'unsupported';
    return {
      ok: false,
      status,
      error:
        status === 'ios_install_required'
          ? 'Open Safari Share -> Add to Home Screen to unlock iOS lock-screen push alerts.'
          : 'Web Push is not supported in this browser.',
    };
  }

  try {
    let granted = Notification.permission === 'granted';
    if (!granted && askPermission && Notification.permission !== 'denied') {
      granted = await requestNotificationPermission();
    }

    if (Notification.permission === 'denied') {
      return { ok: false, status: 'denied', error: 'Notifications are blocked in browser settings.' };
    }
    if (!granted) {
      return { ok: false, status: 'default' };
    }

    const reg = await getOrRegisterPushServiceWorker();
    if (!reg?.pushManager) {
      return { ok: false, status: 'error', error: 'Push service worker could not initialize.' };
    }

    const vapidRes = await fetch('/api/push/vapid-public-key');
    const vapidData = await vapidRes.json().catch(() => null);
    const publicKey: string = vapidData?.publicKey || '';
    if (!publicKey) {
      return { ok: false, status: 'error', error: 'Server VAPID public key unavailable.' };
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    if (phoneNumber) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          phoneNumber,
          userId: userId || '',
        }),
      });
    }

    return { ok: true, status: 'subscribed', subscription: sub };
  } catch (err: any) {
    console.warn('Web Push subscription error:', err);
    return { ok: false, status: 'error', error: err?.message || 'Could not enable push alerts.' };
  }
};

export const unsubscribeUserFromWebPush = async (phoneNumber?: string): Promise<boolean> => {
  try {
    const sub = await getExistingPushSubscription();
    if (!sub) return true;
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => {});
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, phoneNumber }),
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
};

export const sendPushCallNotifyFallback = (
  targetPhones: string[],
  event: 'incoming_call' | 'call_declined' | 'call_ended',
  data: any
) => {
  if (typeof window === 'undefined' || !targetPhones || targetPhones.length === 0) return;
  fetch('/api/push/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetPhones, event, data }),
  }).catch(() => {});
};

export const sendTestLockScreenPush = async (
  phoneNumber: string,
  userName?: string
): Promise<{ ok: boolean; sent?: number; error?: string }> => {
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, userName }),
    });
    const data = await res.json().catch(() => ({}));
    return {
      ok: Boolean(res.ok && data?.success),
      sent: data?.sent,
      error: data?.error,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to send test alert' };
  }
};

export const showLocalNotification = (title: string, body: string, icon = '/icon-192.png', url = '/') => {
  if (typeof window === 'undefined') return;

  // 1. Try Service Worker showNotification if active
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        const reg = regs.find((r) => r.active);
        if (reg) {
          return reg.showNotification(title, {
            body,
            icon,
            badge: '/icon-192.png',
            data: { url },
          });
        }
        fallbackBrowserNotification(title, body, icon);
      })
      .catch(() => {
        fallbackBrowserNotification(title, body, icon);
      });
    return;
  }

  fallbackBrowserNotification(title, body, icon);
};

const fallbackBrowserNotification = (title: string, body: string, icon: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon });
    } catch (_) {}
  }
};
