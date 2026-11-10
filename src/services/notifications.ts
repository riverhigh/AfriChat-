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

export const showLocalNotification = (title: string, body: string, icon = '/icon-192.png', url = '/') => {
  if (typeof window === 'undefined') return;

  // 1. Try Service Worker showNotification if active
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        body,
        icon,
        badge: '/icon-192.png',
        data: { url },
      });
    }).catch(() => {
      // Fallback to browser Notification
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
