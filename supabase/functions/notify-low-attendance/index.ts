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

    console.log('Checking for students with low attendance...');

    // Get all active students
    const { data: students, error: studentsError } = await supabaseClient
      .from('alunos')
      .select('user_id, frequencia_esperada, profiles!inner(nome)')
      .eq('status', 'ativo');

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      throw studentsError;
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const notifiedStudents: string[] = [];

    // Check each student's attendance
    for (const student of students || []) {
      try {
        const { count: attendanceCount } = await supabaseClient
          .from('presencas')
          .select('*', { count: 'exact', head: true })
          .eq('aluno_user_id', student.user_id)
          .gte('data_hora', firstDayOfMonth.toISOString());

        const actualAttendance = attendanceCount || 0;
        const expectedAttendance = student.frequencia_esperada || 3;
        const attendancePercentage = (actualAttendance / expectedAttendance) * 100;

        const studentName = (student.profiles as any)?.nome || 'Unknown';

        console.log(`Student ${studentName}: ${attendancePercentage.toFixed(1)}% attendance`);

        // Notify if attendance is between 70% and 80% (warning zone)
        if (attendancePercentage >= 70 && attendancePercentage < 80) {
          console.log(`Sending warning notification to ${studentName}`);

          // Send push notification
          await supabaseClient.functions.invoke('send-push-notification', {
            body: {
              userId: student.user_id,
              title: '⚠️ Atenção: Frequência Baixa',
              body: `Sua frequência está em ${attendancePercentage.toFixed(0)}%. Você precisa de no mínimo 70% para evitar bloqueio. Compareça mais para não ser bloqueado!`,
              data: {
                type: 'low_attendance',
                url: '/attendance'
              }
            }
          });

          notifiedStudents.push(studentName);
        }
        // Critical alert if below 70%
        else if (attendancePercentage < 70 && attendancePercentage > 0) {
          console.log(`Sending critical notification to ${studentName}`);

          await supabaseClient.functions.invoke('send-push-notification', {
            body: {
              userId: student.user_id,
              title: '🚨 Risco de Bloqueio!',
              body: `URGENTE: Sua frequência está em apenas ${attendancePercentage.toFixed(0)}%. Você será bloqueado no próximo dia 1º se não melhorar!`,
              data: {
                type: 'blocking_risk',
                url: '/attendance'
              }
            }
          });

          notifiedStudents.push(studentName);
        }
      } catch (error: any) {
        console.error(`Error processing student ${student.user_id}:`, error);
      }
    }

    console.log(`Notifications sent to ${notifiedStudents.length} students`);

    return new Response(
      JSON.stringify({
        success: true,
        notified: notifiedStudents.length,
        students: notifiedStudents
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in notify-low-attendance:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
