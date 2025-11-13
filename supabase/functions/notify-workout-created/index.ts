import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { userId, workoutTitle } = await req.json();

    if (!userId || !workoutTitle) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or workoutTitle' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`Sending workout notification to user ${userId}`);

    await supabaseClient.functions.invoke('send-push-notification', {
      body: {
        userId,
        title: '🏋️ Nova Ficha de Treino!',
        body: `Você recebeu uma nova ficha: ${workoutTitle}. Acesse agora para ver seus exercícios!`,
        data: {
          type: 'new_workout',
          url: '/workouts'
        }
      }
    });

    console.log('Workout notification sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
