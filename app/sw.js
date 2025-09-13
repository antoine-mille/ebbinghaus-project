/* global self */

self.addEventListener("push", (event) => {
  try {
    const data = event.data ? (() => { try { return event.data.json(); } catch { return { body: event.data.text() }; } })() : {};
    const title = data.title || "Notification";
    const options = {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // no-op
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data || {}).url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const win = clientList.find((c) => (c.url || "").includes(url));
      if (win && "focus" in win) return win.focus();
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })
  );
});

