import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/Sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  generateAttendanceReport,
  generateStudentsReport,
  generateMonthlyReport,
  generateLowFrequencyReport,
} from "@/lib/pdfGenerator";

const AdminReports = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalAttendances: 0,
    activeStudents: 0,
    blockedStudents: 0,
  });
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndFetchStats();
  }, []);

  const checkAdminAndFetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!roleData || roleData.role !== "admin") {
        toast({
          title: "Acesso negado",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      // Fetch statistics
      const { count: studentsCount } = await supabase
        .from("alunos")
        .select("*", { count: "exact", head: true });

      const { count: attendancesCount } = await supabase
        .from("presencas")
        .select("*", { count: "exact", head: true });

      const { count: activeCount } = await supabase
        .from("alunos")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo");

      const { count: blockedCount } = await supabase
        .from("alunos")
        .select("*", { count: "exact", head: true })
        .not("bloqueado_ate", "is", null);

      setStats({
        totalStudents: studentsCount || 0,
        totalAttendances: attendancesCount || 0,
        activeStudents: activeCount || 0,
        blockedStudents: blockedCount || 0,
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar estatísticas.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReport = async (type: string) => {
    setLoading(type);
    try {
      if (type === "attendances") {
        const { data } = await supabase
          .from("presencas")
          .select(`
            id,
            data_hora,
            profiles:aluno_user_id (nome, cpf, email, curso, vinculo),
            alunos:aluno_user_id (ra, status, tipo_vinculo)
          `)
          .order("data_hora", { ascending: false });

        if (data) {
          const transformedData = data.map((item: any) => ({
            ...item,
            profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
            alunos: Array.isArray(item.alunos) ? item.alunos[0] : item.alunos
          }));
          await generateAttendanceReport(transformedData);
        }
      } else if (type === "students") {
        const { data } = await supabase
          .from("alunos")
          .select(`
            *,
            profiles!alunos_user_id_fkey (nome, cpf, telefone, email, curso, vinculo)
          `);

        if (data) {
          const transformedData = data.map((item: any) => ({
            ...item,
            profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
          }));
          await generateStudentsReport(transformedData);
        }
      } else if (type === "monthly") {
        const [studentsRes, attendancesRes] = await Promise.all([
          supabase
            .from("alunos")
            .select(`
              *,
              profiles!alunos_user_id_fkey (nome, cpf, telefone, email, curso, vinculo)
            `),
          supabase
            .from("presencas")
            .select(`
              id,
              data_hora,
              profiles:aluno_user_id (nome, cpf, email, curso, vinculo)
            `)
            .order("data_hora", { ascending: false }),
        ]);

        if (studentsRes.data && attendancesRes.data) {
          const transformedStudents = studentsRes.data.map((item: any) => ({
            ...item,
            profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
          }));
          const transformedAttendances = attendancesRes.data.map((item: any) => ({
            ...item,
            profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
          }));
          await generateMonthlyReport(transformedStudents, transformedAttendances);
        }
      } else if (type === "lowFrequency") {
        const [studentsRes, attendancesRes] = await Promise.all([
          supabase
            .from("alunos")
            .select(`
              *,
              profiles!alunos_user_id_fkey (nome, cpf, telefone, email, curso, vinculo)
            `),
          supabase
            .from("presencas")
            .select(`
              id,
              data_hora,
              profiles:aluno_user_id (nome, cpf, email, curso, vinculo)
            `)
            .order("data_hora", { ascending: false }),
        ]);

        if (studentsRes.data && attendancesRes.data) {
          const transformedStudents = studentsRes.data.map((item: any) => ({
            ...item,
            profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
          }));
          const transformedAttendances = attendancesRes.data.map((item: any) => ({
            ...item,
            profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
          }));
          await generateLowFrequencyReport(transformedStudents, transformedAttendances);
        }
      }

      toast({
        title: "Relatório gerado!",
        description: "O arquivo PDF foi baixado com sucesso.",
      });
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar isAdmin={true} />
        
        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 flex h-14 items-center border-b border-border bg-background px-4">
            <SidebarTrigger />
          </div>
          <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Relatórios e Estatísticas
            </h2>
            <p className="text-muted-foreground">
              Visualize estatísticas e gere relatórios em PDF
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Alunos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalStudents}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Presenças Registradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalAttendances}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Alunos Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">{stats.activeStudents}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Bloqueados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">{stats.blockedStudents}</div>
              </CardContent>
            </Card>
          </div>

          {/* Report Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Gerar Relatórios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <Label>Relatório de Presenças</Label>
                  <p className="text-sm text-muted-foreground">
                    Gere um relatório completo de todas as presenças registradas
                  </p>
                  <Button 
                    onClick={() => handleGenerateReport("attendances")} 
                    className="w-full"
                    disabled={loading === "attendances"}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {loading === "attendances" ? "Gerando..." : "Gerar PDF"}
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label>Relatório de Alunos</Label>
                  <p className="text-sm text-muted-foreground">
                    Lista completa de alunos com estatísticas de frequência
                  </p>
                  <Button 
                    onClick={() => handleGenerateReport("students")} 
                    className="w-full"
                    disabled={loading === "students"}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {loading === "students" ? "Gerando..." : "Gerar PDF"}
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label>Relatório Mensal</Label>
                  <p className="text-sm text-muted-foreground">
                    Estatísticas consolidadas do mês atual
                  </p>
                  <Button 
                    onClick={() => handleGenerateReport("monthly")} 
                    className="w-full"
                    disabled={loading === "monthly"}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {loading === "monthly" ? "Gerando..." : "Gerar PDF"}
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label>Alunos com Baixa Frequência</Label>
                  <p className="text-sm text-muted-foreground">
                    Lista de alunos com frequência abaixo de 70%
                  </p>
                  <Button 
                    onClick={() => handleGenerateReport("lowFrequency")} 
                    className="w-full" 
                    variant="destructive"
                    disabled={loading === "lowFrequency"}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {loading === "lowFrequency" ? "Gerando..." : "Gerar PDF"}
                  </Button>
                </div>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-sm">
                  ✓ <strong>Relatórios Implementados:</strong> Todos os relatórios agora geram PDFs completos
                  com estatísticas detalhadas, tabelas formatadas e design profissional com as cores da UTFPR.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
    </SidebarProvider>
  );
};

export default AdminReports;
