import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
// web-push uses Buffer, so we MUST polyfill it for Deno
import { Buffer } from "https://deno.land/std@0.168.0/node/buffer.ts";
globalThis.Buffer = Buffer;
globalThis.process = { env: {} } as any; // Polyfill process process.nextTick etc might be needed

import webpush from "https://esm.sh/web-push@3.6.3?target=deno";

// Create Supabase Client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// VAPID Keys
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
const vapidSubject = "mailto:admin@autono.com";

if (vapidPublicKey && vapidPrivateKey) {
    try {
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
        console.log("VAPID Configured Successfully");
    } catch (e) {
        console.error("VAPID Config Error:", e);
    }
} else {
    console.error("VAPID Keys Missing in Env");
}

console.log("Push Notification Function Initialized");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { record, type } = await req.json();

        console.log(`Received trigger: ${type}`);

        // We only care about NEW notifications being inserted
        if (type !== 'INSERT' || !record.user_id || !record.title) {
            console.log("Skipping: Not a valid notification insert trigger");
            return new Response(JSON.stringify({ message: "Skipped" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const userId = record.user_id;
        const title = record.title;
        const body = record.body || "";
        const url = record.data?.url || "/";

        console.log(`Processing push for user: ${userId}, Title: ${title}`);

        // 1. Fetch Subscriptions for Target User
        const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", userId);

        if (!subscriptions || subscriptions.length === 0) {
            console.log(`No subscriptions found for user ${userId}`);
            return new Response(JSON.stringify({ message: "No subscriptions" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 2. Send Notifications
        const notificationPayload = JSON.stringify({ title, body, url });
        console.log(`Sending to ${subscriptions.length} devices...`);

        const promises = subscriptions.map((sub) => {
            return webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                },
                notificationPayload
            ).catch((err) => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`Subscription ${sub.id} expired/gone. Deleting.`);
                    supabase.from("push_subscriptions").delete().eq("id", sub.id).then();
                } else {
                    console.error("Push Error:", err);
                }
            });
        });

        await Promise.all(promises);

        return new Response(JSON.stringify({ success: true, count: subscriptions.length }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error processing trigger:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
