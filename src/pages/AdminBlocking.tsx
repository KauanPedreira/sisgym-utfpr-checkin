import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-temp";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Unlock, Play, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminBlocking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    checkAdmin();
    fetchStudents();
  }, []);

  const checkAdmin = async () => {
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
      }
    } catch (error: any) {
      console.error("Error:", error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data: alunosData } = await supabase
        .from("alunos")
        .select(`
          user_id,
          status,
          bloqueado_ate,
          frequencia_esperada,
          frequencia_total,
          profiles(nome, cpf)
        `)
        .order("status", { ascending: false });

      if (alunosData) {
        // Calculate current month attendance for each student
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const studentsWithAttendance = await Promise.all(
          alunosData.map(async (student) => {
            const { count } = await supabase
              .from("presencas")
              .select("*", { count: "exact", head: true })
              .eq("aluno_user_id", student.user_id)
              .gte("data_hora", firstDayOfMonth.toISOString());

            const attendancePercentage = student.frequencia_esperada 
              ? ((count || 0) / student.frequencia_esperada) * 100
              : 0;

            return {
              ...student,
              currentMonthAttendance: count || 0,
              attendancePercentage: attendancePercentage.toFixed(1),
            };
          })
        );

        setStudents(studentsWithAttendance);
      }
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast({
        title: "Erro ao carregar alunos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runAttendanceCheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-attendance");

      if (error) throw error;

      toast({
        title: "Verificação concluída!",
        description: `${data.results.blocked} alunos bloqueados, ${data.results.unblocked} desbloqueados`,
      });

      fetchStudents();
    } catch (error: any) {
      console.error("Error running attendance check:", error);
      toast({
        title: "Erro ao executar verificação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleUnblock = async () => {
    if (!selectedStudent) return;

    try {
      const { error } = await supabase
        .from("alunos")
        .update({
          bloqueado_ate: null,
          status: "ativo",
        })
        .eq("user_id", selectedStudent.user_id);

      if (error) throw error;

      toast({
        title: "Aluno desbloqueado com sucesso!",
      });

      fetchStudents();
    } catch (error: any) {
      toast({
        title: "Erro ao desbloquear aluno",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUnblockDialogOpen(false);
      setSelectedStudent(null);
    }
  };

  const isBlocked = (student: any) => {
    if (!student.bloqueado_ate) return false;
    return new Date(student.bloqueado_ate) > new Date();
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isAdmin={true} />
      
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Sistema de Bloqueio Automático
            </h2>
            <p className="text-muted-foreground">
              Gerencie bloqueios por frequência insuficiente (abaixo de 70%)
            </p>
          </div>

          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Verificação de Frequência
                  </span>
                  <Button onClick={runAttendanceCheck} disabled={checking}>
                    <Play className="h-4 w-4 mr-2" />
                    {checking ? "Verificando..." : "Executar Verificação"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    • A verificação automática é executada mensalmente via cron job
                  </p>
                  <p>
                    • Alunos com frequência abaixo de 70% são bloqueados automaticamente
                  </p>
                  <p>
                    • Bloqueios duram 1 mês, mas podem ser removidos manualmente
                  </p>
                  <p>
                    • Use o botão acima para executar a verificação manualmente
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Status dos Alunos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Carregando...
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum aluno encontrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead className="text-center">Frequência Mês</TableHead>
                      <TableHead className="text-center">Percentual</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Bloqueado Até</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.user_id}>
                        <TableCell className="font-medium">
                          {student.profiles?.nome || "Sem nome"}
                        </TableCell>
                        <TableCell>{student.profiles?.cpf || "-"}</TableCell>
                        <TableCell className="text-center">
                          {student.currentMonthAttendance} / {student.frequencia_esperada || 3}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              parseFloat(student.attendancePercentage) >= 70
                                ? "default"
                                : "destructive"
                            }
                          >
                            {student.attendancePercentage}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {isBlocked(student) ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit mx-auto">
                              <AlertCircle className="h-3 w-3" />
                              Bloqueado
                            </Badge>
                          ) : (
                            <Badge variant="default" className="flex items-center gap-1 w-fit mx-auto">
                              <CheckCircle className="h-3 w-3" />
                              Ativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {student.bloqueado_ate
                            ? new Date(student.bloqueado_ate).toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {isBlocked(student) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedStudent(student);
                                setUnblockDialogOpen(true);
                              }}
                            >
                              <Unlock className="h-4 w-4 mr-2" />
                              Desbloquear
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <AlertDialog open={unblockDialogOpen} onOpenChange={setUnblockDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desbloquear Aluno</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja desbloquear {selectedStudent?.profiles?.nome}?
                  O aluno poderá voltar a registrar presenças normalmente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleUnblock}>Desbloquear</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
};

export default AdminBlocking;
