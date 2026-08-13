import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

type ClaimedDelivery = {
  delivery_id: string;
  timer_run_id: string;
  subscription_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  phase: "focus" | "short_break" | "long_break";
  attempts: number;
};

type PushError = Error & { statusCode?: number };

const requiredEnv = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const retryDelayMinutes = (attempts: number): number =>
  Math.min(30, 2 ** Math.max(0, attempts - 1));

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const vapidSubject = requiredEnv("VAPID_SUBJECT");
    const vapidPublicKey = requiredEnv("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = requiredEnv("VAPID_PRIVATE_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const { data, error } = await supabase.rpc("claim_due_timer_notifications", {
      batch_size: 100,
    });
    if (error) throw error;

    const deliveries = (data ?? []) as ClaimedDelivery[];
    const results = await Promise.allSettled(
      deliveries.map(async (delivery) => {
        const title = delivery.phase === "focus" ? "Focus session complete" : "Break complete";
        const payload = JSON.stringify({
          title,
          body: "Open Cooperodoro when you are ready to continue.",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          url: "/",
          timerRunId: delivery.timer_run_id,
          tag: `timer-${delivery.timer_run_id}`,
        });

        try {
          await webpush.sendNotification(
            {
              endpoint: delivery.endpoint,
              keys: { p256dh: delivery.p256dh, auth: delivery.auth_key },
            },
            payload,
            { TTL: 300, urgency: "high" },
          );

          const { error: updateError } = await supabase
            .from("timer_notification_deliveries")
            .update({ sent_at: new Date().toISOString(), claimed_at: null, last_error: null })
            .eq("id", delivery.delivery_id)
            .is("sent_at", null);
          if (updateError) throw updateError;

          await supabase
            .from("push_subscriptions")
            .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
            .eq("id", delivery.subscription_id);
        } catch (error) {
          const pushError = error as PushError;
          const isExpired = pushError.statusCode === 404 || pushError.statusCode === 410;
          const nextAttemptAt = new Date(
            Date.now() + retryDelayMinutes(delivery.attempts) * 60_000,
          ).toISOString();

          await supabase
            .from("timer_notification_deliveries")
            .update({
              claimed_at: null,
              next_attempt_at: nextAttemptAt,
              last_error: pushError.message.slice(0, 1000),
              ...(isExpired ? { attempts: 5 } : {}),
            })
            .eq("id", delivery.delivery_id)
            .is("sent_at", null);

          if (isExpired) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", delivery.subscription_id);
          } else {
            await supabase
              .from("push_subscriptions")
              .update({ failure_count: delivery.attempts })
              .eq("id", delivery.subscription_id);
          }

          throw error;
        }
      }),
    );

    return jsonResponse({
      claimed: deliveries.length,
      sent: results.filter((result) => result.status === "fulfilled").length,
      failed: results.filter((result) => result.status === "rejected").length,
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown dispatch error" },
      500,
    );
  }
});
