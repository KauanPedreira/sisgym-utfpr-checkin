import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";

interface Attendance {
  id: string;
  data_hora: string;
  created_at: string;
}

const AttendanceHistory = () => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    expected: 3,
    percentage: 0,
  });
  const [isBlocked, setIsBlocked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch attendances
      const { data: attendanceData, error } = await supabase
        .from("presencas")
        .select("*")
        .eq("aluno_user_id", user.id)
        .order("data_hora", { ascending: false });

      if (error) throw error;

      setAttendances(attendanceData || []);

      // Fetch student info
      const { data: studentData } = await supabase
        .from("alunos")
        .select("frequencia_total, frequencia_esperada, status, bloqueado_ate")
        .eq("user_id", user.id)
        .single();

      if (studentData) {
        // Calculate this month's attendance
        const now = new Date();
        const thisMonthAttendance = (attendanceData || []).filter((att) => {
          const attDate = new Date(att.data_hora);
          return attDate.getMonth() === now.getMonth() && 
                 attDate.getFullYear() === now.getFullYear();
        }).length;

        // Get weeks in current month
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const weeksInMonth = Math.ceil((lastDay.getDate() - firstDay.getDate() + 1) / 7);
        
        const expectedMonthly = studentData.frequencia_esperada * weeksInMonth;
        const percentage = expectedMonthly > 0 ? (thisMonthAttendance / expectedMonthly) * 100 : 0;

        setStats({
          total: studentData.frequencia_total || 0,
          thisMonth: thisMonthAttendance,
          expected: studentData.frequencia_esperada,
          percentage: Math.round(percentage),
        });

        // Check if blocked
        if (studentData.bloqueado_ate) {
          const blockedUntil = new Date(studentData.bloqueado_ate);
          setIsBlocked(blockedUntil > now);
        }
      }
    } catch (error: any) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar isAdmin={false} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isAdmin={false} />
      
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Histórico de Presenças
            </h2>
            <p className="text-muted-foreground">
              Acompanhe sua frequência e estatísticas
            </p>
          </div>

          {/* Alert for blocked status */}
          {isBlocked && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-500">Conta Bloqueada</p>
                <p className="text-sm text-muted-foreground">
                  Sua frequência está abaixo de 70%. Entre em contato com a administração.
                </p>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Presenças
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  Desde o início
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Este Mês
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.thisMonth}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.expected}x por semana esperado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Frequência
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.percentage}%
                </div>
                <div className="mt-2">
                  <Badge 
                    variant={stats.percentage >= 70 ? "default" : "destructive"}
                  >
                    {stats.percentage >= 70 ? "✓ Regular" : "⚠ Baixa"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance List */}
          <Card>
            <CardHeader>
              <CardTitle>Registro de Presenças</CardTitle>
            </CardHeader>
            <CardContent>
              {attendances.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma presença registrada ainda
                </p>
              ) : (
                <div className="space-y-2">
                  {attendances.map((attendance) => (
                    <div
                      key={attendance.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {formatDate(attendance.data_hora)}
                        </span>
                      </div>
                      <Badge variant="outline">Confirmado</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AttendanceHistory;
