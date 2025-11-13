import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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

interface Student {
  id: string;
  user_id: string;
  ra: string | null;
  status: string;
  tipo_vinculo: string;
  frequencia_esperada: number;
  frequencia_total: number;
  profiles: {
    nome: string;
    cpf: string;
    telefone: string | null;
  };
}

const AdminStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndFetchStudents();
  }, []);

  const checkAdminAndFetchStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!roleData || roleData.role !== "admin") {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      // Fetch all students
      const { data, error } = await supabase
        .from("alunos")
        .select(`
          *,
          profiles:user_id (nome, cpf, telefone)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setStudents(data || []);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os alunos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.profiles.nome.toLowerCase().includes(searchLower) ||
      student.profiles.cpf.includes(searchTerm) ||
      student.ra?.includes(searchTerm)
    );
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      ativo: "default",
      inativo: "secondary",
      banido: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getVinculoBadge = (vinculo: string) => {
    const labels: Record<string, string> = {
      aluno: "Aluno",
      servidor: "Servidor",
      externo: "Terceiro",
    };
    return <Badge variant="outline">{labels[vinculo] || vinculo}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            onClick={() => navigate("/dashboard")}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Alunos</h1>
            <p className="text-sm text-muted-foreground">
              Visualize e gerencie todos os alunos cadastrados
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alunos Cadastrados ({filteredStudents.length})
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou RA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>RA</TableHead>
                    <TableHead>Vínculo</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum aluno encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.profiles.nome}
                        </TableCell>
                        <TableCell>{student.profiles.cpf}</TableCell>
                        <TableCell>{student.ra || "-"}</TableCell>
                        <TableCell>{getVinculoBadge(student.tipo_vinculo)}</TableCell>
                        <TableCell>
                          {student.frequencia_total} / {student.frequencia_esperada}x semana
                        </TableCell>
                        <TableCell>{getStatusBadge(student.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminStudents;
