import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import webpush from "https://esm.sh/web-push@3.6.3";

// Create Supabase Client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// VAPID Keys
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = "mailto:admin@autono.com"; // Replace with real email

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

console.log("Push Notification Function Initialized");

serve(async (req) => {
    try {
        const { record, type, old_record } = await req.json();

        console.log(`Received trigger: ${type}`);

        let userId = null;
        let title = "SUNOMSI";
        let body = "New notification";
        let url = "/";

        // 1. Determine Target User and content based on Trigger Type
        if (type === "INSERT" && record.conversation_id) {
            // Assume CHAT MESSAGE trigger (table: messages)
            // We need to fetch the conversation to find the OTHER user
            const { data: conv } = await supabase.from('conversations').select('participant_ids').eq('id', record.conversation_id).single();
            if (conv) {
                // Target the user who is NOT the sender
                userId = conv.participant_ids.find((id: string) => id !== record.sender_id);
            }

            // Handle "Start chatting" initial message
            const { data: sender } = await supabase.from('users').select('display_name').eq('id', record.sender_id).single();
            title = sender?.display_name || "New Message";
            body = record.body || "Sent you a photo";
            url = `/messages/${record.conversation_id}`;
        }
        else if (type === "INSERT" && record.task_id && record.offer_price) {
            // Assume NEW OFFER trigger (table: applications)
            const { data: task } = await supabase.from('tasks').select('created_by, title').eq('id', record.task_id).single();
            if (task) {
                userId = task.created_by;
                title = "New Offer!";
                body = `Someone offered ₹${record.offer_price} for "${task.title}"`;
                url = `/tasks/${record.task_id}`;
            }
        }
        else if (type === "UPDATE" && record.status === 'accepted' && old_record.status !== 'accepted') {
            // Assume OFFER ACCEPTED (table: applications)
            userId = record.worker_id;
            title = "Offer Accepted! 🎉";
            body = "Congratulations! Your offer has been accepted.";
            url = `/tasks/${record.task_id}`;
            // Also notify Task Owner? They processed it, so no.
        }
        else if (type === "UPDATE" && record.status === 'completed' && old_record.status !== 'completed' && record.title) {
            // Assume TASK COMPLETED (table: tasks)
            // Note: Task completion is usually done by owner.
            // If we want to notify worker? "Task marked as complete"
            // We need to find the accepted worker.
            const { data: app } = await supabase.from('applications').select('worker_id').eq('task_id', record.id).eq('status', 'accepted').single();
            if (app) {
                userId = app.worker_id;
                title = "Job Completed ✅";
                body = `"${record.title}" has been marked as completed.`;
                url = `/tasks/${record.id}`;
            }
        }
        else if (type === "INSERT" && record.rating) {
            // Assume REVIEW (table: reviews)
            userId = record.worker_id;
            title = "New Review ⭐";
            body = `You received a ${record.rating}-star review!`;
            url = `/profile`;
        }

        if (!userId) {
            console.log("No target user identified, skipping push.");
            return new Response(JSON.stringify({ message: "Skipped" }), { headers: { "Content-Type": "application/json" } });
        }

        // 2. STORE NOTIFICATION (In-App History)
        const { error: dbError } = await supabase.from('notifications').insert({
            user_id: userId,
            title: title,
            body: body,
            data: { url: url }
        });

        if (dbError) console.error("Error saving notification to DB:", dbError);

        // 3. Fetch Subscriptions for Target User
        const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", userId);

        if (!subscriptions || subscriptions.length === 0) {
            console.log(`No subscriptions found for user ${userId}`);
            return new Response(JSON.stringify({ message: "Saved to DB, but no push subs" }), { headers: { "Content-Type": "application/json" } });
        }

        // 4. Send Notifications
        const notificationPayload = JSON.stringify({ title, body, url });
        console.log(`Sending to ${subscriptions.length} devices...`);

        const promises = subscriptions.map((sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: atob(sub.p256dh), // Database stores base64, webpush needs string? or check logic
                    // Actually webpush expects keys as strings usually.
                    // In hook we stored: btoa(String.fromCharCode(...)) -> It IS base64 string.
                    // web-push expects: keys: { p256dh: '...', auth: '...' }
                    // Let's verify if atob is needed.
                    // Looking at web-push docs, it takes keys as strings.
                    // But our DB stores base64.
                    // Wait, 'p256dh' from pushManager.getSubscription().toJSON() is ALREADY Base64URL encoded string.
                    // In my hook, I did complicated btoa logic.
                    // Let's assume the DB has correct Base64 strings.
                    // If I used btoa in hook, I might need atob here NO wait.
                    // web-push needs the raw keys? No, it usually takes the object structure.

                    // Let's trust the stored string is compatible if I pass it directly?
                    // Hook: btoa(...) -> Base64.
                    // web-push usually handles Base64.
                    auth: atob(sub.auth),
                },
            };

            // Let's try passing the values directly first?
            // Actually standard is keys: { p256dh: 'base64string', auth: 'base64string' }
            // So I should pass sub.p256dh directly if it's base64.
            // But in the code above I put atob().
            // Let's remove atob() and assume stored value is correct format.
            // Wait, in my hook I effectively double-encoded?
            // "p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh'))))"
            // subscription.getKey returns ArrayBuffer. I converted to string then btoa.
            // So yes it is Base64.
            // web-push expects "URL Safe Base64" or just keys.

            // Safety: Send attempts, catch 410 (Gone) to delete old subs.
            return webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
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

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error processing trigger:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
