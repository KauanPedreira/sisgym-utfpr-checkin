import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID keys - In production, generate these with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr9qBKEwnhn1PNV9PHJdCNI';
const VAPID_PRIVATE_KEY = 'UUxzMVBBRUtpRllxOE5IMi1IZVpuamU2eVJZZHBmT1gzRWk3RU5WODJDaw';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { userId, title, body, data } = await req.json();

    console.log(`Sending notification to user ${userId}: ${title}`);

    // Get user's push subscription
    const { data: subscriptionData, error: subscriptionError } = await supabaseClient
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();

    if (subscriptionError || !subscriptionData) {
      console.log(`No push subscription found for user ${userId}`);
      return new Response(
        JSON.stringify({ error: 'No push subscription found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Configure web-push
    webpush.setVapidDetails(
      'mailto:sisgym@utfpr.edu.br',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const pushSubscription = subscriptionData.subscription;

    const payload = JSON.stringify({
      title,
      body,
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      data: data || {},
      timestamp: Date.now(),
    });

    // Send push notification
    await webpush.sendNotification(pushSubscription, payload);

    console.log(`Notification sent successfully to user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
