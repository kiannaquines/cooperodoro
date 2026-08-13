/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event) => {
  const payload = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Cooperodoro", {
      body: payload.body ?? "Your timer is complete.",
      icon: payload.icon ?? "/icons/icon-192.png",
      badge: payload.badge ?? "/icons/icon-192.png",
      tag: payload.tag ?? "pomodoro-complete",
      data: { url: payload.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url ?? "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existing && "focus" in existing) {
        await existing.focus();
        return;
      }
      await self.clients.openWindow(destination);
    }),
  );
});
