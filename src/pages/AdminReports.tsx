import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-temp";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

const AdminReports = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalAttendances: 0,
    activeStudents: 0,
    blockedStudents: 0,
  });
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

  const handleGenerateReport = () => {
    toast({
      title: "Em desenvolvimento",
      description: "A geração de relatórios PDF será implementada em breve.",
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isAdmin={true} />
      
      <main className="flex-1 overflow-auto">
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
                  <Button onClick={handleGenerateReport} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Gerar PDF
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label>Relatório de Alunos</Label>
                  <p className="text-sm text-muted-foreground">
                    Lista completa de alunos com estatísticas de frequência
                  </p>
                  <Button onClick={handleGenerateReport} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Gerar PDF
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label>Relatório Mensal</Label>
                  <p className="text-sm text-muted-foreground">
                    Estatísticas consolidadas do mês atual
                  </p>
                  <Button onClick={handleGenerateReport} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Gerar PDF
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label>Alunos com Baixa Frequência</Label>
                  <p className="text-sm text-muted-foreground">
                    Lista de alunos com frequência abaixo de 70%
                  </p>
                  <Button onClick={handleGenerateReport} className="w-full" variant="destructive">
                    <Calendar className="mr-2 h-4 w-4" />
                    Gerar PDF
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Dica:</strong> Os relatórios em PDF serão implementados em breve.
                  Por enquanto, você pode visualizar os dados nas outras páginas do sistema.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminReports;
