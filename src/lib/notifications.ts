import { supabase } from "./supabase";

const urlBase64ToUint8Array = (value: string): Uint8Array<ArrayBuffer> => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
};

export const enablePushNotifications = async (userId: string): Promise<void> => {
  if (!supabase) throw new Error("Cloud notifications require Supabase configuration.");
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications are not supported in this browser.");
  }
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
  if (!vapidKey || vapidKey.includes("your_vapid")) throw new Error("Add the VAPID public key first.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
  const serialized = subscription.toJSON();
  if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
    throw new Error("The browser returned an incomplete push subscription.");
  }
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: serialized.endpoint,
      p256dh: serialized.keys.p256dh,
      auth: serialized.keys.auth,
      user_agent: navigator.userAgent,
      is_active: true,
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) throw error;
};

export const playCompletionSound = (sound: string): void => {
  if (sound === "none") return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.8);
  gain.connect(context.destination);
  const frequencies = sound === "wood-block" ? [420] : sound === "digital-chime" ? [740, 990] : [520, 780];
  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = sound === "wood-block" ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(context.currentTime + index * 0.16);
    oscillator.stop(context.currentTime + 0.72 + index * 0.16);
  });
  window.setTimeout(() => void context.close(), 1400);
};

export const showLocalNotification = async (title: string, body: string): Promise<void> => {
  if (Notification.permission !== "granted" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "pomodoro-complete",
  });
};
