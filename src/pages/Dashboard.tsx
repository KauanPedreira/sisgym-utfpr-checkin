import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-temp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Calendar, Clipboard, Users, FileText, Shield } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { QRScannerDialog } from "@/components/QRScannerDialog";
import { NotificationPermission } from "@/components/NotificationPermission";
import type { User } from "@supabase/supabase-js";

const DashboardNew = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [stats, setStats] = useState({
    attendanceCount: 0,
    monthlyAttendance: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      
      // Check user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();
      
      if (roleData) {
        setUserRole(roleData.role);
      }

      // Fetch attendance stats for students
      if (!roleData || roleData.role !== "admin") {
        const { count: totalCount } = await supabase
          .from("presencas")
          .select("*", { count: "exact", head: true })
          .eq("aluno_user_id", session.user.id);

        const now = new Date();
        const { count: monthlyCount } = await supabase
          .from("presencas")
          .select("*", { count: "exact", head: true })
          .eq("aluno_user_id", session.user.id)
          .gte("data_hora", new Date(now.getFullYear(), now.getMonth(), 1).toISOString());

        setStats({
          attendanceCount: totalCount || 0,
          monthlyAttendance: monthlyCount || 0,
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const isAdmin = userRole === "admin";

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isAdmin={isAdmin} />
      
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Bem-vindo, {user?.user_metadata?.nome || user?.email}!
            </h2>
            <p className="text-muted-foreground flex items-center gap-2">
              {isAdmin ? (
                <>
                  <Shield className="h-4 w-4 text-primary" />
                  Painel Administrativo
                </>
              ) : (
                "Painel do Aluno"
              )}
            </p>
          </div>

          {/* Student Dashboard */}
          {!isAdmin && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card 
                className="border-border hover:border-primary transition-colors cursor-pointer"
                onClick={() => setScannerOpen(true)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Registrar Presença
                  </CardTitle>
                  <QrCode className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">Escanear QR</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Use a câmera para registrar sua presença
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="border-border hover:border-primary transition-colors cursor-pointer"
                onClick={() => navigate("/attendance")}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Histórico
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.attendanceCount} presenças</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {stats.monthlyAttendance} neste mês
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:border-primary transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Minha Ficha
                  </CardTitle>
                  <Clipboard className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Ver Treino</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Consultar exercícios
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Admin Dashboard */}
          {isAdmin && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card 
                className="border-border hover:border-primary transition-colors cursor-pointer"
                onClick={() => navigate("/admin/qrcode")}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    QR Code Dinâmico
                  </CardTitle>
                  <QrCode className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">Gerar QR</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Atualiza automaticamente a cada 30s
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="border-border hover:border-primary transition-colors cursor-pointer"
                onClick={() => navigate("/admin/students")}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Gerenciar Alunos
                  </CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Consultar</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ver todos os alunos cadastrados
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="border-border hover:border-primary transition-colors cursor-pointer"
                onClick={() => navigate("/admin/attendance")}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Registro Manual
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Presença</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Registrar presença manualmente
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="border-border hover:border-primary transition-colors cursor-pointer"
                onClick={() => navigate("/admin/workouts")}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Fichas de Treino
                  </CardTitle>
                  <Clipboard className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Gerenciar</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Cadastrar e atribuir fichas
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="border-border hover:border-primary transition-colors cursor-pointer"
                onClick={() => navigate("/admin/reports")}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Relatórios
                  </CardTitle>
                  <FileText className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Gerar PDF</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Estatísticas e relatórios
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* QR Scanner Dialog */}
      {user && !isAdmin && (
        <QRScannerDialog 
          open={scannerOpen} 
        onOpenChange={setScannerOpen}
        userId={user.id}
      />
      )}
      
      <NotificationPermission />
    </div>
  );
};

export default DashboardNew;
