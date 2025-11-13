import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    console.log('Starting attendance check...');

    // Get all active students
    const { data: students, error: studentsError } = await supabaseClient
      .from('alunos')
      .select('user_id, frequencia_esperada, profiles!inner(nome)');

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      throw studentsError;
    }

    console.log(`Found ${students?.length || 0} students to check`);

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const results = {
      checked: 0,
      blocked: 0,
      unblocked: 0,
      errors: [] as string[],
    };

    // Process each student
    for (const student of students || []) {
      try {
        results.checked++;

        // Count attendances for the current month
        const { count: attendanceCount, error: countError } = await supabaseClient
          .from('presencas')
          .select('*', { count: 'exact', head: true })
          .eq('aluno_user_id', student.user_id)
          .gte('data_hora', firstDayOfMonth.toISOString())
          .lte('data_hora', lastDayOfMonth.toISOString());

        if (countError) {
          console.error(`Error counting attendance for student ${student.user_id}:`, countError);
          const studentName = (student.profiles as any)?.nome || 'Unknown';
          results.errors.push(`Error for ${studentName}: ${countError.message}`);
          continue;
        }

        const actualAttendance = attendanceCount || 0;
        const expectedAttendance = student.frequencia_esperada || 3;
        const attendancePercentage = (actualAttendance / expectedAttendance) * 100;
        const studentName = (student.profiles as any)?.nome || 'Unknown';

        console.log(`Student ${studentName}: ${actualAttendance}/${expectedAttendance} (${attendancePercentage.toFixed(1)}%)`);

        // Block if attendance is below 70%
        if (attendancePercentage < 70) {
          const blockUntil = new Date(now);
          blockUntil.setMonth(blockUntil.getMonth() + 1); // Block for 1 month

          const { error: updateError } = await supabaseClient
            .from('alunos')
            .update({
              bloqueado_ate: blockUntil.toISOString(),
              status: 'bloqueado',
            })
            .eq('user_id', student.user_id);

          if (updateError) {
            console.error(`Error blocking student ${student.user_id}:`, updateError);
            results.errors.push(`Error blocking ${studentName}: ${updateError.message}`);
          } else {
            console.log(`Blocked student ${studentName} until ${blockUntil.toISOString()}`);
            results.blocked++;
          }
        } else {
          // Unblock if attendance is sufficient
          const { error: updateError } = await supabaseClient
            .from('alunos')
            .update({
              bloqueado_ate: null,
              status: 'ativo',
            })
            .eq('user_id', student.user_id);

          if (updateError) {
            console.error(`Error unblocking student ${student.user_id}:`, updateError);
            results.errors.push(`Error unblocking ${studentName}: ${updateError.message}`);
          } else {
            console.log(`Student ${studentName} is active with good attendance`);
            results.unblocked++;
          }
        }
      } catch (error: any) {
        console.error(`Error processing student ${student.user_id}:`, error);
        const studentName = (student.profiles as any)?.nome || 'Unknown';
        results.errors.push(`Error processing ${studentName}: ${error.message}`);
      }
    }

    console.log('Attendance check completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Attendance check completed',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in check-attendance function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
