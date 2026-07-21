self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch (_) {
    payload = { body: event.data?.text() || "A new conversation started." };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "New portfolio chat", {
      body: payload.body || "Someone just started a conversation.",
      icon: "/static/pwa-192.png?v=1",
      badge: "/static/pwa-192.png?v=1",
      tag: payload.tag || "portfolio-chat",
      renotify: true,
      data: { url: payload.url || "/studio" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/studio", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(`${self.location.origin}/studio`));
      if (existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
